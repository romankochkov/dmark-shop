const fs = require('fs');
const ini = require('ini');

const config = ini.parse(fs.readFileSync('exchange.ini', 'utf-8'));
config.EURO_COEFFICIENT = 42.15;
fs.writeFileSync('exchange.ini', ini.stringify(config), 'utf-8');