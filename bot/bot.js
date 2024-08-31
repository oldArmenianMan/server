const { Telegraf } = require('telegraf');
const axios = require('axios');
require('dotenv').config({ path: '../.env' });

const botToken = process.env.BOT_TOKEN; 
const bot = new Telegraf(botToken);

function formatMessage(message)
{
  const regExp = /\*|▪️|🇷🇺|#/g;
  let formatMsg = message.replace(regExp, '');
  return (formatMsg)
}

function extractHashtag(message)
{
  const ger = 10;
  const hashtagPattern = /#[^\s#]+/;
    const match = message.match(hashtagPattern);
    console.log('match: ', match); // Для отладки
    if (match) {
        return match[0];
    } else {
        return 'empty';
    }
}

function formatDateToYYMMDD(isoDate) 
{
  const date = new Date(isoDate);
  const year = date.getFullYear().toString().slice(-2); 
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

bot.command('start', (ctx) => {
  ctx.reply('Привет! Я бот на локальном Express сервере.');
});

// Обработка входящих сообщений
let userMessage = [];

bot.on('text', (ctx) => 
{
  const timestamp = ctx.message.date;
  const messageDate = new Date(timestamp * 1000);
  const stringDate = formatDateToYYMMDD(messageDate);
  userMessage = formatMessage(ctx.message.text);
  let chekHashtag = extractHashtag(userMessage);
  console.log('chekHat: ', chekHashtag);

  switch (chekHashtag)
  {
    case 'empty':
      axios.post('http://localhost:3010/messages', {messages: userMessage})
      .then(response => {
        console.log('success', response.data);
      })
      .catch(error => {
        console.log('error:', error);
      });
      break;
    case '#вызывайволгу':
        axios.post('http://localhost:3010/volga', {messages: userMessage})
      .then(response => {
        console.log('Message with hashtag saved:', response.data)
      })
      .catch(error => {
        console.error('Error saving message with hashtag:', error);
      });
      break;
    case '#этот_день_в_истории':
        axios.post('http://localhost:3010/history', {messages: userMessage, msgDate: stringDate})
      .then(response => {
        console.log('Message with hashtag saved:', response.data)
      })
      .catch(error => {
        console.error('Error saving message with hashtag:', error);
      });
      break;  
    case '#Этот_день_в_истории':
        axios.post('http://localhost:3010/history', {messages: userMessage, msgDate: stringDate})
      .then(response => {
        console.log('Message with hashtag saved:', response.data)
      })
      .catch(error => {
        console.error('Error saving message with hashtag:', error);
      });
      break; 
      default:  console.log('not value');
  }
  ctx.reply(`Вы написали: ${ctx.message.text}`);
});


// Запуск бота через polling
bot.launch().then(() => {
  console.log('Бот успешно запущен через polling');
}).catch((err) => {
  console.error('Ошибка запуска бота:', err);
});