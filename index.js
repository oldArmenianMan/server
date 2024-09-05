const express = require('express');
const cors = require('cors');

const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3010;
const mariadb = require('mariadb');
require('dotenv').config();

const options = {
  key: fs.readFileSync(path.join('/etc/letsencrypt/live/xn--b1aahbbaz5a0afbu7i.su', 'privkey.pem')),
  cert: fs.readFileSync(path.join('/etc/letsencrypt/live/xn--b1aahbbaz5a0afbu7i.su', 'fullchain.pem')),
  // Опционально, добавьте цепочку сертификатов, если используется
  // ca: fs.readFileSync('/path/to/chainfile.pem')
};

function getCurrentDateInYYMMDD() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10)
});

let messages = [];
let msgDate;
const app = express();
app.use(cors());
app.use(express.json());


// app.use(bot.webhookCallback(`/bot${botToken}`)); // Используем webhookCallback для обработки обновлений

const getConnection = async () => {
  let conn;
  try {
    conn = await pool.getConnection();
    return conn;
  } catch (err) {
    console.error('Ошибка подключения к базе данных:', err.message);
    throw err;
  }
};

app.post('/volga', async (req, res) => {
  const { messages: newMessages } = req.body;
  const conn = await getConnection();

  try {
    await conn.query('INSERT INTO volga (text) VALUES (?)', [newMessages]);
    messages.unshift(newMessages); // оптимизировать!!!
    console.log(messages);
    res.json({ messages: newMessages });
  } catch (err) {
    console.error('Ошибка вставки данных:', err.message);
    res.status(500).json({success: false, error: 'Ошибка вставки данных'});
  } finally {
    conn.end();
  }
});

app.post('/messages', async (req, res) => 
{
  const { messages: newMessages } = req.body;
  const conn = await getConnection();

  try {
    await conn.query('INSERT INTO list (text) VALUES (?)', [newMessages]);
    messages.unshift(newMessages); // оптимизировать!!!
    console.log(messages);
    res.json({ messages: newMessages });
  } catch (err) {
    console.error('Ошибка вставки данных:', err.message);
    res.status(500).json({success: false, error: 'Ошибка вставки данных'});
  } finally {
    conn.end();
  }
});

app.post('/history', async (req, res) => 
  {
    const { messages: newMessages } = req.body;
    const conn = await getConnection();
  
    try {
      await conn.query('INSERT INTO history (text, date) VALUES (?, ?)', [newMessages, req.body.msgDate]);
      messages.unshift(newMessages); // оптимизировать!!!
      console.log(messages);
      res.json({ messages: newMessages });
    } catch (err) {
      console.error('Ошибка вставки данных:', err.message);
      res.status(500).json({success: false, error: 'Ошибка вставки данных'});
    } finally {
      conn.end();
    }
  });

app.get('/messages', async (req, res) => {
  const conn = await getConnection();

  try {
    const rows = await conn.query('SELECT text FROM list');
    res.json(rows);
  } catch (err) {
    console.error('Ошибка получения данных:', err.message);
    res.status(500).json({ success: false, error: 'Ошибка получения данных' });
  } finally {
    conn.end();
  }
});

app.get('/volga', async (req, res) => {
  const conn = await getConnection();

  try {
    const rows = await conn.query('SELECT text FROM volga');
    res.json(rows);
  } catch (err) {
    console.error('Ошибка получения данных:', err.message);
    res.status(500).json({ success: false, error: 'Ошибка получения данных' });
  } finally {
    conn.end();
  }
});

app.get('/history', async (req, res) => {
  const conn = await getConnection();

  try {
    const rows = await conn.query('SELECT text FROM history');
    res.json(rows);
  } catch (err) {
    console.error('Ошибка получения данных:', err.message);
    res.status(500).json({ success: false, error: 'Ошибка получения данных' });
  } finally {
    conn.end();
  }
});

app.get('/othernews', async (req, res) => {
  const conn = await getConnection();
  const currentDate = getCurrentDateInYYMMDD();
  try {
        const textRows = await conn.query('SELECT text FROM history WHERE date = ?', [currentDate]);
        res.json(textRows);
  } catch (err) {
    console.error('Ошибка получения данных:', err.message);
    res.status(500).json({ success: false, error: 'Ошибка получения данных' });
  } finally {
    conn.end();
  }
});

app.listen(PORT, () => 
{
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});

https.createServer(options, app).listen(8443, () => {
  console.log('HTTPS server running on port 8443');
});

process.on('SIGINT', () => {
  pool.end()
    .then(() => {
      console.log('Пул соединений закрыт.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Ошибка закрытия пула соединений:', err.message);
      process.exit(1);
    });
});