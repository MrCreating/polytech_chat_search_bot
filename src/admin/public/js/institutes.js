function init_institutes () {
    let currentPage = 1;
    const usersPerPage = 10;

    function loadInstitutes() {
        fetch(`/api/institutes?page=${currentPage}&limit=${usersPerPage}`)
            .then(response => response.json())
            .then(data => {
                const users = data.users;
                const totalUsers = data.total;
                const totalPages = Math.ceil(totalUsers / usersPerPage);

                const usersList = document.getElementById('institutesList');
                usersList.innerHTML = users.map(user => `
                    <tr>
                        <td>${user.id}</td>
                        <td>${user.name}</td>
                        <td>${user.poly_id}</td>
                        <td>
                            <a href="/admin/menu/update-institute?instituteId=${user.id}" class="btn blue">Редактировать</a>
                            <button class="btn red del_${user.id}">Удалить</button>
                        </td>
                    </tr>
                `).join('');

                users.forEach(function (user) {
                    document.getElementsByClassName(`del_${user.id}`)[0].addEventListener('click', function () {
                        deleteUser(user)
                    });
                });

                const pagination = document.getElementById('pagination');
                pagination.innerHTML = Array.from({ length: totalPages }, (_, i) => `
                    <li class="ins_${i} ${i + 1 === currentPage ? 'active' : ''}">
                        <a href="#!">${i + 1}</a>
                    </li>
                `).join('');

                Array.from({ length: totalPages }, (_, i) => {
                    document.getElementsByClassName(`ins_${i}`)[0].addEventListener('click', function () {
                        changePage(i + 1);
                    })
                })
            })
            .catch(error => console.error('Error loading institutes:', error));
    }

    function changePage(page) {
        currentPage = page;
        loadInstitutes();
    }

    function deleteUser(institute) {
        if (confirm('Вы действительно хотите удалить институт: ' + institute.name + '?')) {
            fetch('/api/delete-institute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ instituteId: institute.id })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        M.toast({html: 'Институт удален успешно!', classes: 'green'});
                        setTimeout(function () {
                            location.reload();
                        }, 2000)
                    } else {
                        M.toast({html: data.error, classes: 'red'});
                    }
                })
                .catch(error => {
                    M.toast({html: 'Ошибка сети: ' + error.message, classes: 'red'});
                });
        }
    }

    loadInstitutes();
}
