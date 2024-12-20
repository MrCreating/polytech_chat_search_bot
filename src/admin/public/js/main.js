function pollAuthStatus(id) {
    return new Promise((resolve, reject) => {
        const interval = setInterval(() => {
            fetch(`/api/auth-state-check?requestId=${id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            })
                .then(response => response.json())
                .then(data => {
                    if (data && data.status === true) {
                        clearInterval(interval);
                        resolve(true); // Авторизация подтверждена
                    } else if (data && data.status === false) {
                        clearInterval(interval);
                        resolve(false); // Авторизация отклонена
                    }
                })
                .catch(error => {
                    clearInterval(interval);
                    reject(error);
                });
        }, 3000);
    });
}

function sendAuthRequest(telegramUsername) {
    return fetch('/api/auth-request', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: 'request',
            telegramUsername: telegramUsername  // Передаем никнейм Telegram
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data && data.id) {
                return data.id;  // Возвращаем id из ответа
            } else {
                throw new Error(data.error);
            }
        });
}

function saveAuthSession(id) {
    return new Promise(function (resolve, reject) {
        return setTimeout(function () {
            return fetch('/api/save-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ requestId: id })
            })
                .then(response => response.json())
                .then(data => {
                    if (data && data.success) {
                        return resolve(true);
                    } else {
                        return reject(new Error('Failed to save session'));
                    }
                })
                .catch(error => {
                    return resolve(false);
                });
        }, 1000)
    })
}

function auth(authButton) {
    const telegramUsername = document.getElementById('telegram-username');

    if (!telegramUsername.value) {
        M.toast({html: 'Пожалуйста, укажите ваш никнейм в Telegram'});
        return;
    }

    let loader = findLoader('auth-loader');
    let textBox = createOrFindTextBox('auth-result-box');

    textBox.setText('');
    authButton.style.display = 'none';
    loader.style.display = '';
    telegramUsername.disabled = true;

    // Инициализация счетчика
    let secondsElapsed = 0;
    let timerInterval;
    let currentRequestId = '';

    function startTimer() {
        timerInterval = setInterval(() => {
            secondsElapsed++;
            const minutes = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
            const seconds = (secondsElapsed % 60).toString().padStart(2, '0');
            textBox.setText(`Ожидается подтверждение авторизации для ${currentRequestId} (${minutes}:${seconds})...`);
        }, 1000);
    }

    function stopTimer() {
        clearInterval(timerInterval);
    }

    sendAuthRequest(telegramUsername.value).then(id => {
        if (id) {
            currentRequestId = id;
            textBox.setText(`Ожидается подтверждение авторизации для ${currentRequestId}...`);
            startTimer(); // Запускаем таймер
            return pollAuthStatus(id).then(function (success) {
                stopTimer(); // Останавливаем таймер
                if (success) {
                    textBox.setText('Ваша авторизация подтверждена. Выполняется авторизация...');
                    saveAuthSession(id).then(saved => {
                        if (saved) {
                            textBox.setText('Сессия сохранена. Ожидается переход...');
                            setTimeout(function () {
                                window.location.href = '/';
                            }, 3000);
                        } else {
                            textBox.setText('Ошибка входа. Попробуйте ещё раз.');
                            authButton.style.display = '';
                            telegramUsername.disabled = false;
                            loader.style.display = 'none';
                        }
                    });
                } else {
                    textBox.setText('Ваша авторизация была отклонена.');
                    authButton.style.display = '';
                    telegramUsername.disabled = false;
                    loader.style.display = 'none';
                }
            });
        } else {
            textBox.setText('Ошибка авторизации. Попробуйте ещё раз');
            authButton.style.display = '';
            loader.style.display = 'none';
            telegramUsername.disabled = false;
        }
    }).catch(error => {
        textBox.setText(error.message ? error.message : 'Произошла ошибка. Попробуйте ещё раз.');
        authButton.style.display = '';
        loader.style.display = 'none';
        telegramUsername.disabled = false;
    });
}
