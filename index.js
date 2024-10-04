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

app.use('/telegram-bot-api', express.static(path.join(__dirname, '../../telegram-bot-api')));

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
    await conn.query('INSERT INTO volga (textlinkP, linkV) VALUES (?, ?, ?)', [newMessages, req.body.photoUrl, req.body,videoUrl]);
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
    await conn.query('INSERT INTO list (text, linkP, linkV) VALUES (?, ?, ?)', [newMessages, req.body.photoUrl, req.body,videoUrl]);
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
      await conn.query('INSERT INTO history (text, date, linkP) VALUES (?, ?, ?)', [newMessages, req.body.msgDate, req.body.photoUrl]);
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
    const [text, photo, video, date] = await Promise.all([
      conn.query('SELECT text FROM list ORDER BY id DESC'),
      conn.query('SELECT linkP FROM list ORDER BY id DESC'),
      conn.query('SELECT linkV FROM list ORDER BY id DESC'),
      conn.query('SELECT date FROM list ORDER BY id DESC')
    ]);

    const resp = [text, photo, video, date]

    res.json(resp);
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
    const [text, photo, video, date] = await Promise.all([
      conn.query('SELECT text FROM volga ORDER BY id DESC'),
      conn.query('SELECT linkP FROM volga ORDER BY id DESC'),
      conn.query('SELECT linkV FROM volga ORDER BY id DESC'),
      conn.query('SELECT date FROM volga ORDER BY id DESC')
    ]);
    const resp = [text, photo, video, date]
    res.json(resp);
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
    const [text, photo] = await Promise.all([
      conn.query('SELECT text FROM history ORDER BY id DESC'),
      conn.query('SELECT linkP FROM history ORDER BY id DESC'),
    ]);
    const resp = [text, photo]
    res.json(resp);
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
        const text = await conn.query('SELECT text FROM history WHERE date = ?', [currentDate]);
        res.json(text);
        console.log("Дата",currentDate);
  } catch (err) {
    console.error('Ошибка получения данных:', err.message);
    res.status(500).json({ success: false, error: 'Ошибка получения данных' });
  } finally {
    conn.end();
  }
});

app.get('/files', async(req, res) => {
  const fs = require('fs');
  const files = fs.readdirSync(path.join(__dirname, '../frontend/src/public'));
  res.json(files);
})

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