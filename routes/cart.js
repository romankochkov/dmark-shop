const express = require('express');
const format = require('pg-format');
const router = express.Router();
const pool = require('../database/init');


router.get('/', (req, res) => {
    if (!req.originalUrl.endsWith('/')) return res.redirect(req.originalUrl + '/');

    if (req.query.search) return res.redirect(`/catalog?${Object.keys(req.query).map(key => `${key}=${req.query[key]}`).join('&')}`);

    if (req.cookies.cart) {
        const cart = JSON.parse(req.cookies.cart);
        const cart_items = cart.items;

        if (Object.keys(cart_items).length > 0) {
            const itemIds = Object.keys(cart_items);

            const placeholders = format('(%L)', itemIds);  // Форматируем массив itemIds в строку, чтобы использовать в запросе

            pool.query(`SELECT *, CEIL((price / 100) * (100 + price_factor) * 100) / 100 AS price_total FROM products WHERE id IN ${placeholders}`, (err, result) => {
                if (err) {
                    console.error(err);
                    res.clearCookie('cart');
                    return res.status(500).send('Internal Server Error');
                }

                let rows = result.rows;
                rows = rows.map((row) => {
                    row.pictures = JSON.parse(row.pictures);
                    row.price_total = (parseFloat(row.price_total).toFixed(2)).replace('.', ',');
                    row.quantity = cart_items[row.id]; // Добавляем количество товара из корзины в результат
                    return row;
                });

                res.render('cart', { user: (req.session.isAuthenticated) ? true : false, euro: euro_coefficient, url: req.originalUrl, cart: rows });
            });
        } else {
            res.render('cart', { user: (req.session.isAuthenticated) ? true : false, euro: euro_coefficient, url: req.originalUrl, cart: [] });
        }
    } else {
        res.render('cart', { user: (req.session.isAuthenticated) ? true : false, euro: euro_coefficient, url: req.originalUrl, cart: [] });
    }
});

router.post('/', express.urlencoded({ extended: false }), (req, res) => {
    if (!req.body) return res.sendStatus(400);

    const { first_name, last_name, phone_number, products, amount, region, address, comment } = req.body;
    const data = [];
    console.log(products + '\n' + amount);
    console.log(typeof products);

    if (typeof products === 'string') {
        const product = {
            id: products,
            amount: amount
        };
        data.push(product);
    } else {
        for (let i = 0; i < products.length; i++) {
            const product = {
                id: products[i],
                amount: amount[i]
            };
            data.push(product);
        }
    }

    const jsonData = JSON.stringify(data);

    pool.query(`INSERT INTO orders ("user", first_name, last_name, phone_number, products, region, address, comment, status, date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`, [req.session.isAuthenticated ? req.session.userId : null, first_name, last_name, phone_number.replace(/[^\w]/gi, ''), jsonData, region, address, comment || null, '0', (new Date())], async (err, result) => {
        if (err) {
            console.error(req.body);
            console.error(err);
            res.sendStatus(500);
        } else {
            res.clearCookie('cart');
            res.redirect('/catalog?order=success');

            const order_id = result.rows[0].id;

            try {
                const response = await axios.post(
                    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
                    {
                        chat_id: process.env.TELEGRAM_CHAT_ID,
                        text: `Надійшло нове замовлення №${order_id}\nhttps://dm.lviv.ua/account/orders/`,
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }
                );
            } catch (error) {
                console.error('Ошибка при отправке уведомления в Telegram:', error);
            }
        }
    });
});

router.get('/data', async (req, res) => {
    if (req.query.region) {
        try {
            const response = await axios.post('https://api.novaposhta.ua/v2.0/json/', {
                modelName: 'Address',
                calledMethod: 'getCities',
                methodProperties: {},
                apiKey: process.env.NOVAPOSHTA_TOKEN
            });

            if (response.data.success) {
                data = response.data.data.map(city => city.Description);

                // Фильтрация городов по заданному тексту
                const searchText = req.query.region;
                const regex = new RegExp('^' + searchText.toLowerCase());
                cities = data.filter(city => city.toLowerCase().match(regex));

                // Результаты фильтрации
                res.send(cities)
            }
            else {
                console.log(response);
                throw new Error('Ошибка при получении списка городов');
            }
        }
        catch (error) {
            console.error('Произошла ошибка:', error.message);
            res.status(500).send('Произошла ошибка');
        }
    }
    else if (req.query.branch && req.query.type) {
        try {
            const response = await axios.post('https://api.novaposhta.ua/v2.0/json/', {
                modelName: 'Address',
                calledMethod: 'getWarehouses',
                methodProperties: {
                    CityName: req.query.branch,
                    Language: 'ua',
                },
                apiKey: process.env.NOVAPOSHTA_TOKEN
            });

            if (response.data.success) {
                const warehouses = response.data.data;

                var filteredWarehouses;

                if (req.query.type == 'Відділення') {
                    filteredWarehouses = warehouses.filter(warehouse => warehouse.Description.startsWith('Відділення'));
                }
                else {
                    filteredWarehouses = warehouses.filter(warehouse => warehouse.Description.startsWith('Поштомат'));
                }

                const descriptions = filteredWarehouses.map(warehouse => warehouse.Description);

                // Отправка списка описаний отделений
                res.send(descriptions);
            } else {
                throw new Error('Ошибка при получении списка отделений');
            }
        } catch (error) {
            console.error('Произошла ошибка:', error.message);
            res.status(500).send('Произошла ошибка');
        }
    }

});

router.get('/add', (req, res) => {
    const itemId = req.query.id; // Получаем идентификатор товара из запроса


    if (req.cookies.cart) {  // Проверяем, есть ли уже корзина в cookie  
        const cart = JSON.parse(req.cookies.cart);  // Если корзина уже существует, добавляем товар в нее (если его там еще нет)

        if (cart.items[itemId]) {
            if (req.query.quantity) {
                cart.items[itemId] += Number(req.query.quantity);
                res.cookie('cart', JSON.stringify(cart));  // Обновляем cookie с обновленной корзиной
                return res.status(200).send('DUPLICATE');
            } else {
                cart.items[itemId] += 1;  // Если товар уже есть в корзине, увеличиваем количество на 1
                res.cookie('cart', JSON.stringify(cart));
                return res.status(200).send('DUPLICATE');
            }
        } else {
            cart.items[itemId] = 1;  // Если товара с таким идентификатором ещё нет в корзине, добавляем его с количеством 1
        }

        res.cookie('cart', JSON.stringify(cart));
        res.json({ message: 'Товар добавлен в корзину' });
    } else {
        // Если корзина не существует, создаем новую корзину и добавляем товар в нее с количеством 1
        const cart = {
            items: {
                [itemId]: 1
            }
        };
        res.cookie('cart', JSON.stringify(cart));
        res.json({ message: 'Товар добавлен в корзину' });
    }
});

router.get('/del', (req, res) => {
    const itemId = req.query.id; // Получаем идентификатор товара из запроса

    // Проверяем, есть ли корзина в cookie
    if (req.cookies.cart) {
        const cart = JSON.parse(req.cookies.cart);

        if (req.query.quantity) {
            cart.items[itemId] -= Number(req.query.quantity);
            res.cookie('cart', JSON.stringify(cart));  // Обновляем cookie с обновленной корзиной
            return res.status(200).send('OK');
        } else {
            delete cart.items[itemId];  // Удаляем товар из корзины
            res.cookie('cart', JSON.stringify(cart));  // Обновляем cookie с обновленной корзиной
            return res.redirect('/cart'); // Перенаправляем на страницу корзины
        }
    }
});


module.exports = router;