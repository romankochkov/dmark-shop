/*const fs = require('fs');
const ini = require('ini');

const config = ini.parse(fs.readFileSync('exchange.ini', 'utf-8'));
config.EURO_COEFFICIENT = 42.15;
fs.writeFileSync('exchange.ini', ini.stringify(config), 'utf-8');*/

const { Client } = require('pg');

// Настройки подключения к базе данных
const client = new Client({
    user: 'global',
    host: 'dmark.com.ua',
    database: 'dm',
    password: '#Database443',
    port: 5432,
});

async function updatePictures() {
    try {
        // Подключаемся к базе данных
        await client.connect();

        // Получаем все записи из таблицы products
        const res = await client.query('SELECT id, pictures FROM products;');

        for (let row of res.rows) {
            try {
                // Парсим поле pictures как JSON
                let picturesArray = JSON.parse(row.pictures);

                // Проверяем, является ли поле pictures массивом
                if (Array.isArray(picturesArray)) {
                    // Обрабатываем массив с картинками
                    let updatedPicturesArray = picturesArray.map(url => {
                        // Если в URL содержится dm.lviv.ua, заменяем на dmark.com.ua
                        if (url.includes('dm.lviv.ua')) {
                            return url.replace('dm.lviv.ua', 'dmark.com.ua');
                        }
                        return url;
                    });

                    // Если массив изменился, обновляем запись в базе данных
                    if (JSON.stringify(picturesArray) !== JSON.stringify(updatedPicturesArray)) {
                        // Преобразуем массив обратно в JSON строку
                        const updatedPictures = JSON.stringify(updatedPicturesArray);
                        await client.query('UPDATE products SET pictures = $1 WHERE id = $2', [updatedPictures, row.id]);
                        console.log(`Updated pictures for product ID ${row.id}`);
                    }
                } else {
                    console.log(`Skipping product ID ${row.id}: pictures field is not an array`);
                }
            } catch (parseError) {
                console.log(`Error parsing pictures for product ID ${row.id}:`, parseError);
            }
        }

        console.log('All applicable records have been updated.');
    } catch (err) {
        console.error('Error updating pictures:', err.stack);
    } finally {
        // Закрываем подключение к базе данных
        await client.end();
    }
}

// Запускаем функцию
updatePictures();