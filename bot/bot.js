const { Telegraf } = require('telegraf');
const axios = require('axios');
const https = require('https');
const { URL } = require('url');
const fetch = require('node-fetch');

require('dotenv').config({ path: '../.env' });
const mariadb = require('mariadb');

const botToken = process.env.BOT_TOKEN;
const VK_GROUP_TOKEN = process.env.VK_TOKEN;
const VK_GROUP_ID = process.env.VK_GROUP_ID;
const APP_TOKEN = process.env.APP_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

async function postToVK(message, videoId) {
  // Создаём URL с прикреплением видео
  const url = `https://api.vk.com/method/wall.post?owner_id=-${VK_GROUP_ID}&message=${encodeURIComponent(message)}&attachments=video${videoId}&access_token=${VK_GROUP_TOKEN}&v=5.131`;
  const response = await fetch(url);
  const data = await response.json();

  if (data.error) {
    console.error('Ошибка отправки в VK по токену группы или подобному:', data.error);
  } else {
    console.log('Сообщение успешно отправлено в VK');
  }
}

async function uploadVideoAndPost(message, videoFile, access_token) {
  const uploadUrlResponse = await fetch(`https://api.vk.com/method/video.save?access_token=${access_token}&v=5.131`);
  const uploadUrlData = await uploadUrlResponse.json();

  if (uploadUrlData.error) {
    console.error('Ошибка получения URL для загрузки видео:', uploadUrlData.error);
    return;
  }

  const uploadUrl = uploadUrlData.response.upload_url;

  const formData = new FormData();
  formData.append('video_file', videoFile); // videoFile — это файл, который вы хотите загрузить

  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    body: formData,
  });
  const uploadData = await uploadResponse.json();

  if (uploadData.error) {
    console.error('Ошибка загрузки видео:', uploadData.error);
    return;
  }

  // Шаг 3: Получаем ID загруженного видео
  const videoId = uploadData.video.id;

  // Шаг 4: Отправляем пост с видео
  await postToVK(message, videoId);
}


async function getRefreshedToken() {
  let refresh_token = await getRefreshToken();
  console.log ('Токен из базы данных (Refresh.refresh)', refresh_token.refresh_token);

  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  const body = {
    'grant_type': 'refresh_token',
    'refresh_token': refresh_token,
    'client_id': CLIENT_ID,
    'device_id': 'e7xmYgvJpCjCOX95ltA32OFeAUSbyI2E4qfx6zGdO6Dw2sAXizb7lahsWmM47H7y1TFycuyVUSNanKnBdJ2AeQ',
    'state': ''
  };
  const url = 'https://id.vk.com/oauth2/auth';

  axios.post(url, body, { headers })
  .then(response => {
    // console.log('Ответ сервера refresh_token:', response.data.refresh_token);
    // console.log('Ответ сервера access_token:', response.data.access_token);
    refresh_token = response.data.refresh_token;
    let access_token = response.data.access_token;
    let values = [access_token, refresh_token];
    console.log('Значения переменных в values: ', values);
    insertTokensInDataBase(values);
  })
  .catch(error => {
    console.error('Ошибка:', error.response ? error.response.data : error.message);
  });
  
}

async function insertTokensInDataBase(values) {
  const conn = await getConnection();
      try {
          await conn.query(`UPDATE tokens SET access_token = ?, refresh_token = ? WHERE id = 1;`, values);
      } catch (err) {
          console.error('Ошибка вставки данных:', err.message);
      } finally {
          conn.end();
      }
}

async function getRefreshToken() {
  const conn = await getConnection();
  try {
    let refresh_token = await conn.query('SELECT refresh_token FROM tokens WHERE id = 1');
    console.log('Полученный рефреш токен из бд: ', refresh_token[0].refresh_token);
    let result = refresh_token[0].refresh_token;
    return result;
  } catch (err) {
      console.error('Ошибка получения рефреш токена:', err.message);
  } finally {
      conn.end();
  }
}

async function getAccessToken() {
  const conn = await getConnection();
  try {
    let access_token = await conn.query('SELECT access_token FROM tokens WHERE id = 1');
    let result = access_token[0].access_token;
    return result;
  } catch (err) {
      console.error('Ошибка получения аксес токена:', err.message);
  } finally {
      conn.end();
  }
}

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
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10)
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

// Получение сообщений из канала Telegram и отправка их в VK

bot.on('channel_post', async (ctx) => {
  const channelPost = ctx.update.channel_post;

  let { messageDate, stringDate, userMessage, checkHashtag, 
    messagePhoto, messageVideo, file_id, entities } = await extractMessageDetails(ctx, channelPost);
  
  getRefreshedToken();
  let access_token = await getAccessToken();
  if (userMessage && (userMessage !== 'Текст или описание отсутствуют')) {
    await uploadVideoAndPost(userMessage, messageVideo, access_token);
  }

  if (await messageIsEmpty(userMessage)) {
      console.log('Медиа файл не содержит текста, поэтому не публикуется');
  } else {
      // console.log(entities);
      if (entities) {
          userMessage = applyFormatting(userMessage, entities);
      }
      await insertDataBasedOnHashtag(checkHashtag, userMessage, messagePhoto, 
        messageVideo, file_id, messageDate, stringDate);
  }
});

async function extractMessageDetails(ctx, channelPost) {
  let file_id, timestamp, stringDate, userMessage, messageDate, checkHashtag;
  let messageVideo, messagePhoto;
  let entities = channelPost.entities ? channelPost.entities : (channelPost.caption_entities ? channelPost.caption_entities : undefined);
  
  const isChannelPost = !ctx.message || typeof ctx.message !== 'object';

  timestamp = isChannelPost ? channelPost.date : ctx.message.date;
  messageDate = new Date(timestamp * 1000);
  stringDate = formatDateToYYMMDD(messageDate);

  userMessage = isChannelPost
      ? (channelPost.text || channelPost.caption || 'Текст или описание отсутствуют')
      : (channelPost.message.text || channelPost.message.caption || 'Текст или описание отсутствуют');
      // console.log('userMessage внутри функции ', userMessage);
  checkHashtag = extractHashtag(userMessage);
  // console.log('chat id: ', channelPost.chat.id);

  if (isChannelPost) {
      ({ file_id, messageVideo, messagePhoto } = await getMediaLinks(channelPost, ctx));
  } else {
      ({ file_id, messageVideo, messagePhoto } = await getMediaLinks(ctx.message, ctx));
  }
  
  return { messageDate, stringDate, userMessage, checkHashtag, messagePhoto, messageVideo, file_id, entities};
}

async function getMediaLinks(message, ctx) {
  let file_id, messageVideo, messagePhoto;

  if (message.video) {
      const fileId = message.video.file_id;
      file_id = fileId;
      try {
          messageVideo = await ctx.telegram.getFileLink(fileId);
          // console.log('messageVideo is', messageVideo);
      } catch (error) {
          messageVideo = 'Error';
          console.error('Error getting file link:', error);
      }
  } else {
      console.log("Video not found");
  }

  if (message.photo) {
      const fileId = message.photo[message.photo.length - 1].file_id;
      file_id = fileId;
      try {
          messagePhoto = await ctx.telegram.getFileLink(fileId);
      } catch (error) {
          console.error('Error getting file link:', error);
      }
  } else {
      console.log("Image not found");
  }

  return { file_id, messageVideo, messagePhoto };
}

async function insertDataBasedOnHashtag(checkHashtag, userMessage, messagePhoto, messageVideo, file_id, messageDate, stringDate) {
  const insertData = async (table, values) => {
      const conn = await getConnection();
      try {
          await conn.query(`INSERT INTO ${table} (text, linkP, linkV, file_id, date) VALUES (?, ?, ?, ?, ?)`, values);
      } catch (err) {
          console.error('Ошибка вставки данных:', err.message);
      } finally {
          conn.end();
      }
  };

  switch (checkHashtag) {
      case 'empty':
      case '#бесстрашные':
          await insertData('list', [formatMessage(userMessage), messagePhoto, messageVideo, file_id, messageDate]);
          break;
      case '#вызывайволгу':
          await insertData('volga', [formatMessage(userMessage), messagePhoto, messageVideo, file_id, messageDate]);
          break;
      case '#этот_день_в_истории':
      case '#Этот_день_в_истории':
          await insertData('history', [formatMessage(userMessage), messagePhoto, messageVideo, file_id, stringDate]);
          break;
      default:
          console.log('not value');
  }
}


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
async function messageIsEmpty(message)
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
function applyFormatting(text, entitiesT) {
  let entities = Array.isArray(entitiesT) && entitiesT[0]?.type ? entitiesT : entitiesT[0];
  entities.sort((a, b) => a.offset - b.offset);

  let formatText = '';
  let memorySubstr = '';

  for (let i = 0; i < entities.length; i++) {
      const { offset, length, type } = entities[i];
      const substr = text.substring(offset, offset + length);

      if (i === 0) {
          if (offset === 0) {
              formatText += addStyle(substr, type);
          } else {
              formatText += text.substring(0, offset) + addStyle(substr, type);
          }
      } else {
          if (offset === entities[i - 1].offset) {
              formatText = formatText.replace(memorySubstr, addStyle(memorySubstr, type));
          } else {
              if (offset > entities[i - 1].offset + entities[i - 1].length) {
                  formatText += text.substring(entities[i - 1].offset + entities[i - 1].length, offset);
              }
              formatText += addStyle(substr, type);
          }
      }
      memorySubstr = substr; // обновляем память с последним подстрокой
  }

  return formatText.replace(/\n/g, '<br>');
}
function addStyle(substr, styleType) {
  switch (styleType) {
      case 'bold': return `<strong>${substr}</strong>`;
      case 'italic': return `<em>${substr}</em>`;
      case 'underline': return `<u>${substr}</u>`;
      case 'strikethrough': return `<s>${substr}</s>`;
      case 'blockquote': return `<blockquote>${substr}</blockquote>`;
      case 'mention': return `<a href="#">${substr}</a>`;
      default: return substr;
  }
}

bot.launch().then(() => {
  // console.log('Бот успешно запущен через polling');
}).catch((err) => {
  console.error('Ошибка запуска бота:', err);
});
