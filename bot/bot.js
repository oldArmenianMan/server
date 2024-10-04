const { Telegraf } = require('telegraf');
const axios = require('axios');

require('dotenv').config({ path: '../.env' });
const mariadb = require('mariadb');

const botToken = process.env.BOT_TOKEN;
const bot = new Telegraf(botToken, {
  telegram: {
    apiRoot: 'http://localhost:8081'
  }
});

const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 1000)
});

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

function formatMessage(message) {
  const regExp = /\*|▪️|🇷🇺|#этот_день_в_истории|#Этот_день_в_истории|#вызывайволгу|#бесстрашные|#Бесстрашные|Северный Ветер|🏳️‍🌈|🏳️‍⚧️|🇺🇳|🇦🇫|🇦🇽|🇦🇱|🇩🇿|🇦🇸|🇦🇩|🇦🇴|🇦🇮|🇦🇶|🇦🇬|🇦🇷|🇦🇲|🇦🇼|🇦🇺|🇦🇹🇦🇿🇧🇸🇧🇭🇧🇩🇧🇧🇧🇾🇧🇪🇧🇿|🇧🇯|🇧🇲|🇧🇹|🇧🇴|🇧🇦|🇧🇼|🇧🇷|🇻🇬|🇧🇳|🇧🇬|🇧🇫|🇧🇮|🇰🇭|🇨🇲|🇨🇦|🇮🇨|🇨🇻|🇧🇶|🇰🇾|🇨🇫|🇹🇩|🇮🇴|🇨🇱|🇨🇳|🇨🇽|🇨🇨|🇨🇴|🇰🇲|🇨🇬|🇨🇩|🇨🇰|🇨🇷|🇨🇮|🇭🇷|🇨🇺|🇨🇼|🇨🇾|🇨🇿|🇩🇰|🇩🇯|🇩🇲|🇩🇴|🇪🇨|🇪🇬|🇸🇻|🇬🇶|🇪🇷|🇪🇪|🇸🇿|🇪🇹|🇪🇺|🇫🇰|🇫🇴|🇫🇯|🇫🇮|🇫🇷|🇬🇫|🇵🇫|🇹🇫|🇬🇦|🇬🇲|🇬🇪|🇩🇪|🇬🇭|🇬🇮|🇬🇷|🇬🇱|🇬🇩|🇬🇵|🇬🇺|🇬🇹|🇬🇬|🇬🇳|🇬🇼|🇬🇾|🇭🇹|🇭🇳|🇭🇰|🇭🇺|🇮🇸|🇮🇳|🇮🇩|🇮🇷|🇮🇶|🇮🇪|🇮🇲|🇮🇱|🇮🇹|🇯🇲|🇯🇵|🎌|🇯🇪|🇯🇴|🇰🇿|🇰🇪|🇰🇮|🇽🇰|🇰🇼|🇰🇬|🇱🇦|🇱🇻|🇱🇧|🇱🇸|🇱🇷|🇱🇾|🇱🇮|🇱🇹|🇱🇺|🇲🇴|🇲🇬|🇲🇼|🇲🇾|🇲🇻|🇲🇱|🇲🇹|🇲🇭|🇲🇶|🇲🇷|🇲🇺|🇾🇹|🇲🇽|🇫🇲|🇲🇩|🇲🇨|🇲🇳|🇲🇪|🇲🇸|🇲🇦|🇲🇿|🇲🇲|🇳🇦|🇳🇷|🇳🇵|🇳🇱|🇳🇨|🇳🇿|🇳🇮|🇳🇪|🇳🇬|🇳🇺|🇳🇫|🇰🇵|🇲🇰|🇲🇵|🇳🇴|🇴🇲|🇵🇰|🇵🇼|🇵🇸|🇵🇦|🇵🇬|🇵🇾|🇵🇪|🇵🇭|🇵🇳|🇵🇱|🇵🇹|🇵🇷|🇶🇦|🇷🇪|🇷🇴|🇷🇺|🇷🇼|🇼🇸|🇸🇲|🇸🇹|🇸🇦|🇸🇳|🇷🇸|🇸🇨|🇸🇱|🇸🇬|🇸🇽|🇸🇰|🇸🇮|🇬🇸|🇸🇧|🇸🇴|🇿🇦|🇰🇷|🇸🇸|🇪🇸|🇱🇰|🇧🇱|🇸🇭|🇰🇳|🇱🇨|🇵🇲|🇻🇨|🇸🇩|🇸🇷|🇸🇪|🇨🇭|🇸🇾|🇹🇼|🇹🇯|🇹🇿|🇹🇭|🇹🇱|🇹🇬|🇹🇰|🇹🇴|🇹🇹|🇹🇳|🇹🇷|🇹🇲|🇹🇨|🇹🇻|🇺🇬|🇺🇦|🇦🇪|🇬🇧|🏴󠁧󠁢󠁥󠁮󠁧󠁿|🏴󠁧󠁢󠁳󠁣󠁴󠁿|🏴󠁧󠁢󠁷󠁬󠁳󠁿|🇺🇸|🇺🇾|🇻🇮|🇺🇿|🇻🇺|🇻🇦|🇻🇪|🇻🇳|🇼🇫|🇪🇭|🇾🇪|🇿🇲|🇿🇼/g;
  let formatMsg = message.replace(regExp, '');
      return formatMsg;
}
function extractHashtag(message) {
    const hashtagPattern = /#[^\s#]+/;
    const match = message.match(hashtagPattern);
    if (match) {
      return match[0];
    } else {
      return 'empty';
    }
  }
function messageIsEmpty(message)
{
  const regExp = /Текст или описание отсутствуют/;
  const match = message.match(regExp);
  if (match) {
    return true
  }
  else {
    return false
  }
}

function formatDateToYYMMDD(isoDate) {
  const date = new Date(isoDate);
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function applyFormatting(text, entitiesT)
{
  let substr;
  let styleType;
  let formatText = '';
  let freeString;
  let memorySubstr;
  let entities;
  if (entitiesT[0] === 'object')
  {
    entities = entitiesT[0];
  }
  else {entities=entitiesT}
  entities.sort((a, b) => a.offset - b.offset);
  for (let i = 0; i < entities.length; i++)
  {
    if ((entities[i].offset == 0) && (i == 0) )
    {
      substr = text.substring(entities[i].offset, entities[i].offset + entities[i].length);
      styleType = entities[i].type;
      substr = addStyle(substr, styleType);
      formatText += substr;
      memorySubstr = substr;
    }
    
    else if ((entities[i].offset > 0) && (i == 0))
    {
      styleType = entities[i].type;
      freeString = text.substring(0, entities[i].offset - 1);
      formatText += freeString;
      substr = text.substring(entities[i].offset, entities[i].offset + entities[i].length);
      substr = addStyle(substr, styleType);
      formatText += substr;
      memorySubstr = substr;
    }
    else if (entities[i].offset == entities[i - 1].offset)
      {
        styleType = entities[i].type;
        formatText = formatText.replace(memorySubstr, '');
        substr = addStyle(memorySubstr, styleType);
        memorySubstr = substr;
        formatText += substr;
      }
    else if ((entities[i].offset > 0) && (i > 0))
    {
      if ((entities[i].offset - (entities[i - 1].offset + entities[i - 1].length)) > 1)
      {
        freeString = text.substring((entities[i - 1].offset + entities[i - 1].length), entities[i].offset);
        formatText += freeString;
      }
      substr = text.substring(entities[i].offset, entities[i].offset + entities[i].length);
      styleType = entities[i].type;
      substr = addStyle(substr, styleType);
      memorySubstr = substr;
      formatText += substr;
    }
  }
  function addStyle (substr, styleType)
  {
    switch (styleType) {
      case 'bold': 
        substr = '<strong>' + substr + '</strong>';
        break;
      case 'italic':
        substr = '<em>' + substr +'</em>';
        break;
      case 'underline':
        substr = '<u>' + substr +'</u>';
        break;
      case 'strikethrough':
        substr = '<s>' + substr + '</s>';
        break;
      case 'blockquote':
        substr = '<blockquote>' + substr + '</blockquote>';
        break;
      case 'mention':
        substr = '<a href="#">' + substr + '</a>'; 
        break;
      default:
        substr = substr; 
    }
    return substr;
  }
  return formatText.replace(/\n/g, '<br>')
}

const checkLink = async (bot) => {
  const conn = await getConnection();
  try {
    const filesLink = await conn.query('SELECT file_id, linkP FROM list WHERE file_id IS NOT NULL');
    for (const link of filesLink) {
      try {
        const newLink = await bot.telegram.getFileLink(link.file_id);
        const response = await fetch(newLink);
        if (response.status === 404) {
          await conn.query('UPDATE list SET linkP = ? WHERE file_id = ?', [newLink, link.file_id]);
        }
      } catch (error) {
        console.error(`Error fetching or updating link for file_id ${link.file_id}:`, error)
      }
    }
  } catch (error) {
    console.error('Error querying the database:', error);
  } finally {
    conn.end();
  }
}


bot.on('channel_post', async (ctx) => {
  let file_id;
  let timestamp;
  let stringDate;
  let userMessage;
  let messageDate;
  let checkHashtag;
  let messageVideo;
  let messagePhoto;
  let entities = undefined;
  const channelPost = ctx.update.channel_post;

  if (!ctx.message || typeof ctx.message !== 'object') {
    console.error('Отсутствует message:', ctx.message);
    timestamp = channelPost.date;
    entities = channelPost.entities ? channelPost.entities : (channelPost.caption_entities ? channelPost.caption_entities : undefined);
    messageDate = new Date(timestamp * 1000);
    stringDate = formatDateToYYMMDD(messageDate);
    userMessage = ctx.text ? ctx.text : (ctx.caption ? ctx.caption : 'Текст или описание отсутствуют');
    checkHashtag = extractHashtag(userMessage);
    console.log("Тестовое сообщение",userMessage);
    console.log('chat id: ', channelPost.chat.id);
    
    if (channelPost.video) {
      const fileId =  await channelPost.video.file_id;
      file_id = fileId;
      try {
        messageVideo = await ctx.telegram.getFileLink(fileId);
        console.log('messageVideo is', messageVideo);
      } catch (error) {
        messageVideo = 'Error';
        console.error('Error getting file link:', error);
      }
    } else {console.log("Video not found")};

    if (channelPost.photo) {
      const fileId = await channelPost.photo[channelPost.photo.length - 1].file_id;
      file_id = fileId;
      try {
        messagePhoto = await ctx.telegram.getFileLink(fileId);
      } catch (error) {
        console.error('Error getting file link:', error);
      }
    } else {console.log("Image not found")};
  } else 
  {
      timestamp = ctx.message.date;
      messageDate = new Date(timestamp * 1000);
      stringDate = formatDateToYYMMDD(messageDate);
      entities = ctx.message.entities ? ctx.message.entities : (ctx.message.caption_entities ? ctx.message.caption_entities : undefined);
      userMessage = ctx.message.text ? ctx.message.text : (ctx.message.caption ? ctx.message.caption : 'Текст или описание отсутствуют');
      checkHashtag = extractHashtag(userMessage);
    if (ctx.message.video) {
      const fileId = ctx.message.video.file_id;
      file_id = fileId;
      try {
        messageVideo = ctx.telegram.getFileLink(fileId);
      } catch (error) {
        console.error('Error getting file link:', error);
      }
    } else {console.log("Video not found")};

    if (ctx.message.photo) {
      const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
      file_id = fileId;
      try {
        messagePhoto = ctx.telegram.getFileLink(fileId);
      } catch (error) {
        console.error('Error getting file link:', error);
      }
    } else {console.log("Image not found")};
  }

  console.log('Channel_Post is ', channelPost);
  if (messageIsEmpty(userMessage))
  {
    console.log(userMessage)
    console.log('Медиа файл не содержит текста, поэтому не публикуется');
  } 
  else {
    console.log(entities);
    if (entities != undefined)
    {
      userMessage = applyFormatting(userMessage, entities);
    };
    switch (checkHashtag) {
        case 'empty':
              const conn = await getConnection();
              try {
                await conn.query('INSERT INTO list (text, linkP, linkV, file_id, date) VALUES (?, ?, ?, ?, ?)', [formatMessage(userMessage), messagePhoto, messageVideo, file_id, messageDate]);
              } catch (err) {
                console.error('Ошибка вставки данных:', err.message);
              } finally {
                conn.end();
              }          
          break;
        case '#вызывайволгу':
          const conn2 = await getConnection();
          try {
            await conn2.query('INSERT INTO volga (text, linkP, linkV, file_id, date) VALUES (?, ?, ?, ?, ?)', [formatMessage(userMessage), messagePhoto, messageVideo, file_id, messageDate]);
          } catch (err) {
            console.error('Ошибка вставки данных:', err.message);
          } finally {
            conn2.end();
          }
          break;
        case '#этот_день_в_истории':
          const conn3 = await getConnection();
          try {
            await conn3.query('INSERT INTO history (text, linkP, date, file_id) VALUES (?, ?, ?, ?)', [formatMessage(userMessage), messagePhoto, stringDate, file_id]);
          } catch (err) {
            console.error('Ошибка вставки данных:', err.message);
          } finally {
            conn3.end();
          }
          break;
        case '#Этот_день_в_истории':
          const conn4 = await getConnection();
          try {
            await conn4.query('INSERT INTO history (text, linkP, date, file_id) VALUES (?, ?, ?, ?)', [formatMessage(userMessage), messagePhoto, stringDate, file_id]);
          } catch (err) {
            console.error('Ошибка вставки данных:', err.message);
          } finally {
            conn4.end();
          }
          break;
          case '#бесстрашные':
                const conn5 = await getConnection();
                try {
                  await conn5.query('INSERT INTO list (text, linkP, linkV, file_id, date) VALUES (?, ?, ?, ?, ?)', [formatMessage(userMessage), messagePhoto, messageVideo, file_id, messageDate]);
                } catch (err) {
                  console.error('Ошибка вставки данных:', err.message);
                } finally {
                  conn5.end();
                }
              
          break;
        default:
          console.log('not value');
      }
  }
  // checkLink(bot);  
});

bot.launch().then(() => {
  console.log('Бот успешно запущен через polling');
}).catch((err) => {
  console.error('Ошибка запуска бота:', err);
});
