const pg = require('pg');

const pool = new pg.Pool({
  user: process.env.DB_USER,
  host: 'dmark.com.ua',
  database: 'dm',
  password: process.env.DB_PASSWORD,
  port: 5432,
});

module.exports = pool;