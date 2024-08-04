const express = require('express');
const router = express.Router();


router.get('/terms', (req, res) => {
    if (!req.originalUrl.endsWith('/')) return res.redirect(req.originalUrl + '/');

    if (req.cookies.cart) {
        cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
    } else {
        cartLength = 0;
    }

    res.render('terms', { user: (req.session.isAuthenticated) ? true : false, url: req.path, cart: cartLength > 0 ? cartLength : null });
});

router.get('/privacy/', (req, res) => {
    if (!req.originalUrl.endsWith('/')) return res.redirect(req.originalUrl + '/');

    if (req.cookies.cart) {
        cartLength = Object.keys(JSON.parse(req.cookies.cart).items).length;
    } else {
        cartLength = 0;
    }

    res.render('privacy', { user: (req.session.isAuthenticated) ? true : false, url: req.path, cart: cartLength > 0 ? cartLength : null });
});


module.exports = router;