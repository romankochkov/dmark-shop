const express = require('express');
const router = express.Router();
const pool = require('../database/init');


router.get('/', (req, res) => {
    if (!req.originalUrl.endsWith('/')) return res.redirect(req.originalUrl + '/');

    if (req.query.search) {
        const filter = `%${req.query.search.toLowerCase().replace('/', '')}%`;

        pool.query(`SELECT *, CEIL((price / 100) * (100 + price_factor) * 100) / 100 AS price_total FROM products WHERE (LOWER(title_original) LIKE $1 OR LOWER(title_translation) LIKE $2) AND visibility = true ORDER BY CASE WHEN exists = 1 THEN 1 WHEN exists = 2 THEN 2 WHEN exists = 0 THEN 3 END LIMIT 90`, [filter, filter], async (err, result) => {
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

            const max = await pool.query('SELECT COUNT(*) AS count FROM products;');

            res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.originalUrl, search: req.query.search.replace('/', ''), data: rows, cart: cartLength > 0 ? cartLength : null, max: max.rows[0].count });
        });
    } else {
        // Если параметр "GET" не указан, выводим все записи
        pool.query(`SELECT *, CEIL((price / 100) * (100 + price_factor) * 100) / 100 AS price_total FROM products WHERE visibility = true ORDER BY CASE WHEN exists = 1 THEN 1 WHEN exists = 2 THEN 2 WHEN exists = 0 THEN 3 END LIMIT 90`, async (err, result) => {
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

            const max = await pool.query('SELECT COUNT(*) AS count FROM products;');

            res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.originalUrl, data: rows, cart: cartLength > 0 ? cartLength : null, max: max.rows[0].count });
        });
    }
});

router.get('/product/:id', (req, res) => {
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

router.get('/newest', (req, res) => {
    if (!req.originalUrl.endsWith('/')) return res.redirect(req.originalUrl + '/');

    pool.query(`SELECT *, CEIL((price / 100) * (100 + price_factor) * 100) / 100 AS price_total FROM products WHERE visibility = true ORDER BY id DESC LIMIT 30`, async (err, result) => {
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

        const max = await pool.query('SELECT COUNT(*) AS count FROM products;');

        res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.originalUrl, data: rows, cart: cartLength > 0 ? cartLength : null, max: max.rows[0].count });
    });
});

router.get('/denkmit', (req, res) => {
    if (!req.originalUrl.endsWith('/')) {
        return res.redirect(req.originalUrl + '/');
    }

    getDataDB('Denkmit', null, query = (req.query.search) ? req.query.search.replace('/', '') : null)
        .then(async rows => {
            let cartLength;

            if (req.cookies.cart) {
                cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
            } else {
                cartLength = 0;
            }

            let max = await pool.query('SELECT COUNT(*) AS count FROM products;');

            res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.path, search: (req.query.search) ? req.query.search.replace('/', '') : null, data: rows, cart: cartLength > 0 ? cartLength : null, max: max.rows[0].count });
        })
        .catch(err => {
            console.log(err);
            return res.status(500).send('Internal Server Error');
        });
});

router.get('/denkmit/kitchen', (req, res) => {
    if (!req.originalUrl.endsWith('/')) {
        return res.redirect(req.originalUrl + '/');
    }

    getDataDB('Denkmit', 'kitchen', query = (req.query.search) ? req.query.search.replace('/', '') : null)
        .then(async rows => {
            let cartLength;

            if (req.cookies.cart) {
                cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
            } else {
                cartLength = 0;
            }

            let max = await pool.query('SELECT COUNT(*) AS count FROM products;');

            res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.path, search: (req.query.search) ? req.query.search.replace('/', '') : null, data: rows, cart: cartLength > 0 ? cartLength : null, max: max.rows[0].count });
        })
        .catch(err => {
            console.log(err);
            return res.status(500).send('Internal Server Error');
        });
});

router.get('/denkmit/washing', (req, res) => {
    if (!req.originalUrl.endsWith('/')) {
        return res.redirect(req.originalUrl + '/');
    }

    getDataDB('Denkmit', 'washing', query = (req.query.search) ? req.query.search.replace('/', '') : null)
        .then(async rows => {
            let cartLength;

            if (req.cookies.cart) {
                cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
            } else {
                cartLength = 0;
            }

            let max = await pool.query('SELECT COUNT(*) AS count FROM products;');

            res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.path, search: (req.query.search) ? req.query.search.replace('/', '') : null, data: rows, cart: cartLength > 0 ? cartLength : null, max: max.rows[0].count });
        })
        .catch(err => {
            console.log(err);
            return res.status(500).send('Internal Server Error');
        });
});

router.get('/denkmit/wc', (req, res) => {
    if (!req.originalUrl.endsWith('/')) {
        return res.redirect(req.originalUrl + '/');
    }

    getDataDB('Denkmit', 'wc', query = (req.query.search) ? req.query.search.replace('/', '') : null)
        .then(async rows => {
            let cartLength;

            if (req.cookies.cart) {
                cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
            } else {
                cartLength = 0;
            }

            let max = await pool.query('SELECT COUNT(*) AS count FROM products;');
            
            res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.path, search: (req.query.search) ? req.query.search.replace('/', '') : null, data: rows, cart: cartLength > 0 ? cartLength : null, max: max.rows[0].count });
        })
        .catch(err => {
            console.log(err);
            return res.status(500).send('Internal Server Error');
        });
});

router.get('/denkmit/cleaning', (req, res) => {
    if (!req.originalUrl.endsWith('/')) {
        return res.redirect(req.originalUrl + '/');
    }

    getDataDB('Denkmit', 'cleaning', query = (req.query.search) ? req.query.search.replace('/', '') : null)
        .then(async rows => {
            let cartLength;

            if (req.cookies.cart) {
                cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
            } else {
                cartLength = 0;
            }

            let max = await pool.query('SELECT COUNT(*) AS count FROM products;');
            
            res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.path, search: (req.query.search) ? req.query.search.replace('/', '') : null, data: rows, cart: cartLength > 0 ? cartLength : null, max: max.rows[0].count });
        })
        .catch(err => {
            console.log(err);
            return res.status(500).send('Internal Server Error');
        });
});

router.get('/denkmit/fresh', (req, res) => {
    if (!req.originalUrl.endsWith('/')) {
        return res.redirect(req.originalUrl + '/');
    }

    getDataDB('Denkmit', 'fresh', query = (req.query.search) ? req.query.search.replace('/', '') : null)
        .then(async rows => {
            let cartLength;

            if (req.cookies.cart) {
                cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
            } else {
                cartLength = 0;
            }

            let max = await pool.query('SELECT COUNT(*) AS count FROM products;');

            res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.path, search: (req.query.search) ? req.query.search.replace('/', '') : null, data: rows, cart: cartLength > 0 ? cartLength : null, max: max.rows[0].count });
        })
        .catch(err => {
            console.log(err);
            return res.status(500).send('Internal Server Error');
        });
});

router.get('/denkmit/other', (req, res) => {
    if (!req.originalUrl.endsWith('/')) {
        return res.redirect(req.originalUrl + '/');
    }

    getDataDB('Denkmit', 'other', query = (req.query.search) ? req.query.search.replace('/', '') : null)
        .then(async rows => {
            let cartLength;

            if (req.cookies.cart) {
                cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
            } else {
                cartLength = 0;
            }

            let max = await pool.query('SELECT COUNT(*) AS count FROM products;');

            res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.path, search: (req.query.search) ? req.query.search.replace('/', '') : null, data: rows, cart: cartLength > 0 ? cartLength : null, max: max.rows[0].count });
        })
        .catch(err => {
            console.log(err);
            return res.status(500).send('Internal Server Error');
        });
});

router.get('/balea', (req, res) => {
    if (!req.originalUrl.endsWith('/')) {
        return res.redirect(req.originalUrl + '/');
    }

    getDataDB('Balea', null, query = (req.query.search) ? req.query.search.replace('/', '') : null)
        .then(async rows => {
            let cartLength;

            if (req.cookies.cart) {
                cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
            } else {
                cartLength = 0;
            }

            let max = await pool.query('SELECT COUNT(*) AS count FROM products;');

            res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.path, search: (req.query.search) ? req.query.search.replace('/', '') : null, data: rows, cart: cartLength > 0 ? cartLength : null, max: max.rows[0].count });
        })
        .catch(err => {
            return res.status(500).send('Internal Server Error');
        });
});

router.get('/balea/hair', (req, res) => {
    if (!req.originalUrl.endsWith('/')) {
        return res.redirect(req.originalUrl + '/');
    }

    getDataDB('Balea', 'hair', query = (req.query.search) ? req.query.search.replace('/', '') : null)
        .then(async rows => {
            let cartLength;

            if (req.cookies.cart) {
                cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
            } else {
                cartLength = 0;
            }

            let max = await pool.query('SELECT COUNT(*) AS count FROM products;');

            res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.path, search: (req.query.search) ? req.query.search.replace('/', '') : null, data: rows, cart: cartLength > 0 ? cartLength : null, max: max.rows[0].count });
        })
        .catch(err => {
            console.log(err);
            return res.status(500).send('Internal Server Error');
        });
});

router.get('/balea/skin', (req, res) => {
    if (!req.originalUrl.endsWith('/')) {
        return res.redirect(req.originalUrl + '/');
    }

    getDataDB('Balea', 'skin', query = (req.query.search) ? req.query.search.replace('/', '') : null)
        .then(async rows => {
            let cartLength;

            if (req.cookies.cart) {
                cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
            } else {
                cartLength = 0;
            }

            let max = await pool.query('SELECT COUNT(*) AS count FROM products;');

            res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.path, search: (req.query.search) ? req.query.search.replace('/', '') : null, data: rows, cart: cartLength > 0 ? cartLength : null, max: max.rows[0].count });
        })
        .catch(err => {
            console.log(err);
            return res.status(500).send('Internal Server Error');
        });
});

router.get('/balea/body', (req, res) => {
    if (!req.originalUrl.endsWith('/')) {
        return res.redirect(req.originalUrl + '/');
    }

    getDataDB('Balea', 'body', query = (req.query.search) ? req.query.search.replace('/', '') : null)
        .then(async rows => {
            let cartLength;

            if (req.cookies.cart) {
                cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
            } else {
                cartLength = 0;
            }

            let max = await pool.query('SELECT COUNT(*) AS count FROM products;');

            res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.path, search: (req.query.search) ? req.query.search.replace('/', '') : null, data: rows, cart: cartLength > 0 ? cartLength : null, max: max.rows[0].count });
        })
        .catch(err => {
            console.log(err);
            return res.status(500).send('Internal Server Error');
        });
});

router.get('/balea/shave', (req, res) => {
    if (!req.originalUrl.endsWith('/')) {
        return res.redirect(req.originalUrl + '/');
    }

    getDataDB('Balea', 'shave', query = (req.query.search) ? req.query.search.replace('/', '') : null)
        .then(async rows => {
            let cartLength;

            if (req.cookies.cart) {
                cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
            } else {
                cartLength = 0;
            }

            let max = await pool.query('SELECT COUNT(*) AS count FROM products;');

            res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.path, search: (req.query.search) ? req.query.search.replace('/', '') : null, data: rows, cart: cartLength > 0 ? cartLength : null, max: max.rows[0].count });
        })
        .catch(err => {
            console.log(err);
            return res.status(500).send('Internal Server Error');
        });
});

router.get('/balea/hygiene', (req, res) => {
    if (!req.originalUrl.endsWith('/')) {
        return res.redirect(req.originalUrl + '/');
    }

    getDataDB('Balea', 'hygiene', query = (req.query.search) ? req.query.search.replace('/', '') : null)
        .then(async rows => {
            let cartLength;

            if (req.cookies.cart) {
                cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
            } else {
                cartLength = 0;
            }

            let max = await pool.query('SELECT COUNT(*) AS count FROM products;');

            res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.path, search: (req.query.search) ? req.query.search.replace('/', '') : null, data: rows, cart: cartLength > 0 ? cartLength : null, max: max.rows[0].count });
        })
        .catch(err => {
            console.log(err);
            return res.status(500).send('Internal Server Error');
        });
});

router.get('/alverde', (req, res) => {
    if (!req.originalUrl.endsWith('/')) {
        return res.redirect(req.originalUrl + '/');
    }

    getDataDB('Alverde', null, query = (req.query.search) ? req.query.search.replace('/', '') : null)
        .then(async rows => {
            let cartLength;

            if (req.cookies.cart) {
                cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
            } else {
                cartLength = 0;
            }

            let max = await pool.query('SELECT COUNT(*) AS count FROM products;');

            res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.path, search: (req.query.search) ? req.query.search.replace('/', '') : null, data: rows, cart: cartLength > 0 ? cartLength : null, max: max.rows[0].count });
        })
        .catch(err => {
            return res.status(500).send('Internal Server Error');
        });
});

router.get('/dontodent', (req, res) => {
    if (!req.originalUrl.endsWith('/')) {
        return res.redirect(req.originalUrl + '/');
    }

    getDataDB('Dontodent', null, query = (req.query.search) ? req.query.search.replace('/', '') : null)
        .then(async rows => {
            let cartLength;

            if (req.cookies.cart) {
                cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
            } else {
                cartLength = 0;
            }

            let max = await pool.query('SELECT COUNT(*) AS count FROM products;');

            res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.path, search: (req.query.search) ? req.query.search.replace('/', '') : null, data: rows, cart: cartLength > 0 ? cartLength : null, max: max.rows[0].count });
        })
        .catch(err => {
            return res.status(500).send('Internal Server Error');
        });
});

router.get('/mivolis', (req, res) => {
    if (!req.originalUrl.endsWith('/')) {
        return res.redirect(req.originalUrl + '/');
    }

    getDataDB('Mivolis', null, query = (req.query.search) ? req.query.search.replace('/', '') : null)
        .then(async rows => {
            let cartLength;

            if (req.cookies.cart) {
                cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
            } else {
                cartLength = 0;
            }

            let max = await pool.query('SELECT COUNT(*) AS count FROM products;');

            res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.path, search: (req.query.search) ? req.query.search.replace('/', '') : null, data: rows, cart: cartLength > 0 ? cartLength : null, max: max.rows[0].count });
        })
        .catch(err => {
            return res.status(500).send('Internal Server Error');
        });
});

router.get('/frosch', (req, res) => {
    if (!req.originalUrl.endsWith('/')) {
        return res.redirect(req.originalUrl + '/');
    }

    getDataDB('Frosch', null, query = (req.query.search) ? req.query.search.replace('/', '') : null)
        .then(async rows => {
            let cartLength;

            if (req.cookies.cart) {
                cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
            } else {
                cartLength = 0;
            }

            let max = await pool.query('SELECT COUNT(*) AS count FROM products;');

            res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.path, search: (req.query.search) ? req.query.search.replace('/', '') : null, data: rows, cart: cartLength > 0 ? cartLength : null, max: max.rows[0].count });
        })
        .catch(err => {
            return res.status(500).send('Internal Server Error');
        });
});

router.get('/profissimo', (req, res) => {
    if (!req.originalUrl.endsWith('/')) {
        return res.redirect(req.originalUrl + '/');
    }

    getDataDB('Profissimo', null, query = (req.query.search) ? req.query.search.replace('/', '') : null)
        .then(async rows => {
            let cartLength;

            if (req.cookies.cart) {
                cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
            } else {
                cartLength = 0;
            }

            let max = await pool.query('SELECT COUNT(*) AS count FROM products;');

            res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.path, search: (req.query.search) ? req.query.search.replace('/', '') : null, data: rows, cart: cartLength > 0 ? cartLength : null, max: max.rows[0].count });
        })
        .catch(err => {
            return res.status(500).send('Internal Server Error');
        });
});

router.get('/babylove', (req, res) => {
    if (!req.originalUrl.endsWith('/')) {
        return res.redirect(req.originalUrl + '/');
    }

    getDataDB('Babylove', null, query = (req.query.search) ? req.query.search.replace('/', '') : null)
        .then(async rows => {
            let cartLength;

            if (req.cookies.cart) {
                cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
            } else {
                cartLength = 0;
            }

            let max = await pool.query('SELECT COUNT(*) AS count FROM products;');

            res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.path, search: (req.query.search) ? req.query.search.replace('/', '') : null, data: rows, cart: cartLength > 0 ? cartLength : null, max: max.rows[0].count });
        })
        .catch(err => {
            return res.status(500).send('Internal Server Error');
        });
});

router.get('/beckmann', (req, res) => {
    if (!req.originalUrl.endsWith('/')) {
        return res.redirect(req.originalUrl + '/');
    }

    getDataDB('Dr.Beckmann', null, query = (req.query.search) ? req.query.search.replace('/', '') : null)
        .then(async rows => {
            let cartLength;

            if (req.cookies.cart) {
                cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
            } else {
                cartLength = 0;
            }

            let max = await pool.query('SELECT COUNT(*) AS count FROM products;');

            res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.path, search: (req.query.search) ? req.query.search.replace('/', '') : null, data: rows, cart: cartLength > 0 ? cartLength : null, max: max.rows[0].count });
        })
        .catch(err => {
            return res.status(500).send('Internal Server Error');
        });
});

router.get('/other', (req, res) => {
    if (!req.originalUrl.endsWith('/')) return res.redirect(req.originalUrl + '/');

    pool.query(`SELECT *, CEIL((price / 100) * (100 + price_factor) * 100) / 100 AS price_total FROM products WHERE visibility = true AND brand_original != 'Denkmit' AND brand_original != 'Balea' AND brand_original != 'Balea MEN' AND brand_original != 'Balea MED' AND brand_original != 'Alverde' AND brand_original != 'Dontodent' AND brand_original != 'Mivolis' AND brand_original != 'Frosch' AND brand_original != 'Profissimo' AND brand_original != 'Babylove' ORDER BY id DESC`, async (err, result) => {
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

        let max = await pool.query('SELECT COUNT(*) AS count FROM products;');
        
        res.render('catalog', { user: (req.session.isAuthenticated) ? true : false, url: req.originalUrl, data: rows, cart: cartLength > 0 ? cartLength : null, max: max.rows[0].count });
    });
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


module.exports = router;