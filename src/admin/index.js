const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const generateUniqueId = require('../utils/generateUniqueId');
const mime = require('mime-types');
const fs = require('fs');

let currentBotObject;

const app = express();
const port = parseInt(process.env.ADMIN_PANEL_PORT, 10);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

let authRequests = {};
let adminSessions = {};

const checkAuth = (req, res, next) => {
    const sessionId = req.cookies['sessionId'];

    if (!sessionId || !adminSessions[sessionId]) {
        return res.redirect('/login');
    }

    next();
};

const checkNotAuth = (req, res, next) => {
    const sessionId = req.cookies['sessionId'];

    if (sessionId && adminSessions[sessionId]) {
        return res.redirect('/admin/dashboard'); // Редирект на админку, если уже авторизован
    }

    next(); // Если не авторизован, продолжаем обработку запроса
};

app.post('/api/auth-request', (req, res) => {
    const requestId = generateUniqueId();
    authRequests[requestId] = { approved: null, userId: null };

    if (currentBotObject) {
        currentBotObject.sendMessage(
            process.env.ADMIN_CHAT_ID,
            `Получен новый запрос на авторизацию в админ-панели: ${requestId}\n\nДля подтверждения запроса нажмите на кнопку ниже:`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {text: 'Одобрить', callback_data: `approve_${requestId}`},
                            {text: 'Отклонить', callback_data: `reject_${requestId}`},
                        ],
                    ],
                },
            }
        );
     }

    res.json({ id: requestId });
});

app.get('/api/auth-state-check', (req, res) => {
    const requestId = req.query.requestId; // Получаем requestId из query parameters

    if (!requestId || !authRequests[requestId]) {
        return res.status(400).json({ error: 'Не передан id авторизации' });
    }

    const requestStatus = authRequests[requestId].approved;

    res.json({ requestId: requestId, status: requestStatus });
});

app.post('/api/save-session', (req, res) => {
    const { requestId } = req.body;

    // Проверяем наличие requestId
    if (!requestId || !authRequests[requestId]) {
        return res.status(400).json({ success: false, message: 'Invalid or missing requestId' });
    }

    const authRequest = authRequests[requestId];

    if (authRequest.approved !== true) {
        return res.status(403).json({ success: false, message: 'Authorization request not approved' });
    }

    const sessionId = generateUniqueId();

    adminSessions[sessionId] = {
        userId: authRequest.userId,
        chatId: authRequest.chatId,
    };

    res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.BOT_MODE === 'prod',
        maxAge: 24 * 60 * 60 * 1000,
    });

    delete authRequests[requestId];

    return res.json({ success: true, sessionId: sessionId });
});

app.get('/api/logout', checkAuth, (req, res) => {
    const sessionId = req.cookies['sessionId'];

    if (!sessionId || !adminSessions[sessionId]) {
        return res.status(401).json({ error: 'Пользователь не авторизован' });
    }

    delete adminSessions[sessionId];

    return res.redirect('/');
});

app.get('/public/*', (req, res) => {
    const filePath = path.join(__dirname, 'public', req.params[0]);

    return fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            return res.status(404).send('404 - File Not Found');
        }

        const contentType = mime.lookup(filePath);

        if (contentType) {
            res.setHeader('Content-Type', contentType.toString());
        } else {
            res.setHeader('Content-Type', 'application/octet-stream');
        }

        res.status(200).sendFile(filePath);
    });
});

app.get('/login', checkNotAuth, (req, res) => {
    return res.render('layouts/main', {title: "Login", view: "login"});
});

app.get('/logout', checkAuth, (req, res) => {
    return res.render('layouts/main', {title: "Log out", view: "logout"});
});

app.get('/api/get-user-state', (req, res) => {
    const sessionId = req.cookies['sessionId'];

    if (!sessionId || !adminSessions[sessionId]) {
        return res.status(401).json({ error: 'Пользователь не авторизован' });
    }

    const { userId, chatId } = adminSessions[sessionId];

    res.json({ username: userId, tgChatId: chatId, tgUserId: userId });
});

app.get('/admin/section/:section', checkAuth, (req, res) => {
    const section = req.params.section;

    if (['dashboard'].includes(section)) {
        return res.render(`templates/sections/${section}`);
    }

    res.status(404).send('Раздел не найден');
});

app.get('/admin/dashboard', checkAuth, (req, res) => {
    res.render('layouts/dashboard', {title: 'Admin Dashboard', view: "dashboard"});
});

app.get('/', (req, res) => {
    const sessionId = req.cookies['sessionId'];

    if (sessionId && adminSessions[sessionId]) {
        return res.redirect('/admin/dashboard');
    }

    return res.redirect('/login');
});

function approveAuthRequest (requestId, tgChatId, tgUserId) {
    if (!authRequests[requestId]) {
        return;
    }

    authRequests[requestId].approved = true;
    authRequests[requestId].chatId = tgChatId;
    authRequests[requestId].userId = tgUserId;
}

function rejectAuthRequest (requestId) {
    if (!authRequests[requestId]) {
        return;
    }

    authRequests[requestId].approved = false;
}

module.exports = {
    init: function (bot) {
        currentBotObject = bot;

        currentBotObject.on('callback_query', (callbackQuery) => {
            const { data, message } = callbackQuery;
            const [action, requestId] = data.split('_');

            if (message.chat.username !== process.env.ADMIN_TG_USERNAME) {
                return;
            }

            currentBotObject.answerCallbackQuery(callbackQuery.id).then(res => {
                let answerText = action === 'approve' ? `✅ Запрос на авторизацию ${requestId} принят.` : `❌ Запрос на авторизацию ${requestId} отклонён.`;

                if (action === 'approve') {
                    approveAuthRequest(requestId, message.chat.id, message.chat.username)
                } else {
                    rejectAuthRequest(requestId)
                }

                if (!authRequests[requestId]) {
                    answerText = 'Данный запрос уже не актуален';
                }

                currentBotObject.editMessageText(answerText, {
                    chat_id: message.chat.id,
                    message_id: message.message_id
                })
            });
        });

        return this;
    },
    start: function () {
        app.listen(port, () => {
            console.log(`Admin server started and running at ${port} port`);
        });
        return true;
    }
}
