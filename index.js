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

app.get('/catalog/product/:id', (req, res) => {
  if (!req.originalUrl.endsWith('/')) return res.redirect(req.originalUrl + '/');

  pool.query(`SELECT *, CEIL((price / 100) * (100 + price_factor) * 100) / 100 AS price_total FROM products WHERE id = $1 LIMIT 1`, [req.params.id], (err, result) => {
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

    res.render('product', { user: (req.session.isAuthenticated) ? true : false, url: req.originalUrl, data: rows, cart: req.cookies.cart ? (JSON.parse(req.cookies.cart)).items : null });
  });
});

app.get('/catalog', (req, res) => {
  if (!req.originalUrl.endsWith('/')) return res.redirect(req.originalUrl + '/');

  if (req.query.search) {
    const filter = `%${req.query.search.toLowerCase().replace('/', '')}%`;

    pool.query(`SELECT *, CEIL((price / 100) * (100 + price_factor) * 100) / 100 AS price_total FROM products WHERE (LOWER(title_original) LIKE $1 OR LOWER(title_translation) LIKE $2) AND visibility = true ORDER BY CASE WHEN exists = 1 THEN 1 WHEN exists = 2 THEN 2 WHEN exists = 0 THEN 3 END LIMIT 90`, [filter, filter], (err, result) => {
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

      res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.originalUrl, search: req.query.search.replace('/', ''), data: rows, cart: cartLength > 0 ? cartLength : null });
    });
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

      res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.originalUrl, data: rows, cart: cartLength > 0 ? cartLength : null });
    });
  }
});

app.get('/catalog/newest', (req, res) => {
  if (!req.originalUrl.endsWith('/')) return res.redirect(req.originalUrl + '/');

  pool.query(`SELECT *, CEIL((price / 100) * (100 + price_factor) * 100) / 100 AS price_total FROM products WHERE visibility = true ORDER BY id DESC LIMIT 30`, (err, result) => {
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

    res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.originalUrl, data: rows, cart: cartLength > 0 ? cartLength : null });
  });
});

app.get('/catalog/denkmit', (req, res) => {
  if (!req.originalUrl.endsWith('/')) {
    return res.redirect(req.originalUrl + '/');
  }

  getDataDB('Denkmit', null, query = (req.query.search) ? req.query.search.replace('/', '') : null)
    .then(rows => {
      let cartLength;

      if (req.cookies.cart) {
        cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
      } else {
        cartLength = 0;
      }

      res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.path, search: (req.query.search) ? req.query.search.replace('/', '') : null, data: rows, cart: cartLength > 0 ? cartLength : null });
    })
    .catch(err => {
      console.log(err);
      return res.status(500).send('Internal Server Error');
    });
});

app.get('/catalog/denkmit/kitchen', (req, res) => {
  if (!req.originalUrl.endsWith('/')) {
    return res.redirect(req.originalUrl + '/');
  }

  getDataDB('Denkmit', 'kitchen', query = (req.query.search) ? req.query.search.replace('/', '') : null)
    .then(rows => {
      let cartLength;

      if (req.cookies.cart) {
        cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
      } else {
        cartLength = 0;
      }

      res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.path, search: (req.query.search) ? req.query.search.replace('/', '') : null, data: rows, cart: cartLength > 0 ? cartLength : null });
    })
    .catch(err => {
      console.log(err);
      return res.status(500).send('Internal Server Error');
    });
});

app.get('/catalog/denkmit/washing', (req, res) => {
  if (!req.originalUrl.endsWith('/')) {
    return res.redirect(req.originalUrl + '/');
  }

  getDataDB('Denkmit', 'washing', query = (req.query.search) ? req.query.search.replace('/', '') : null)
    .then(rows => {
      let cartLength;

      if (req.cookies.cart) {
        cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
      } else {
        cartLength = 0;
      }

      res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.path, search: (req.query.search) ? req.query.search.replace('/', '') : null, data: rows, cart: cartLength > 0 ? cartLength : null });
    })
    .catch(err => {
      console.log(err);
      return res.status(500).send('Internal Server Error');
    });
});

app.get('/catalog/denkmit/wc', (req, res) => {
  if (!req.originalUrl.endsWith('/')) {
    return res.redirect(req.originalUrl + '/');
  }

  getDataDB('Denkmit', 'wc', query = (req.query.search) ? req.query.search.replace('/', '') : null)
    .then(rows => {
      let cartLength;

      if (req.cookies.cart) {
        cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
      } else {
        cartLength = 0;
      }

      res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.path, search: (req.query.search) ? req.query.search.replace('/', '') : null, data: rows, cart: cartLength > 0 ? cartLength : null });
    })
    .catch(err => {
      console.log(err);
      return res.status(500).send('Internal Server Error');
    });
});

app.get('/catalog/denkmit/cleaning', (req, res) => {
  if (!req.originalUrl.endsWith('/')) {
    return res.redirect(req.originalUrl + '/');
  }

  getDataDB('Denkmit', 'cleaning', query = (req.query.search) ? req.query.search.replace('/', '') : null)
    .then(rows => {
      let cartLength;

      if (req.cookies.cart) {
        cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
      } else {
        cartLength = 0;
      }

      res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.path, search: (req.query.search) ? req.query.search.replace('/', '') : null, data: rows, cart: cartLength > 0 ? cartLength : null });
    })
    .catch(err => {
      console.log(err);
      return res.status(500).send('Internal Server Error');
    });
});

app.get('/catalog/denkmit/fresh', (req, res) => {
  if (!req.originalUrl.endsWith('/')) {
    return res.redirect(req.originalUrl + '/');
  }

  getDataDB('Denkmit', 'fresh', query = (req.query.search) ? req.query.search.replace('/', '') : null)
    .then(rows => {
      let cartLength;

      if (req.cookies.cart) {
        cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
      } else {
        cartLength = 0;
      }

      res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.path, search: (req.query.search) ? req.query.search.replace('/', '') : null, data: rows, cart: cartLength > 0 ? cartLength : null });
    })
    .catch(err => {
      console.log(err);
      return res.status(500).send('Internal Server Error');
    });
});

app.get('/catalog/denkmit/other', (req, res) => {
  if (!req.originalUrl.endsWith('/')) {
    return res.redirect(req.originalUrl + '/');
  }

  getDataDB('Denkmit', 'other', query = (req.query.search) ? req.query.search.replace('/', '') : null)
    .then(rows => {
      let cartLength;

      if (req.cookies.cart) {
        cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
      } else {
        cartLength = 0;
      }

      res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.path, search: (req.query.search) ? req.query.search.replace('/', '') : null, data: rows, cart: cartLength > 0 ? cartLength : null });
    })
    .catch(err => {
      console.log(err);
      return res.status(500).send('Internal Server Error');
    });
});

app.get('/catalog/balea', (req, res) => {
  if (!req.originalUrl.endsWith('/')) {
    return res.redirect(req.originalUrl + '/');
  }

  getDataDB('Balea', null, query = (req.query.search) ? req.query.search.replace('/', '') : null)
    .then(rows => {
      let cartLength;

      if (req.cookies.cart) {
        cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
      } else {
        cartLength = 0;
      }

      res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.path, search: (req.query.search) ? req.query.search.replace('/', '') : null, data: rows, cart: cartLength > 0 ? cartLength : null });
    })
    .catch(err => {
      return res.status(500).send('Internal Server Error');
    });
});

app.get('/catalog/balea/hair', (req, res) => {
  if (!req.originalUrl.endsWith('/')) {
    return res.redirect(req.originalUrl + '/');
  }

  getDataDB('Balea', 'hair', query = (req.query.search) ? req.query.search.replace('/', '') : null)
    .then(rows => {
      let cartLength;

      if (req.cookies.cart) {
        cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
      } else {
        cartLength = 0;
      }

      res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.path, search: (req.query.search) ? req.query.search.replace('/', '') : null, data: rows, cart: cartLength > 0 ? cartLength : null });
    })
    .catch(err => {
      console.log(err);
      return res.status(500).send('Internal Server Error');
    });
});

app.get('/catalog/balea/skin', (req, res) => {
  if (!req.originalUrl.endsWith('/')) {
    return res.redirect(req.originalUrl + '/');
  }

  getDataDB('Balea', 'skin', query = (req.query.search) ? req.query.search.replace('/', '') : null)
    .then(rows => {
      let cartLength;

      if (req.cookies.cart) {
        cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
      } else {
        cartLength = 0;
      }

      res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.path, search: (req.query.search) ? req.query.search.replace('/', '') : null, data: rows, cart: cartLength > 0 ? cartLength : null });
    })
    .catch(err => {
      console.log(err);
      return res.status(500).send('Internal Server Error');
    });
});

app.get('/catalog/balea/body', (req, res) => {
  if (!req.originalUrl.endsWith('/')) {
    return res.redirect(req.originalUrl + '/');
  }

  getDataDB('Balea', 'body', query = (req.query.search) ? req.query.search.replace('/', '') : null)
    .then(rows => {
      let cartLength;

      if (req.cookies.cart) {
        cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
      } else {
        cartLength = 0;
      }

      res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.path, search: (req.query.search) ? req.query.search.replace('/', '') : null, data: rows, cart: cartLength > 0 ? cartLength : null });
    })
    .catch(err => {
      console.log(err);
      return res.status(500).send('Internal Server Error');
    });
});

app.get('/catalog/balea/shave', (req, res) => {
  if (!req.originalUrl.endsWith('/')) {
    return res.redirect(req.originalUrl + '/');
  }

  getDataDB('Balea', 'shave', query = (req.query.search) ? req.query.search.replace('/', '') : null)
    .then(rows => {
      let cartLength;

      if (req.cookies.cart) {
        cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
      } else {
        cartLength = 0;
      }

      res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.path, search: (req.query.search) ? req.query.search.replace('/', '') : null, data: rows, cart: cartLength > 0 ? cartLength : null });
    })
    .catch(err => {
      console.log(err);
      return res.status(500).send('Internal Server Error');
    });
});

app.get('/catalog/balea/hygiene', (req, res) => {
  if (!req.originalUrl.endsWith('/')) {
    return res.redirect(req.originalUrl + '/');
  }

  getDataDB('Balea', 'hygiene', query = (req.query.search) ? req.query.search.replace('/', '') : null)
    .then(rows => {
      let cartLength;

      if (req.cookies.cart) {
        cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
      } else {
        cartLength = 0;
      }

      res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.path, search: (req.query.search) ? req.query.search.replace('/', '') : null, data: rows, cart: cartLength > 0 ? cartLength : null });
    })
    .catch(err => {
      console.log(err);
      return res.status(500).send('Internal Server Error');
    });
});

app.get('/catalog/alverde', (req, res) => {
  if (!req.originalUrl.endsWith('/')) {
    return res.redirect(req.originalUrl + '/');
  }

  getDataDB('Alverde', null, query = (req.query.search) ? req.query.search.replace('/', '') : null)
    .then(rows => {
      let cartLength;

      if (req.cookies.cart) {
        cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
      } else {
        cartLength = 0;
      }

      res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.path, search: (req.query.search) ? req.query.search.replace('/', '') : null, data: rows, cart: cartLength > 0 ? cartLength : null });
    })
    .catch(err => {
      return res.status(500).send('Internal Server Error');
    });
});

app.get('/catalog/dontodent', (req, res) => {
  if (!req.originalUrl.endsWith('/')) {
    return res.redirect(req.originalUrl + '/');
  }

  getDataDB('Dontodent', null, query = (req.query.search) ? req.query.search.replace('/', '') : null)
    .then(rows => {
      let cartLength;

      if (req.cookies.cart) {
        cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
      } else {
        cartLength = 0;
      }

      res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.path, search: (req.query.search) ? req.query.search.replace('/', '') : null, data: rows, cart: cartLength > 0 ? cartLength : null });
    })
    .catch(err => {
      return res.status(500).send('Internal Server Error');
    });
});

app.get('/catalog/mivolis', (req, res) => {
  if (!req.originalUrl.endsWith('/')) {
    return res.redirect(req.originalUrl + '/');
  }

  getDataDB('Mivolis', null, query = (req.query.search) ? req.query.search.replace('/', '') : null)
    .then(rows => {
      let cartLength;

      if (req.cookies.cart) {
        cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
      } else {
        cartLength = 0;
      }

      res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.path, search: (req.query.search) ? req.query.search.replace('/', '') : null, data: rows, cart: cartLength > 0 ? cartLength : null });
    })
    .catch(err => {
      return res.status(500).send('Internal Server Error');
    });
});

app.get('/catalog/frosch', (req, res) => {
  if (!req.originalUrl.endsWith('/')) {
    return res.redirect(req.originalUrl + '/');
  }

  getDataDB('Frosch', null, query = (req.query.search) ? req.query.search.replace('/', '') : null)
    .then(rows => {
      let cartLength;

      if (req.cookies.cart) {
        cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
      } else {
        cartLength = 0;
      }

      res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.path, search: (req.query.search) ? req.query.search.replace('/', '') : null, data: rows, cart: cartLength > 0 ? cartLength : null });
    })
    .catch(err => {
      return res.status(500).send('Internal Server Error');
    });
});

app.get('/catalog/profissimo', (req, res) => {
  if (!req.originalUrl.endsWith('/')) {
    return res.redirect(req.originalUrl + '/');
  }

  getDataDB('Profissimo', null, query = (req.query.search) ? req.query.search.replace('/', '') : null)
    .then(rows => {
      let cartLength;

      if (req.cookies.cart) {
        cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
      } else {
        cartLength = 0;
      }

      res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.path, search: (req.query.search) ? req.query.search.replace('/', '') : null, data: rows, cart: cartLength > 0 ? cartLength : null });
    })
    .catch(err => {
      return res.status(500).send('Internal Server Error');
    });
});

app.get('/catalog/babylove', (req, res) => {
  if (!req.originalUrl.endsWith('/')) {
    return res.redirect(req.originalUrl + '/');
  }

  getDataDB('Babylove', null, query = (req.query.search) ? req.query.search.replace('/', '') : null)
    .then(rows => {
      let cartLength;

      if (req.cookies.cart) {
        cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
      } else {
        cartLength = 0;
      }

      res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.path, search: (req.query.search) ? req.query.search.replace('/', '') : null, data: rows, cart: cartLength > 0 ? cartLength : null });
    })
    .catch(err => {
      return res.status(500).send('Internal Server Error');
    });
});

app.get('/catalog/other', (req, res) => {
  if (!req.originalUrl.endsWith('/')) return res.redirect(req.originalUrl + '/');

  pool.query(`SELECT *, CEIL((price / 100) * (100 + price_factor) * 100) / 100 AS price_total FROM products WHERE visibility = true AND brand_original != 'Denkmit' AND brand_original != 'Balea' AND brand_original != 'Balea MEN' AND brand_original != 'Balea MED' AND brand_original != 'Alverde' AND brand_original != 'Dontodent' AND brand_original != 'Mivolis' AND brand_original != 'Frosch' AND brand_original != 'Profissimo' AND brand_original != 'Babylove' ORDER BY id DESC`, (err, result) => {
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

    res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.originalUrl, data: rows, cart: cartLength > 0 ? cartLength : null });
  });
});

app.get('/media/:uuid', (req, res) => {
  const imagePath = path.join(__dirname, '/media/', `${req.params.uuid}`);

  if (fs.existsSync(imagePath)) {
    res.sendFile(imagePath);
  } else {
    res.status(404);
  }
});

async function getDataDB(filter, type = null, query = null) {
  try {
    if (query != null) {
      if (type != null) {
        const filter_query = '%' + query.toLowerCase().replace('/', '') + '%';

        const result = await pool.query(`SELECT *, CEIL((price / 100) * (100 + price_factor) * 100) / 100 AS price_total FROM products WHERE brand_original LIKE $1 AND type = $2 AND (LOWER(title_original) LIKE $3 OR LOWER(title_translation) LIKE $4) AND visibility = true ORDER BY CASE WHEN exists = 1 THEN 1 WHEN exists = 2 THEN 2 WHEN exists = 0 THEN 3 END`, [filter + '%', type, filter_query, filter_query]);

        let rows = result.rows;
        rows = rows.map((row) => {
          row.pictures = JSON.parse(row.pictures);
          row.price_total = ((parseFloat(row.price_total) * euro_coefficient).toFixed(2)).replace('.', ',');
          return row;
        });

        return rows;
      } else {
        const filter_query = '%' + query.toLowerCase().replace('/', '') + '%';

        const result = await pool.query(`SELECT *, CEIL((price / 100) * (100 + price_factor) * 100) / 100 AS price_total FROM products WHERE brand_original LIKE $1 AND (LOWER(title_original) LIKE $2 OR LOWER(title_translation) LIKE $3) AND visibility = true ORDER BY CASE WHEN exists = 1 THEN 1 WHEN exists = 2 THEN 2 WHEN exists = 0 THEN 3 END`, [filter + '%', filter_query, filter_query]);

        let rows = result.rows;
        rows = rows.map((row) => {
          row.pictures = JSON.parse(row.pictures);
          row.price_total = ((parseFloat(row.price_total) * euro_coefficient).toFixed(2)).replace('.', ',');
          return row;
        });

        return rows;
      }
    } else {
      if (type != null) {
        const result = await pool.query(`SELECT *, CEIL((price / 100) * (100 + price_factor) * 100) / 100 AS price_total FROM products WHERE brand_original LIKE $1 AND type = $2 AND visibility = true ORDER BY CASE WHEN exists = 1 THEN 1 WHEN exists = 2 THEN 2 WHEN exists = 0 THEN 3 END`, [filter + '%', type]);

        let rows = result.rows;
        rows = rows.map((row) => {
          row.pictures = JSON.parse(row.pictures);
          row.price_total = ((parseFloat(row.price_total) * euro_coefficient).toFixed(2)).replace('.', ',');
          return row;
        });

        return rows;
      } else {
        const result = await pool.query(`SELECT *, CEIL((price / 100) * (100 + price_factor) * 100) / 100 AS price_total FROM products WHERE brand_original LIKE $1 AND visibility = true ORDER BY CASE WHEN exists = 1 THEN 1 WHEN exists = 2 THEN 2 WHEN exists = 0 THEN 3 END`, [filter + '%']);

        let rows = result.rows;
        rows = rows.map((row) => {
          row.pictures = JSON.parse(row.pictures);
          row.price_total = ((parseFloat(row.price_total) * euro_coefficient).toFixed(2)).replace('.', ',');
          return row;
        });

        return rows;
      }
    }
  } catch (error) {
    throw error;
  }
}

async function checkAdminUser(userId) {
  try {
    const result = await pool.query('SELECT admin FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];
    return user && user.admin === true;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

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

