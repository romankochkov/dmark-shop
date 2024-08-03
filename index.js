const ini = require('ini');
const dotenv = require('dotenv').config();
const express = require('express');
const axios = require('axios');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const url = require('url');
const pg = require('pg');
const pgSession = require('connect-pg-simple')(session);
const path = require('path');
const fs = require('fs');
const uuid = require('uuid');
const http = require('http');
const https = require('https');
const { type } = require('os');
const { isNumberObject } = require('util/types');
const { log } = require('console');
const pool = require('./database/init');


const app = express();

app.use(express.static(path.join(__dirname, 'assets'))); // Установка статического каталога для файлов HTML
app.use(cookieParser());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware для обработки данных из тела запроса
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    store: new pgSession({
      pool: pool,
      // Некоторые дополнительные параметры хранилища, если необходимо
      // Например, ttl: 3600 // Время жизни сеанса в секундах (1 час)
    }),
  })
);

global.config_ini = ini.parse(fs.readFileSync('exchange.ini', 'utf-8'));
global.euro_coefficient = parseFloat(config_ini.EURO_COEFFICIENT).toFixed(2);

const accountRouter = require('./routes/account');
app.use('/account', accountRouter);

const cartRouter = require('./routes/cart');
app.use('/cart', cartRouter);

const catalogRouter = require('./routes/catalog');
app.use('/catalog', catalogRouter);

app.get('/favicon.ico', (req, res) => {
  const faviconPath = path.join(__dirname, 'assets', 'img', 'favicon.ico');
  res.sendFile(faviconPath);
});

app.get('/', (req, res) => {
  if (!req.originalUrl.endsWith('/')) return res.redirect(req.originalUrl + '/');

  if (req.query.search) {
    const parsedUrl = url.parse(req.url, true);
    const queryParameters = parsedUrl.query;
    const targetUrl = `/catalog/?${Object.keys(queryParameters).map(key => `${key}=${queryParameters[key]}`).join('&')}`;

    res.redirect(targetUrl);
  } else {
    // Если параметр "GET" не указан, выводим все записи
    pool.query(`SELECT *, CEIL((price / 100) * (100 + price_factor) * 100) / 100 AS price_total FROM products WHERE visibility = true ORDER BY CASE WHEN exists = 1 THEN 1 WHEN exists = 2 THEN 2 WHEN exists = 0 THEN 3 END LIMIT 90`, (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Internal Server Error');
      }

      let rows = result.rows;
      rows = rows.map((row) => {
        row.pictures = JSON.parse(row.pictures);
        row.price_total = ((parseFloat(row.price_total) * euro_coefficient).toFixed(2)).replace('.', ',');
        return row;
      });

      let cartLength;

      if (req.cookies.cart) {
        cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
      } else {
        cartLength = 0;
      }

      res.render('index', { user: (req.session.isAuthenticated) ? true : false, url: req.originalUrl, data: rows, cart: cartLength > 0 ? cartLength : null });
    });
  }
});

app.get('/registration', (req, res) => {
  if (req.session.isAuthenticated) return res.redirect('/catalog');
  if (!req.originalUrl.endsWith('/')) return res.redirect(req.originalUrl + '/');
  res.render('registration');
});

app.post('/registration', async (req, res) => {
  try {
    const { first_name, last_name, email, password } = req.body;

    // Хеширование пароля перед сохранением
    const hashedPassword = await bcrypt.hash(password, 10);

    // Текущая дата и время
    const currentDate = new Date().toISOString();

    // Вставка пользователя в базу данных
    pool.query(
      'INSERT INTO users (first_name, last_name, email, password, reg_date, log_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [first_name, last_name, email, hashedPassword, currentDate, currentDate],
      (err, result) => {
        if (err) {
          return res.status(500).json({ error: 'Ошибка при регистрации пользователя' });
        }

        const user = result.rows[0];

        req.session.userId = user.id;
        req.session.isAuthenticated = true;

        return res.redirect('/catalog?registration=success');
      }
    );
  } catch (error) {
    return res.status(500).json({ error: 'Что-то пошло не так' });
  }
});

app.get('/authentication', (req, res) => {
  if (req.session.isAuthenticated) return res.redirect('/account');
  if (!req.originalUrl.endsWith('/')) return res.redirect(req.originalUrl + '/');
  res.render('authentication');
});

app.post('/authentication', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Получаем пользователя по email из базы данных
    pool.query('SELECT * FROM users WHERE email = $1', [email], async (err, result) => {
      if (err || result.rows.length === 0) {
        return res.status(401).json({ error: 'Неверный email или пароль' });
      }

      const user = result.rows[0];

      // Проверяем совпадение хешированного пароля
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Неверный email или пароль' });
      }

      // Обновляем дату последней авторизации (log_date)
      const currentDate = new Date().toISOString();
      pool.query('UPDATE users SET log_date = $1 WHERE id = $2', [currentDate, user.id], (err, result) => {
        if (err) {
          return res.status(500).json({ error: 'Ошибка при обновлении даты авторизации' });
        }
      });

      req.session.userId = user.id;
      req.session.isAuthenticated = true;

      return res.redirect('/catalog?authentication=success');
    });
  } catch (error) {
    return res.status(500).json({ error: 'Что-то пошло не так' });
  }
});

app.get('/logout', (req, res) => {
  // Удаление данных сессии, связанных с авторизацией
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
    }
    res.redirect('/catalog');
  });
});

app.get('/info/terms', (req, res) => {
  if (!req.originalUrl.endsWith('/')) return res.redirect(req.originalUrl + '/');

  if (req.cookies.cart) {
    cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
  } else {
    cartLength = 0;
  }

  res.render('terms', { user: (req.session.isAuthenticated) ? true : false, url: req.path, cart: cartLength > 0 ? cartLength : null });
});

app.get('/info/privacy/', (req, res) => {
  if (!req.originalUrl.endsWith('/')) return res.redirect(req.originalUrl + '/');

  if (req.cookies.cart) {
    cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
  } else {
    cartLength = 0;
  }

  res.render('privacy', { user: (req.session.isAuthenticated) ? true : false, url: req.path, cart: cartLength > 0 ? cartLength : null });
});

app.get('/media/:uuid', (req, res) => {
  const imagePath = path.join(__dirname, '/media/', `${req.params.uuid}`);

  if (fs.existsSync(imagePath)) {
    res.sendFile(imagePath);
  } else {
    res.status(404);
  }
});

const options = {
  key: fs.readFileSync('config/private.key'),
  cert: fs.readFileSync('config/certificate.crt')
};
let port = 80;

let server = http.createServer(app);

if (process.argv[2] && process.argv[2] === '-https') {
  port = 443;
  server = https.createServer(options, app);
}

server.listen(port, () => {
  console.log(`[${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()}] > The server is running on port ${port}`.toUpperCase());
});

