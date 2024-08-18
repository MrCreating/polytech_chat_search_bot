console.log('Starting...');
const TelegramBot = require('node-telegram-bot-api');

const { GoogleSpreadsheet } = require("google-spreadsheet");

const token = process.env.BOT_TOKEN;
const spreadSheetId = process.env.SPREADSHEET_ID;

const findCommand = require('./utils/commandFinder');
const auth = require('./google/auth');

const bot = new TelegramBot(token, {polling: true});
const doc = new GoogleSpreadsheet(spreadSheetId, auth())

console.log('Loading table...');
(async function () {
    await doc.loadInfo();
    console.log('Loaded!');
})();

bot.onText(/\/form/, (msg, match) => {
    return bot.sendMessage(msg.chat.id, findCommand('form').apply(this));
});

bot.onText(/\/help/, (msg, match) => {
    return bot.sendMessage(msg.chat.id, findCommand('help').apply(this));
});

bot.onText(/\/start/, (msg, match) => {
    return bot.sendMessage(msg.chat.id, findCommand('start').apply(this));
});

bot.onText(/\/find (.+)/, (msg, match) => {
    const direction = String(match[1]).toLowerCase();

    return bot.sendMessage(msg.chat.id, findCommand('find')(direction, googleSheetData))
});

bot.onText(/\/list (.+)/, (msg, match) => {
    const institute = String(match[1]).toLowerCase();

    bot.sendMessage(msg.chat.id, findCommand('list')(institute, googleSheetData))
});

console.log('Started!');
