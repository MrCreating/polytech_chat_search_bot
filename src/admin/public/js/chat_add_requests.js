function init_chat_add_requests () {
    let currentPage = 1;
    const chatsPerPage = 10;

    function loadChats() {
        fetch(`/api/chat_add_requests?page=${currentPage}&limit=${usersPerPage}`)
            .then(response => response.json())
            .then(data => {
                const requests = data.requests;
                const totalChats = data.total;
                const totalPages = Math.ceil(totalChats / chatsPerPage);

                const requestsList = document.getElementById('requestsList');
                requestsList.innerHTML = requests.map(chat => `
                    <tr>
                        <td>${chat.requester_tg_chat_id}</td>
                        <td>${chat.chat_link}</td>
                        <td>${chat.direction}</td>
                        <td>${chat.institute_id}</td>
                        <td>
                            <button class="btn red add_${chat.id}">Принять</button>
                            <button class="btn red del_${chat.id}">Отклонить</button>
                        </td>
                    </tr>
                `).join('');

                users.forEach(function (user) {
                    document.getElementsByClassName(`add_${user.tg_chat_id}`)[0].addEventListener('click', function () {
                        addChat(user)
                    });
                    document.getElementsByClassName(`del_${user.tg_chat_id}`)[0].addEventListener('click', function () {
                        declineChat(user)
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
        loadChats();
    }

    function addChat (chat) {}

    function declineChat (chat) {}

    loadChats();
}
