console.log('Starting...');
const TelegramBot = require('node-telegram-bot-api');

const { GoogleSpreadsheet } = require("google-spreadsheet");

const token = process.env.BOT_TOKEN;
const adminUserName = process.env.ADMIN_TG_USERNAME;
const spreadSheetId = process.env.SPREADSHEET_ID;

const findCommand = require('./utils/commandFinder');
const loadData = require('./google/loadData.js');
const auth = require('./google/auth');

const bot = new TelegramBot(token, {polling: true});
const doc = new GoogleSpreadsheet(spreadSheetId, auth())

let mainSheet = null;
let processedCommandsCount = 0;

loadData(doc).then(data => {
    mainSheet = data;
});

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
        return bot.sendMessage(msg.chat.id, `Обработано команд за эту сессию: ${processedCommandsCount}`);
    }
});

bot.onText(/\/start/, (msg, match) => {
    processedCommandsCount++;
    return bot.sendMessage(msg.chat.id, findCommand('start').apply(this));
});

bot.onText(/\/find(?: (.+))?/, (msg, match) => {
    processedCommandsCount++;
    let direction = String(match[1]).toLowerCase();

    if (!match[1]) {
        direction = null;
    }

    return bot.sendMessage(msg.chat.id, findCommand('find')(direction, mainSheet))
});

bot.onText(/\/list(?: (.+))?/, (msg, match) => {
    processedCommandsCount++;
    let institute = String(match[1]).toLowerCase();

    if (!match[1]) {
        institute = null;
    }

    return bot.sendMessage(msg.chat.id, findCommand('list')(institute, mainSheet))
});

console.log('Started!');
