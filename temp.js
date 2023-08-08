const { Pool } = require('pg');

// Замените значения на свои
const pool = new Pool({
  user: 'global',
  password: '#Database443',
  host: 'dm.lviv.ua',
  port: 5432,
  database: 'dm',
});

async function addProduct(productData) {
  try {
    const client = await pool.connect();

    const query = `
      INSERT INTO products (
        brand_original,
        brand_translation,
        "type",
        title_original,
        title_translation,
        description,
        pictures,
        volume,
        price,
        price_factor,
        amount,
        weight,
        exists,
        discount
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id
    `;

    const values = [
      productData.brand_original,
      productData.brand_translation,
      productData.type,
      productData.title_original,
      productData.title_translation,
      productData.description,
      productData.pictures,
      productData.volume,
      productData.price,
      productData.price_factor,
      productData.amount,
      productData.weight,
      productData.exists,
      productData.discount,
    ];

    const result = await client.query(query, values);

    client.release();

    console.log('Новая запись добавлена в таблицу "products" с id:', result.rows[0].id);
  } catch (err) {
    console.error('Ошибка при добавлении записи в таблицу "products":', err);
  } finally {
    // Обязательно закройте пул соединений, когда закончите использование
    pool.end();
  }
}

async function updateProduct(id, productData) {
  try {
    const client = await pool.connect();

    const query = `
      UPDATE products
      SET
        brand_original = $2,
        brand_translation = $3,
        "type" = $4,
        title_original = $5,
        title_translation = $6,
        description = $7,
        pictures = $8,
        volume = $9,
        price = $10,
        price_factor = $11,
        amount = $12,
        weight = $13,
        exists = $14,
        discount = $15
      WHERE id = $1
      RETURNING id
    `;

    const values = [
      id,
      productData.brand_original,
      productData.brand_translation,
      productData.type,
      productData.title_original,
      productData.title_translation,
      productData.description,
      productData.pictures,
      productData.volume,
      productData.price,
      productData.price_factor,
      productData.amount,
      productData.weight,
      productData.exists,
      productData.discount,
    ];

    const result = await client.query(query, values);

    client.release();

    console.log('Запись с id:', result.rows[0].id, 'была успешно обновлена в таблице "products"');
  } catch (err) {
    console.error('Ошибка при обновлении записи в таблице "products":', err);
  } finally {
    pool.end();
  }
}

async function addAdmin(email) {
  try {
    const client = await pool.connect();

    const query = `
      UPDATE users SET admin = true WHERE email = $1
    `;

    const values = [email];

    const result = await client.query(query, values);

    client.release();

    console.log('Готово!');
  } catch (err) {
    console.error('Ошибка:', err);
  } finally {
    pool.end();
  }
}

// Пример использования:
const newProduct = {
  brand_original: 'Denkmit',
  brand_translation: 'Денкміт',
  type: 'kitchen',
  title_original: 'Rohrreiniger für Küche & Bad',
  title_translation: "Засіб для чищення труб для кухні та ванної кімнати",
  description: '',
  pictures: '["https://media.dm-static.com/images/f_auto,q_auto,c_fit,h_440,w_500/v1686895157/products/pim/4066447233698-3605964/denkmit-rohrreiniger-fuer-kueche-und-bad", "https://media.dm-static.com/images/f_auto,q_auto,c_fit,h_440,w_500/v1686315568/products/pim/4066447233698-3605965/denkmit-rohrreiniger-fuer-kueche-und-bad", "https://media.dm-static.com/images/f_auto,q_auto,c_fit,h_440,w_500/v1686315568/products/pim/4066447233698-3605963/denkmit-rohrreiniger-fuer-kueche-und-bad"]',
  volume: '1 л',
  price: 1.25,
  price_factor: 35,
  amount: 10,
  weight: 0,
  exists: 1,
  discount: 0,
};

addAdmin('taras778@ukr.net');