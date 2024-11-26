const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const generateUniqueId = require('../utils/generateUniqueId');
const mime = require('mime-types');
const fs = require('fs');
const migrate = require('../database/migrate');

let currentBotObject;
let currentDatabaseConnection;

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

let authRequests = {};
let adminSessions = {};

const users = {};
const institutes = {};

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
    const { telegramUsername } = req.body;

    if (!telegramUsername) {
        return res.status(400).json({ error: 'Никнейм Telegram обязателен' });
    }

    let user = module.exports.getUserByTgUsername(telegramUsername);
    if (!user) {
        return res.status(400).json({ error: 'Пользователь не найден в боте' });
    }

    if (user.access_level <= 0) {
        return res.status(400).json({ error: 'У пользователя нет прав администратора' });
    }

    const requestId = generateUniqueId();
    authRequests[requestId] = { approved: null, userId: user.tg_username, chatId: user.tg_chat_id };

    if (currentBotObject) {
        currentBotObject.sendMessage(
            user.tg_chat_id,
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

app.post('/api/delete-user', checkAuth, function (req, res) {
    const user = module.exports.getUserByTgChatId(adminSessions[req.cookies['sessionId']].chatId);

    const { tgChatId } = req.body;

    if (user.access_level < 2) {
        return res.status(400).json({error: 'Недостаточно прав для данного действия'})
    }
    if (parseInt(user.tg_chat_id) === parseInt(tgChatId)) {
        return res.status(400).json({error: 'Нельзя удалить самого себя'})
    }

    module.exports.deleteUserByTgChatId(user.tg_chat_id);

    return res.status(200).json({success: true});
});

app.post('/api/delete-institute', checkAuth, function (req, res) {
    const { instituteId } = req.body;

    const institute = module.exports.getInstitute(instituteId);
    if (!institute) {
        return res.status(404).json({error: 'Институт не найден'});
    }

    module.exports.deleteInstitute(institute.id);

    return res.status(200).json({success: true});
});

app.post('/api/update-user', checkAuth, function (req, res) {
    const user = module.exports.getUserByTgChatId(adminSessions[req.cookies['sessionId']].chatId);

    if (user.access_level < 2) {
        return res.status(400).json({error: 'Недостаточно прав для данного действия'})
    }

    const { tgChatId, instituteId, accessLevel } = req.body;

    module.exports.updateUser(tgChatId, {
        institute_id: instituteId,
        access_level: accessLevel
    });

    return res.status(200).json({success: true});
});

app.get('/admin/menu/update-user', checkAuth, function (req, res) {
    const user = module.exports.getUserByTgChatId(adminSessions[req.cookies['sessionId']].chatId);

    if (user.access_level < 2) {
        return res.status(400).json({ error: 'Недостаточно прав для данного действия' });
    }

    const { userTgChatId } = req.query;

    const userToUpdate = module.exports.getUserByTgChatId(userTgChatId);
    if (!userToUpdate) {
        return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const institutes = module.exports.getInstitutes();
    institutes.unshift({ id: null, name: 'Не выбран' });

    return res.render('layouts/main', {
        view: 'updateUser',
        title: 'Update user ' + userToUpdate.tg_username,
        user: userToUpdate,
        institutes: institutes
    });
});

app.post('/api/add-institute', checkAuth, async function (req, res) {
    const { instituteName, newPolyId } = req.body;

    await module.exports.addInstitute({
        name: instituteName.trim(),
        poly_id: newPolyId
    });

    return res.status(200).json({success: true});
});

app.post('/api/update-institute', checkAuth, function (req, res) {
    const { instituteId, newPolyId } = req.body;

    module.exports.updateInstitute(instituteId, {
        poly_id: newPolyId
    });

    return res.status(200).json({success: true});
});

app.get('/admin/menu/update-institute', checkAuth, function (req, res) {
    const instituteId = req.query.instituteId;
    const institute = module.exports.getInstitute(instituteId);

    if (!institute) {
        return res.status(404).send('Институт не найден');
    }

    return res.render('layouts/main', {
        view: 'instituteForm',
        title: 'Update institute: ' + institute.name,
        isNew: false,
        institute: institute
    });
});

app.get('/admin/menu/add-institute', checkAuth, function (req, res) {
    return res.render('layouts/main', {
        view: 'instituteForm',
        title: 'Add institute',
        isNew: true,
        institute: false
    });
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

app.get('/health', (req, res) => {
    return res.json({success: 1});
});

app.get('/api/get-user-state', (req, res) => {
    const sessionId = req.cookies['sessionId'];

    if (!sessionId || !adminSessions[sessionId]) {
        return res.status(401).json({ error: 'Пользователь не авторизован' });
    }

    const { userId, chatId } = adminSessions[sessionId];

    res.json({ username: userId, tgChatId: chatId, tgUserId: userId });
});

app.get('/api/users', checkAuth, (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const offset = (page - 1) * limit;

    const userArray = module.exports.getUsers();

    const paginatedUsers = userArray.slice(offset, offset + limit);
    const totalUsers = userArray.length;

    res.json({ users: paginatedUsers.map(function (item) {
        if (item.institute_id) {
            item.institute = module.exports.getInstitute(item.institute_id);
        }

        return item;
    }), total: totalUsers });
});

app.get('/api/institutes', checkAuth, (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const offset = (page - 1) * limit;

    const institutesArray = module.exports.getInstitutes();

    const paginatedInstitutes = institutesArray.slice(offset, offset + limit);
    const totalInstitutes = institutesArray.length;

    res.json({ users: paginatedInstitutes, total: totalInstitutes });
});

app.get('/admin/section/:section', checkAuth, (req, res) => {
    const section = req.params.section;

    if (['dashboard', 'chat-add-requests', 'chats', 'institutes', 'mail', 'settings', 'users'].includes(section)) {
        return res.render(`templates/sections/${section}`);
    }

    return res.status(404).send('Раздел не найден');
});

app.get('/admin/:section', checkAuth, (req, res) => {
    const section = req.params.section;

    if (['dashboard', 'chat-add-requests', 'chats', 'institutes', 'mail', 'settings', 'users'].includes(section)) {
        return res.render('layouts/dashboard', {title: 'Admin Dashboard', view: section.toLowerCase()});
    }

    return res.status(404).send('Раздел не найден');
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

function connectWithRetry () {
    console.log('Connecting to database...');
    currentDatabaseConnection.connect()
        .then(() => {
            console.log('Connected to database');
        })
        .catch(err => {
            console.error('Failed to connect to database');
            console.log('Retrying in 5 seconds...');
            setTimeout(connectWithRetry, 5000);
        });
};

module.exports = {
    init: function (bot) {
        currentBotObject = bot;

        currentBotObject.on('callback_query', (callbackQuery) => {
            const { data, message } = callbackQuery;
            const [action, requestId] = data.split('_');

            const request = authRequests[requestId];
            if (!request) {
                return;
            }
            if (message.chat.id !== parseInt(request.chatId)) {
                return;
            }

            currentBotObject.answerCallbackQuery(callbackQuery.id).then(res => {
                let answerText = action === 'approve' ? `✅ Запрос на авторизацию ${requestId} принят.` : `❌ Запрос на авторизацию ${requestId} отклонён.`;

                if (action === 'approve') {
                    approveAuthRequest(requestId, request.chatId, request.userId)
                } else {
                    rejectAuthRequest(requestId)
                }

                currentBotObject.editMessageText(answerText, {
                    chat_id: message.chat.id,
                    message_id: message.message_id
                })
            });
        });

        return this;
    },
    with: function (database) {
        currentDatabaseConnection = database;
        return this;
    },
    start: function () {
        connectWithRetry();
        currentDatabaseConnection.on('error', err => {
            console.error('database connection error occurred.');
            console.log('Attempting to reconnect...');
            connectWithRetry();
        });

        migrate(currentDatabaseConnection);

        this.loadDatabaseToMemory();

        setInterval(() => {
            this.saveChangesToDatabase();
        }, 5 * 60 * 1000);

        app.listen(3000, () => {
            console.log(`Admin server started and running at ${process.env.ADMIN_PANEL_PORT} port`);
        });

        process.on('SIGINT', async function () {
            await this.saveChangesToDatabase();
            process.exit(0);
        });

        return true;
    },
    loadDatabaseToMemory: function () {
        let usersLoaded = 0;
        let institutesLoaded = 0;

        currentDatabaseConnection.query('SELECT * FROM users', (err, result) => {
            if (err) {
                console.error('Error fetching users');
                process.exit(1)
            }

            result.rows.forEach(user => {
                users[user.tg_chat_id] = {
                    id: user.id,
                    tg_chat_id: user.tg_chat_id,
                    tg_username: user.tg_username,
                    access_level: user.access_level,
                    institute_id: user.institute_id
                };
                usersLoaded++;
            });

            console.log(`Users data loaded into memory. Total users: ${usersLoaded}`);
        });

        currentDatabaseConnection.query('SELECT * FROM institutes', (err, result) => {
            if (err) {
                console.error('Error fetching institutes');
                process.exit(1);
            }

            result.rows.forEach(institute => {
                institutes[institute.id] = {
                    id: institute.id,
                    name: institute.name,
                    poly_id: institute.poly_id
                };
                institutesLoaded++;
            });

            console.log(`Institutes data loaded into memory. Total institutes: ${institutesLoaded}`);
        });
    },
    saveChangesToDatabase: function () {
        console.log('Saving changes to the database...');

        Object.values(institutes).forEach(institute => {
            if (institute.id == null) {
                currentDatabaseConnection.query(
                    'INSERT INTO institutes (name, poly_id) VALUES ($1, $2) ON CONFLICT (poly_id) DO UPDATE SET name = EXCLUDED.name',
                    [institute.name, institute.poly_id],
                    (err, result) => {
                        if (err) {
                            console.error('Error saving new institute:', institute.name);
                        }
                    }
                );
            } else {
                currentDatabaseConnection.query(
                    'INSERT INTO institutes (id, name, poly_id) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, poly_id = EXCLUDED.poly_id',
                    [institute.id, institute.name, institute.poly_id],
                    (err, result) => {
                        if (err) {
                            console.error('Error saving institute:', institute.name);
                        }
                    }
                );
            }
        });

        const currentInstituteIds = new Set(Object.values(institutes).map(institute => institute.id));
        currentDatabaseConnection.query(
            'DELETE FROM institutes WHERE id NOT IN (' + Array.from(currentInstituteIds).join(', ') + ')',
            (err, result) => {
                if (err) {
                    console.error('Error deleting institutes');
                } else {
                    console.log('Deleted old institutes successfully.');
                }
            }
        );

        Object.values(users).forEach(user => {
            if (user.id == null) {
                currentDatabaseConnection.query(
                    'INSERT INTO users (tg_chat_id, tg_username, access_level, institute_id) VALUES ($1, $2, $3, $4) ON CONFLICT (tg_chat_id) DO UPDATE SET tg_username = EXCLUDED.tg_username, access_level = EXCLUDED.access_level, institute_id = EXCLUDED.institute_id',
                    [user.tg_chat_id, user.tg_username, user.access_level, user.institute_id],
                    (err, result) => {
                        if (err) {
                            console.error('Error saving new user:', user.tg_username);
                        }
                    }
                );
            } else {
                currentDatabaseConnection.query(
                    'INSERT INTO users (id, tg_chat_id, tg_username, access_level, institute_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (tg_chat_id) DO UPDATE SET tg_username = EXCLUDED.tg_username, access_level = EXCLUDED.access_level, institute_id = EXCLUDED.institute_id',
                    [user.id, user.tg_chat_id, user.tg_username, user.access_level, user.institute_id],
                    (err, result) => {
                        if (err) {
                            console.error('Error saving user:', user.tg_username);
                        }
                    }
                );
            }
        });

        const currentUserChatIds = new Set(Object.values(users).map(user => user.tg_chat_id));
        currentDatabaseConnection.query(
            'DELETE FROM users WHERE tg_chat_id NOT IN (' + Array.from(currentUserChatIds).join(', ') + ')',
            (err, result) => {
                if (err) {
                    console.error('Error deleting users');
                } else {
                    console.log('Deleted old users successfully.');
                }
            }
        );

        console.log('Changes saved to the database.');
    },
    getUserByTgChatId: function (tg_chat_id) {
        return users[tg_chat_id] || null;
    },
    getUserByTgUsername: function (tg_username) {
        const user = Object.values(users).find(user => user.tg_username === tg_username);
        return user || null;
    },
    getUsers: function () {
        return Object.values(users);
    },
    getUserById: function (id) {
        return Object.values(users).find(user => user.id === id) || null;
    },
    addUser: function (user) {
        if (!user || !user.tg_chat_id) {
            return false;
        }

        users[user.tg_chat_id] = user;
        return this;
    },
    updateUser: function (tg_chat_id, userData) {
        const user = users[tg_chat_id];
        if (!user) {
            return false;
        }

        Object.assign(user, userData);
        return true;
    },
    getInstitute: function (id) {
        return institutes[id] || null;
    },
    getInstitutes: function () {
        return Object.values(institutes);
    },
    addInstitute: async function (institute) {
        if (!institute || !institute.name || !institute.poly_id) {
            return false;
        }

        const query = `
            INSERT INTO institutes (name, poly_id)
            VALUES ($1, $2)
            RETURNING id;
        `;
        await currentDatabaseConnection.query(query, [institute.name, institute.poly_id], (err, result) => {
            if (err) {
                return false;
            }

            const newInstituteId = result.rows[0].id;

            institute.id = newInstituteId;
            institutes[newInstituteId] = institute;

            return true;
        });
        return true;
    },
    updateInstitute: function (id, instituteData) {
        const institute = institutes[id];
        if (!institute) {
            return false;
        }

        Object.assign(institute, instituteData);
        return true;
    },
    deleteUserByTgChatId: function (tgChatId) {
        delete users[tgChatId];
        return this;
    },
    deleteInstitute: function (id) {
        delete institutes[id];
        return this;
    }
}
