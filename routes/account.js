const fs = require('fs');
const ini = require('ini');
const express = require('express');
const router = express.Router();
const pool = require('../database/init');


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

router.get('/', async (req, res) => {
    if (!req.originalUrl.endsWith('/')) return res.redirect(req.originalUrl + '/');

    if (req.session.isAuthenticated) {
        try {
            const isAdmin = await checkAdminUser(req.session.userId);

            if (isAdmin) {
                res.render('account', { user: (req.session.isAuthenticated) ? true : false, euro: euro_coefficient, url: req.originalUrl });
            } else {
                res.send('Добро пожаловать на защищенную страницу!');
            }
        } catch (error) {
            res.status(500).send('Сталася помилка під час перевірки прав адміністратора.');
        }
    } else {
        res.redirect('/authentication'); // If the user is not authenticated, redirect them to the login page
    }
});

router.post('/euro', async (req, res) => {
    if (!req.session.isAuthenticated) return res.redirect('/authentication');

    try {
        const isAdmin = await checkAdminUser(req.session.userId);

        if (!isAdmin) {
            return res.send('У вас немає прав для доступу до цієї сторінки!');
        }
    } catch (error) {
        return res.status(500).send('Сталася помилка під час перевірки прав адміністратора.');
    }

    var { euro } = req.body;
    global.euro_coefficient = parseFloat(euro).toFixed(2);

    config_ini.EURO_COEFFICIENT = euro_coefficient;
    fs.writeFileSync('exchange.ini', ini.stringify(config_ini), 'utf-8');

    res.redirect('/account');
});

router.get('/favorites', (req, res) => {
    if (!req.session.isAuthenticated) return res.redirect('/authentication');
    if (!req.originalUrl.endsWith('/')) return res.redirect(req.originalUrl + '/');

    pool.query(`SELECT products.*, CEIL((products.price / 100) * (100 + products.price_factor) * 100) / 100 AS price_total FROM favorites INNER JOIN products ON favorites.product = products.id WHERE favorites.user = $1`, [req.session.userId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }

        let rows = result.rows;
        rows = rows.map((row) => {
            row.pictures = JSON.parse(row.pictures);
            row.price_total = (parseFloat(row.price_total).toFixed(2)).replace('.', ',');
            return row;
        });

        res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.originalUrl, data: rows, cart: req.cookies.cart ? (JSON.parse(req.cookies.cart)).items : null });
    });
});

router.get('/review/add', async (req, res) => {
    if (!req.session.isAuthenticated) return res.status(400);

    var grade = req.query.grade;

    // Проверка, что значение grade находится в диапазоне от 1 до 5
    if (grade < 1 || grade > 5) {
        return res.status(400);
    }

    try {
        const existingReviewResult = await pool.query(`SELECT * FROM reviews WHERE "user" = $1`, [req.session.userId]);
        const existingReview = existingReviewResult.rows[0];

        if (existingReview) {
            await pool.query(`UPDATE reviews SET grade = $1 WHERE "user" = $2`, [grade, req.session.userId]);
            res.status(201).json({ message: 'SUCCESS' });
        } else {
            await pool.query(`INSERT INTO reviews ("user", grade) VALUES ($1, $2)`, [req.session.userId, grade]);
            res.status(201).json({ message: 'SUCCESS' });
        }
    } catch (error) {
        console.error('Ошибка при добавлении/обновлении отзыва:', error);
        res.status(500);
    }
});

router.get('/favorites/add', (req, res) => {
    if (!req.session.isAuthenticated) return res.redirect('/authentication');

    pool.query(`SELECT COUNT(*) as count FROM favorites WHERE "user" = $1 AND product = $2`, [req.session.userId, req.query.id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }

        const rowCount = result.rows[0].count;

        if (rowCount > 0) {
            return res.status(400).send('duplicate');
        }

        pool.query(`INSERT INTO favorites ("user", product) VALUES ($1, $2)`, [req.session.userId, req.query.id], (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Internal Server Error');
            }

            res.redirect('/account/favorites');
        });
    });
});

router.get('/favorites/del', (req, res) => {
    if (!req.session.isAuthenticated) return res.redirect('/authentication');

    pool.query(`DELETE FROM favorites WHERE "user" = $1 AND product = $2`, [req.session.userId, req.query.id], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }

        res.redirect('/account/favorites');
    });
});

router.get('/orders', async (req, res) => {
    if (!req.session.isAuthenticated) return res.redirect('/authentication');
    if (!req.originalUrl.endsWith('/') && !req.query.page) return res.redirect(req.originalUrl + '/');

    try {
        const isAdmin = await checkAdminUser(req.session.userId);

        if (!isAdmin) {
            return res.send('У вас немає прав для доступу до цієї сторінки!');
        }
    } catch (error) {
        return res.status(500).send('Произошла ошибка при проверке прав администратора');
    }

    try {
        var orders = await pool.query('SELECT * FROM orders ORDER BY id DESC LIMIT 20');

        if (parseInt(req.query.page)) orders = await pool.query(`SELECT * FROM orders ORDER BY id DESC LIMIT 20 OFFSET $1`, [req.query.page * 20 - 20]);

        let rows = orders.rows;
        rows = rows.map((row) => {
            if (row.date) {
                row.date = new Date(row.date).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' }) + " (" + new Date(row.date).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }) + ")";
                return row;
            }
        });

        const allOrders = [];

        for (const order of orders.rows) {
            const products = order.products;
            const orderProducts = [];

            for (const product of products) {
                const { id, amount } = product;
                const itemRow = await pool.query(
                    'SELECT id, brand_original, title_original, pictures, volume, price, price_factor, CEIL((price / 100) * (100 + price_factor) * 100) / 100 AS price_total FROM products WHERE id = $1',
                    [id]
                );

                if (itemRow.rows.length > 0) {
                    const itemData = itemRow.rows[0];
                    const productData = {
                        id,
                        amount,
                        brand_original: itemData.brand_original,
                        title_original: itemData.title_original,
                        pictures: JSON.parse(itemData.pictures),
                        volume: itemData.volume,
                        price: (parseFloat(itemData.price_total)).toFixed(2).replace('.', ',')
                    };
                    orderProducts.push(productData);
                }
            }

            const fullOrder = {
                ...order,
                products: orderProducts
            };

            allOrders.push(fullOrder);
        }

        res.render('orders.ejs', { user: req.session.isAuthenticated, euro: euro_coefficient, url: req.originalUrl, orders: allOrders, page: parseInt(req.query.page) ? parseInt(req.query.page) : 1 });
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
});

router.get('/orders/:id', async (req, res) => {
    if (!req.session.isAuthenticated) return res.redirect('/authentication');
    if (!req.originalUrl.endsWith('/')) return res.redirect(req.originalUrl + '/');

    try {
        const isAdmin = await checkAdminUser(req.session.userId);

        if (!isAdmin) {
            return res.send('У вас немає прав для доступу до цієї сторінки!');
        }
    } catch (error) {
        return res.status(500).send('Произошла ошибка при проверке прав администратора');
    }

    try {
        const orders = await pool.query('SELECT * FROM orders WHERE id = $1 LIMIT 1', [req.params.id]);

        let rows = orders.rows;
        rows = rows.map((row) => {
            if (row.date) {
                row.date = new Date(row.date).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' }) + " (" + new Date(row.date).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }) + ")";
                return row;
            }
        });

        const allOrders = [];

        for (const order of orders.rows) {
            const products = order.products;
            const orderProducts = [];

            for (const product of products) {
                const { id, amount } = product;
                const itemRow = await pool.query(
                    'SELECT id, brand_original, title_original, pictures, volume, price, price_factor, CEIL((price / 100) * (100 + price_factor) * 100) / 100 AS price_total FROM products WHERE id = $1',
                    [id]
                );

                if (itemRow.rows.length > 0) {
                    const itemData = itemRow.rows[0];
                    const productData = {
                        id,
                        amount,
                        brand_original: itemData.brand_original,
                        title_original: itemData.title_original,
                        pictures: JSON.parse(itemData.pictures),
                        volume: itemData.volume,
                        price: (parseFloat(itemData.price_total)).toFixed(2).replace('.', ',')
                    };
                    orderProducts.push(productData);
                }
            }

            const fullOrder = {
                ...order,
                products: orderProducts
            };

            allOrders.push(fullOrder);
        }

        res.render('order.ejs', { user: req.session.isAuthenticated, euro: euro_coefficient, url: req.originalUrl, orders: allOrders });
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
});

router.post('/orders/:id', express.urlencoded({ extended: false }), async (req, res) => {
    if (!req.body) return res.sendStatus(400);

    try {
        const isAdmin = await checkAdminUser(req.session.userId);

        if (!isAdmin) {
            return res.send('У вас немає прав для доступу до цієї сторінки!');
        }
    } catch (error) {
        return res.status(500).send('Сталася помилка під час перевірки прав адміністратора.');
    }

    const { products, amount } = req.body;
    const data = [];

    for (let i = 0; i < products.length; i++) {
        const product = {
            id: products[i],
            amount: amount[i]
        };
        data.push(product);
    }

    const jsonData = JSON.stringify(data);

    pool.query(`UPDATE orders SET products = $1 WHERE id = $2`, [jsonData, req.params.id], (err) => {
        if (err) {
            console.error(req.body);
            console.error(err);
            res.sendStatus(500);
        } else {
            res.redirect('/account/orders/' + req.params.id);
        }
    });
});

router.post('/orders/:id/status', async (req, res) => {
    if (!req.session.isAuthenticated) return res.status(500);

    try {
        const isAdmin = await checkAdminUser(req.session.userId);

        if (!isAdmin) {
            return res.send('У вас немає прав для доступу до цієї сторінки!');
        }
    } catch (error) {
        return res.status(500).send('Сталася помилка під час перевірки прав адміністратора.');
    }

    var { status } = req.body;

    try {
        if (status) {
            await pool.query(`UPDATE orders SET status = $1 WHERE id = $2`, [status, req.params.id]);
        }

        res.redirect('/account/orders');
    } catch (err) {
        console.error('Internal Server Error', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/orders/:id/pdf', async (req, res) => {
    if (!req.session.isAuthenticated) return res.redirect('/authentication');
    if (!req.originalUrl.endsWith('/')) return res.redirect(req.originalUrl + '/');

    try {
        const isAdmin = await checkAdminUser(req.session.userId);

        if (!isAdmin) {
            return res.send('У вас немає прав для доступу до цієї сторінки!');
        }
    } catch (error) {
        return res.status(500).send('Сталася помилка під час перевірки прав адміністратора.');
    }

    try {
        const orderRow = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);

        if (orderRow.rows.length === 0) {
            return res.status(404).send('Заказ не найден');
        }

        let rows = orderRow.rows;
        rows = rows.map((row) => {
            if (row.date) {
                row.date = new Date(row.date).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
                return row;
            }
        });

        const order = orderRow.rows[0];

        const products = order.products;
        const orderProducts = [];

        for (const product of products) {
            const { id, amount } = product;
            const itemRow = await pool.query(
                'SELECT id, brand_translation, title_translation, brand_original, title_original, volume, price, price_factor, CEIL((price / 100) * (100 + price_factor) * 100) / 100 AS price_total FROM products WHERE id = $1',
                [id]
            );

            if (itemRow.rows.length > 0) {
                const itemData = itemRow.rows[0];
                const productData = {
                    id,
                    amount,
                    brand_original: itemData.brand_original,
                    title_original: itemData.title_original,
                    brand_translation: itemData.brand_translation,
                    title_translation: itemData.title_translation,
                    volume: itemData.volume,
                    price: ((parseFloat(itemData.price_total) * euro_coefficient).toFixed(2)).replace('.', ','),
                };
                orderProducts.push(productData);
            }
        }

        const fullOrder = {
            ...order,
            products: orderProducts
        };

        res.render('invoice.ejs', { order: fullOrder });
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
});

router.get('/editor', async (req, res) => {
    if (!req.session.isAuthenticated) return res.redirect('/authentication');
    if (!req.originalUrl.endsWith('/')) return res.redirect(req.originalUrl + '/');

    try {
        const isAdmin = await checkAdminUser(req.session.userId);

        if (!isAdmin) {
            return res.send('У вас немає прав для доступу до цієї сторінки!');
        }
    } catch (error) {
        return res.status(500).send('Сталася помилка під час перевірки прав адміністратора.');
    }

    if (req.query.search) {
        const filter = `%${req.query.search.toLowerCase().replace('/', '')}%`;

        pool.query(`SELECT *, CEIL((price / 100) * (100 + price_factor) * 100) / 100 AS price_total FROM products WHERE LOWER(title_original) LIKE $1 OR LOWER(title_translation) LIKE $2`, [filter, filter], (err, result) => {
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

            res.render('editor', { user: (req.session.isAuthenticated) ? true : false, url: req.originalUrl, data: rows });
        });

    } else {
        pool.query(`SELECT *, CEIL((price / 100) * (100 + price_factor) * 100) / 100 AS price_total FROM products`, (err, result) => {
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

            res.render('editor', { user: (req.session.isAuthenticated) ? true : false, url: req.originalUrl, data: rows });
        });
    }
});

router.post('/editor/save', async (req, res) => {
    if (!req.session.isAuthenticated) return res.status(500);

    try {
        const isAdmin = await checkAdminUser(req.session.userId);

        if (!isAdmin) {
            return res.send('У вас немає прав для доступу до цієї сторінки!');
        }
    } catch (error) {
        return res.status(500).send('Сталася помилка під час перевірки прав адміністратора.');
    }

    var { id, price, price_factor, amount, box, pictures, description, exists, visibility } = req.body;

    try {
        if (!id) {
            return res.status(400);
        }

        if (price && price_factor) {
            await pool.query(`UPDATE products SET price = $1, price_factor = $2 WHERE id = $3`, [parseFloat((price).replace(',', '.')).toFixed(2), price_factor, id]);
        } if (amount) {
            await pool.query(`UPDATE products SET exists = $1, amount = $2 WHERE id = $3`, [exists, amount, id]);
        } if (box) {
            await pool.query(`UPDATE products SET "case" = $1 WHERE id = $2`, [box, id]);
        } if (description) {
            await pool.query(`UPDATE products SET description = $1 WHERE id = $2`, [description, id]);
        } if (visibility) {
            await pool.query(`UPDATE products SET visibility = $1 WHERE id = $2`, [visibility, id]);
        } if (pictures) {
            const resultArray = pictures.split(',https');
            for (let i = 1; i < resultArray.length; i++) {
                resultArray[i] = 'https' + resultArray[i];
            }
            pictures = JSON.stringify(resultArray);

            await pool.query(`UPDATE products SET pictures = $1 WHERE id = $2`, [pictures, id]);
        } else {
            await pool.query(`UPDATE products SET exists = $1 WHERE id = $2`, [exists, id]);
        }

        res.status(201).json({ message: 'SUCCESS' });
    } catch (err) {
        console.error('Internal Server Error', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/product/add', express.urlencoded({ extended: false }), async (req, res) => {
    if (!req.session.isAuthenticated) return res.sendStatus(400);
    if (!req.body) return res.sendStatus(400);

    try {
        const isAdmin = await checkAdminUser(req.session.userId);

        if (!isAdmin) {
            return res.send('У вас немає прав для доступу до цієї сторінки!');
        }
    } catch (error) {
        return res.status(500).send('Сталася помилка під час перевірки прав адміністратора.');
    }

    var { brand, title_original, title_translation, type, pictures, description, volume, weight, price, price_factor, amount, box, dm } = req.body;

    var brand_translation = null;
    if (brand === 'Denkmit') {
        brand_translation = 'Денкміт';
    } else if (brand === 'Balea') {
        brand_translation = 'Балеа';
    } else if (brand === 'Alverde') {
        brand_translation = 'Альверде';
    } else if (brand === 'Dontodent') {
        brand_translation = 'Донтодент';
    } else if (brand === 'Mivolis') {
        brand_translation = 'Міволіс';
    } else if (brand === 'Frosch') {
        brand_translation = 'Фрош';
    } else if (brand === 'Profissimo') {
        brand_translation = 'Профісімо';
    } else if (brand === 'Babylove') {
        brand_translation = 'Бейбілав';
    } else if (brand === 'Visiomax') {
        brand_translation = 'Візіомакс';
    } else if (brand === 'Deluxe') {
        brand_translation = 'Делюкс';
    } else if (brand === 'Theramed') {
        brand_translation = 'Тхерамед';
    } else {
        return res.sendStatus(400);
    }

    pictures = JSON.stringify(pictures.split("|"));

    if (dm == 'on') { dm = true } else { dm = false }

    pool.query(`INSERT INTO products (brand_original, brand_translation, "type", title_original, title_translation, description, pictures, volume, price, price_factor, amount, weight, exists, "case", dm, discount) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`, [brand, brand_translation, type, title_original, title_translation, description, pictures, volume, price.replace(',', '.'), price_factor, amount, weight, 1, box, dm, 0], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }

        res.redirect('/account?status=success');
    });
});


module.exports = router;