function createLoader () {
    let element = document.createElement('div');

    element.innerHTML = '<div class="preloader-wrapper small active"><div class="spinner-layer spinner-blue"><div class="circle-clipper left"><div class="circle"></div></div><div class="gap-patch"><div class="circle"></div></div><div class="circle-clipper right"><div class="circle"></div></div></div><div class="spinner-layer spinner-red"><div class="circle-clipper left"><div class="circle"></div></div><div class="gap-patch"><div class="circle"></div></div><div class="circle-clipper right"><div class="circle"></div></div></div><div class="spinner-layer spinner-yellow"><div class="circle-clipper left"><div class="circle"></div></div><div class="gap-patch"><div class="circle"></div></div><div class="circle-clipper right"><div class="circle"></div></div></div><div class="spinner-layer spinner-green"><div class="circle-clipper left"><div class="circle"></div></div><div class="gap-patch"><div class="circle"></div></div><div class="circle-clipper right"><div class="circle"></div></div></div></div>\n';

    return element;
}

function findLoader (id) {
    let loader = document.getElementById(id);
    if (!loader) {
        return createLoader();
    }

    if (loader.innerText === '') {
        loader.innerHTML = '<div class="preloader-wrapper small active"><div class="spinner-layer spinner-blue"><div class="circle-clipper left"><div class="circle"></div></div><div class="gap-patch"><div class="circle"></div></div><div class="circle-clipper right"><div class="circle"></div></div></div><div class="spinner-layer spinner-red"><div class="circle-clipper left"><div class="circle"></div></div><div class="gap-patch"><div class="circle"></div></div><div class="circle-clipper right"><div class="circle"></div></div></div><div class="spinner-layer spinner-yellow"><div class="circle-clipper left"><div class="circle"></div></div><div class="gap-patch"><div class="circle"></div></div><div class="circle-clipper right"><div class="circle"></div></div></div><div class="spinner-layer spinner-green"><div class="circle-clipper left"><div class="circle"></div></div><div class="gap-patch"><div class="circle"></div></div><div class="circle-clipper right"><div class="circle"></div></div></div></div>\n';
    }

    return loader;
}

function createTextBox () {
    return {
        element: document.createElement('div'),
        getElement: function () {
            this.element.style.padding = '5px';
            return this.element;
        },
        setText: function (text) {
            this.element.innerText = text;
            return this;
        }
    }
}

function createOrFindTextBox (id) {
    let element = document.getElementById(id);
    if (!element) {
        return createTextBox();
    }

    return {
        element: element,
        getElement: function () {
            return this.element;
        },
        setText: function (text) {
            this.element.innerText = text;
            return this;
        },
        hide: function () {
            this.element.style.display = 'none';
            return this;
        },
        show: function () {
            this.element.style.display = 'unset';
            return this;
        }
    }
}

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

function sendAuthRequest() {
    return fetch('/api/auth-request', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'request' }) // данные для запроса
    })
        .then(response => response.json())
        .then(data => {
            if (data && data.id) {
                return data.id;  // Возвращаем id из ответа
            } else {
                throw new Error('Auth failed');
            }
        })
        .catch(error => {
            return null;
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

function auth (authButton) {
    let loader = findLoader('auth-loader');

    let textBox = createOrFindTextBox('auth-result-box');

    textBox.setText('');
    authButton.style.display = 'none';
    loader.style.display = '';

    sendAuthRequest().then(id => {
        if (id) {
            textBox.setText(`Ожидается подтверждение авторизации. ID: ${id}`);
            return pollAuthStatus(id).then(function (success) {
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
                            loader.style.display = 'none';
                        }
                    });
                } else {
                    textBox.setText('Ваша авторизация была отклонена.');
                    authButton.style.display = '';
                    loader.style.display = 'none';
                }
            })
        } else {
            textBox.setText('Ошибка авторизации. Попробуйте ещё раз');
            authButton.style.display = '';
            loader.style.display = 'none';
        }
    });
}
