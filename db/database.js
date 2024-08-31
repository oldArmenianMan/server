const db = require('./path/to/your/dbModule');

(async () => {
  const connection = await db.getConnection();
  if (connection) {
    // Выполнение запросов с использованием connection
    try {
      const rows = await connection.query('SELECT * FROM yourTable');
      console.log(rows);
    } catch (err) {
      console.error('Ошибка выполнения запроса', err.message);
    } finally {
      connection.end(); // Закрываем соединение
    }
  }
})();

// const sqlite3 = require('sqlite3').verbose();

// const db = new sqlite3.Database('./db/news.db', (err) => {
//     if (err) {
//       console.error('Error opening database', err.message);
//     } else {
//       console.log('Подключен к бд');
//     }
//   });

//   module.exports = db;
