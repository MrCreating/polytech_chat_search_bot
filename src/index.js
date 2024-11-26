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

    const options = {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Выбрать институт', callback_data: 'profile_select_institute' }],
                [{ text: 'Мои чаты', callback_data: 'profile_chats_list' }],
                [{ text: 'Мои запросы на добавление', callback_data: 'profile_chats_requests' }]
            ]
        }
    };

    return bot.sendMessage(msg.chat.id, findCommand('profile')(user, admin), options);
});

const institutesPerPage = 5;
bot.on('callback_query', async (callbackQuery) => {
    const { data, message, from } = callbackQuery;

    const [callbackQueryId, actionData] = data.includes('$') ? data.split('$') : [null, data];
    const user = findOrRegisterUser(from.id, from.username);
    const institutes = admin.getInstitutes();

    if (actionData === 'profile_select_institute') {
        return sendInstitutePage(message, 1, Math.ceil(institutes.length / institutesPerPage), institutes, 'profile_update', false);
    }
    if (actionData === 'profile_chats_list') {
        return bot.editMessageText('На данный момент Вы не добавляли никаких чатов', {
            chat_id: message.chat.id,
            message_id: message.message_id
        });
    }
    if (actionData === 'profile_chats_requests') {
        return bot.editMessageText('На данный момент у Вас нет нерассмотренных запросов на добавление чатов в список', {
            chat_id: message.chat.id,
            message_id: message.message_id
        });
    }

    const [command, action, instituteId] = actionData.split('_');

    if (command === 'list' && action === 'select') {
        if (instituteId && mainSheet) {
            const institute = admin.getInstitute(instituteId);

            return bot.editMessageText(findCommand('list')(institute.name.toLowerCase(), mainSheet), {
                chat_id: message.chat.id,
                message_id: message.message_id
            });
        } else {
            return bot.editMessageText('Не обновлена главная таблица', {
                chat_id: message.chat.id,
                message_id: message.message_id
            });
        }
    }

    if (command === 'profile' && action === 'update') {
        let replyText = 'Не удалось найти институт';
        if (instituteId) {
            admin.updateUser(user.tg_chat_id, { institute_id: instituteId });
            replyText = 'Институт обновлен.';
        }

        return bot.editMessageText(replyText, {
            chat_id: message.chat.id,
            message_id: message.message_id
        });
    }

    if (command === 'page') {
        const currentPage = parseInt(action, 10);
        const totalPages = Math.ceil(institutes.length / institutesPerPage);
        if (!isNaN(currentPage)) {
            return sendInstitutePage(message, currentPage, totalPages, institutes, callbackQueryId, false); // Передаем исходный callbackQueryId
        }
    }
});

function sendInstitutePage(message, currentPage, totalPages, institutes, callbackQueryId, isNewMessage = false) {
    const startIndex = (currentPage - 1) * institutesPerPage;
    const pageInstitutes = institutes.slice(startIndex, startIndex + institutesPerPage);

    const inlineKeyboard = pageInstitutes.map(institute => ([{
        text: institute.name,
        callback_data: `${callbackQueryId}_${institute.id}` // Сохраняем callbackQueryId
    }]));

    if (totalPages > 1) {
        const paginationButtons = [];
        if (currentPage > 1) {
            paginationButtons.push({
                text: '← Предыдущая',
                callback_data: `${callbackQueryId}$page_${currentPage - 1}` // Добавляем callbackQueryId
            });
        }
        if (currentPage < totalPages) {
            paginationButtons.push({
                text: 'Следующая →',
                callback_data: `${callbackQueryId}$page_${currentPage + 1}` // Добавляем callbackQueryId
            });
        }
        inlineKeyboard.push(paginationButtons);
    }

    const options = {
        reply_markup: {
            inline_keyboard: inlineKeyboard
        }
    };

    if (!isNewMessage) {
        bot.editMessageText('Выберите институт:', {
            chat_id: message.chat.id,
            message_id: message.message_id,
            ...options
        });
    } else {
        bot.sendMessage(message.chat.id, 'Выберите институт:', options);
    }
}

bot.onText(/\/list(?: (.+))?/, (msg, match) => {
    processedCommandsCount++;
    requestedFindChatList++;
    findOrRegisterUser(msg.chat.id, msg.chat.username);

    const institutes = admin.getInstitutes();
    const totalPages = Math.ceil(institutes.length / institutesPerPage);
    const currentPage = 1;

    sendInstitutePage(msg, currentPage, totalPages, institutes, 'list_select', true);
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
