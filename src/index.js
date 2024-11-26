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

loadData(doc).then(data => {
    mainSheet = data;
});

if (!admin.init(bot).start()) {
    console.log('Admin panel starting failed.');
    process.exit(1);
}

bot.onText(/\/form/, (msg, match) => {
    processedCommandsCount++;
    return bot.sendMessage(msg.chat.id, findCommand('form').apply(this));
});

bot.onText(/\/help/, (msg, match) => {
    processedCommandsCount++;
    return bot.sendMessage(msg.chat.id, findCommand('help').apply(this));
});

bot.onText(/\/refresh/, (msg, match) => {
    if (msg.chat.username === adminUserName) {
        bot.sendMessage(msg.chat.id, 'Обновляю...');
        loadData(doc).then(data => {
            mainSheet = data;
            bot.sendMessage(msg.chat.id, 'Обновил!');
        });
    }
});

bot.onText(/\/stats/, (msg, match) => {
    if (msg.chat.username === adminUserName) {
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
    return bot.sendMessage(msg.chat.id, findCommand('start').apply(this));
});

bot.onText(/\/find(?: (.+))?/, (msg, match) => {
    processedCommandsCount++;
    requestedFindChatDirection++;
    let direction = String(match[1]).toLowerCase();

    if (!match[1]) {
        direction = null;
    }

    return bot.sendMessage(msg.chat.id, findCommand('find')(direction, mainSheet))
});

bot.onText(/\/list(?: (.+))?/, (msg, match) => {
    processedCommandsCount++;
    requestedFindChatList++;
    let institute = String(match[1]).toLowerCase();

    if (!match[1]) {
        institute = null;
    }

    return bot.sendMessage(msg.chat.id, findCommand('list')(institute, mainSheet))
});

bot.onText(/\/group(?: (.+))?/, (msg, match) => {
    processedCommandsCount++;
    requestedFindGroups++;
    let direction = String(match[1]).toLowerCase();

    if (!match[1]) {
        direction = null;
    }

    return bot.sendMessage(msg.chat.id, findCommand('group')(direction, mainSheet))
});

console.log('Started!');
