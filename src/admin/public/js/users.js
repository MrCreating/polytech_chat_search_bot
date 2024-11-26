function init_users () {
    let currentPage = 1;
    const usersPerPage = 10;

    function loadUsers() {
        fetch(`/api/users?page=${currentPage}&limit=${usersPerPage}`)
            .then(response => response.json())
            .then(data => {
                const users = data.users;
                const totalUsers = data.total;
                const totalPages = Math.ceil(totalUsers / usersPerPage);

                const usersList = document.getElementById('usersList');
                usersList.innerHTML = users.map(user => `
                    <tr>
                        <td>${user.tg_username}</td>
                        <td>${user.tg_chat_id}</td>
                        <td>${user.access_level}</td>
                        <td>${user.institute === null ? 'Не указан' : user.institute.name}</td>
                        <td>
                            <a class="btn blue ed_${user.tg_chat_id}" href="/admin/menu/update-user?userTgChatId=${user.tg_chat_id}">Редактировать</a>
                            <button class="btn red del_${user.tg_chat_id}">Удалить</button>
                        </td>
                    </tr>
                `).join('');

                users.forEach(function (user) {
                    document.getElementsByClassName(`del_${user.tg_chat_id}`)[0].addEventListener('click', function () {
                        deleteUser(user)
                    });
                });

                // Render pagination
                const pagination = document.getElementById('pagination');
                pagination.innerHTML = Array.from({ length: totalPages }, (_, i) => `
                    <li class="U_${i} ${i + 1 === currentPage ? 'active' : ''}">
                        <a href="#!">${i + 1}</a>
                    </li>
                `).join('');

                Array.from({ length: totalPages }, (_, i) => {
                    document.getElementsByClassName(`U_${i}`)[0].addEventListener('click', function () {
                        changePage(i + 1);
                    })
                })
            })
            .catch(error => console.error('Error loading users:', error));
    }

    function changePage(page) {
        currentPage = page;
        loadUsers();
    }

    function deleteUser(user) {
        if (confirm('Вы действительно хотите удалить пользователя: ' + user.tg_username + '?')) {
            fetch('/api/delete-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ tgChatId: user.tg_chat_id })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        M.toast({html: 'Пользователь удален успешно!', classes: 'green'});
                        setTimeout(function () {
                            location.reload();
                        }, 1000)
                    } else {
                        M.toast({html: data.error, classes: 'red'});
                    }
                })
                .catch(error => {
                    M.toast({html: 'Ошибка сети: ' + error.message, classes: 'red'});
                });
        }
    }

    loadUsers();
}
