document.addEventListener('DOMContentLoaded', function () {
    const sidenavElems = document.querySelectorAll('.sidenav');
    const sidenavInstances = M.Sidenav.init(sidenavElems); // Инициализация боковой панели

    const dropdownElems = document.querySelectorAll('.dropdown-trigger');
    M.Dropdown.init(dropdownElems, { coverTrigger: false, constrainWidth: false }); // Инициализация выпадающего меню

    const links = document.querySelectorAll('[data-link]');
    const content = document.getElementsByClassName('contentContainer')[0];

    function loadSection(section) {
        fetch(`/admin/section/${section}`)
            .then(response => response.text())
            .then(html => {
                content.innerHTML = html;

                if (window.innerWidth <= 992) {
                    sidenavInstances.forEach(instance => instance.close());
                }

                try {
                    window['init_' + section]();
                } catch (e) {
                    console.log('Section ' + section + ' is not initialized');
                }
            })
            .catch(err => {
                content.innerHTML = '<p class="red-text">Ошибка загрузки раздела.</p>';
            });
    }

    const currentSection = window.location.pathname.split('/').pop();
    if (currentSection) {
        loadSection(currentSection);
    }

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.getAttribute('data-link');

            if (section && section !== '#!') {
                loadSection(section);
                history.pushState(null, '', `/admin/${section}`);
            }

            if (window.innerWidth <= 992) {
                sidenavInstances.forEach(instance => instance.close());
            }
        });
    });

    fetch('/api/get-user-state')
        .then(response => response.json())
        .then(data => {
            if (data.username && data.tgChatId && data.tgUserId) {
                const userDropdown = document.getElementById('userDropdown');
                userDropdown.innerHTML = `
                    <li><span class="user-info">${data.username}</span></li>
                    <li class="divider"></li>
                    <li><a href="/logout" class="red-text">Выйти</a></li>
                `;

                document.getElementById('userNameId').innerText = data.username;

                let elems = document.querySelectorAll('.dropdown-trigger');
                M.Dropdown.init(elems);
            } else {
                console.error('Ошибка: не удалось загрузить данные пользователя');
            }
        })
        .catch(err => {
            console.error('Ошибка получения состояния пользователя:', err);
        });
});
