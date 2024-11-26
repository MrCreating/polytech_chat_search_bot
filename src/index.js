console.log('Starting...');
const TelegramBot = require('node-telegram-bot-api');

const { GoogleSpreadsheet } = require("google-spreadsheet");

const token = process.env.BOT_TOKEN;
const adminUserName = process.env.ADMIN_TG_USERNAME;
const spreadSheetId = process.env.SPREADSHEET_ID;

const findCommand = require('./utils/commandFinder');
const loadData = require('./google/loadData');
const auth = require('./google/auth');
const admin = require('./admin/index');

const { Client } = require('pg');

console.log('Connecting to Telegram...');
const bot = new TelegramBot(token, {polling: true});
console.log('Connected!');

console.log('Authenticating to Google...');
const doc = new GoogleSpreadsheet(spreadSheetId, auth());
console.log('Done!');

let mainSheet = null;

// сделал немного статистики себе, ну интересно же посмотреть сколько используют, не бейте :)
let processedCommandsCount = 0;
let requestedFindGroups = 0;
let requestedFindChatList = 0;
let requestedFindChatDirection = 0;

const client = new Client({
    host: 'postgres',
    port: 5432,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB
});

loadData(doc).then(data => {
    mainSheet = data;
});

console.log('Starting admin server...');
if (!admin.init(bot).with(client).start()) {
    console.log('Admin server starting failed.');
    process.exit(1);
}

function findOrRegisterUser(chatId, username) {
    try {
        let user = admin.getUserByTgChatId(chatId);
        if (!user) {
            const userData = {
                tg_chat_id: chatId,
                tg_username: username,
                access_level: 0,
                institute_id: null
            };
            admin.addUser(userData);

            user = admin.getUserByTgChatId(chatId);
        }
        return user;
    } catch (error) {
        return false;
    }
}

bot.onText(/\/form/, (msg, match) => {
    processedCommandsCount++;
    findOrRegisterUser(msg.chat.id, msg.chat.username);
    return bot.sendMessage(msg.chat.id, findCommand('form').apply(this));
});

bot.onText(/\/help/, (msg, match) => {
    processedCommandsCount++;
    findOrRegisterUser(msg.chat.id, msg.chat.username);
    return bot.sendMessage(msg.chat.id, findCommand('help').apply(this));
});

bot.onText(/\/refresh/, (msg, match) => {
    const user = findOrRegisterUser(msg.chat.id, msg.chat.username);

    if (msg.chat.username === adminUserName || user.access_level >= 2) {
        bot.sendMessage(msg.chat.id, 'Обновляю...');
        loadData(doc).then(data => {
            mainSheet = data;
            admin.saveChangesToDatabase();
            bot.sendMessage(msg.chat.id, 'Обновил!');
        });
    }
});

bot.onText(/\/chat/, (msg, match) => {
    const user = findOrRegisterUser(msg.chat.id, msg.chat.username);

    if (msg.chat.username === adminUserName || user.access_level >= 1) {
        bot.sendMessage(msg.chat.id, 'Ваш ID чата: ' + msg.chat.id.toString());
    }
});

bot.onText(/\/stats/, (msg, match) => {
    const user = findOrRegisterUser(msg.chat.id, msg.chat.username);

    if (msg.chat.username === adminUserName || user.access_level >= 2) {
        const resp = `
Обработано команд за эту сессию: ${processedCommandsCount}

Искали свою группу: ${requestedFindGroups}
Искали список чатов: ${requestedFindChatList}
Искали свой чат: ${requestedFindChatDirection}
`;
        return bot.sendMessage(msg.chat.id, resp);
    }
});

bot.onText(/\/start/, (msg, match) => {
    processedCommandsCount++;
    const user = findOrRegisterUser(msg.chat.id, msg.chat.username);
    if (msg.chat.username === adminUserName && user.access_level < 2) {
        admin.updateUser(msg.chat.id, {
            access_level: 2
        });
        bot.sendMessage(msg.chat.id, 'Вы были указаны как владелец бота в .env, выдан 2/2 уровень доступа');
    }

    return bot.sendMessage(msg.chat.id, findCommand('start').apply(this));
});

bot.onText(/\/profile/, (msg, match) => {
    processedCommandsCount++;
    const user = findOrRegisterUser(msg.chat.id, msg.chat.username);
    if (msg.chat.username === adminUserName && user.access_level < 2) {
        admin.updateUser(msg.chat.id, {
            access_level: 2
        });
        bot.sendMessage(msg.chat.id, 'Вы были указаны как владелец бота в .env, выдан 2/2 уровень доступа');
    }

    return bot.sendMessage(msg.chat.id, findCommand('profile')(user, admin));
});

bot.onText(/\/find(?: (.+))?/, (msg, match) => {
    processedCommandsCount++;
    requestedFindChatDirection++;
    findOrRegisterUser(msg.chat.id, msg.chat.username);
    let direction = String(match[1]).toLowerCase();

    if (!match[1]) {
        direction = null;
    }

    return bot.sendMessage(msg.chat.id, findCommand('find')(direction, mainSheet))
});

bot.onText(/\/list(?: (.+))?/, (msg, match) => {
    processedCommandsCount++;
    requestedFindChatList++;
    findOrRegisterUser(msg.chat.id, msg.chat.username);
    let institute = String(match[1]).toLowerCase();

    if (!match[1]) {
        institute = null;
    }

    return bot.sendMessage(msg.chat.id, findCommand('list')(institute, mainSheet))
});

bot.onText(/\/group(?: (.+))?/, (msg, match) => {
    processedCommandsCount++;
    requestedFindGroups++;
    findOrRegisterUser(msg.chat.id, msg.chat.username);
    let direction = String(match[1]).toLowerCase();

    if (!match[1]) {
        direction = null;
    }

    return bot.sendMessage(msg.chat.id, findCommand('group')(direction, mainSheet))
});

console.log('Started!');
