module.exports =function (direction = null, data) {
    if (!direction) {
        return 'Вы не указали код направления. Пример /find 09.04.04_01';
    }

    const item = data.directions[direction.toLowerCase().trim()];
    if (!item) {
        return 'Увы, направление не найдено. Код направления нужно указать вместе с профилем. Если вы его указали правильно, то предлагаем создать чат и заполнить форму на его добавление в таблицу по ссылке https://forms.gle/w7a17t4UWcNcnVPz9';
    }

    let response = `
✅ Найдено направление "${item.name}".

Код направления: ${item.direction}
Институт: ${item.institute}

Ссылка на чат: ${item.chatLink}
    `;

    if (item.ownerLink !== '') {
        response += `
В случае, если ссылка не работает, Вы можете написать напрямую создателю беседы: ${item.ownerLink}
        `;
    }

    response += `
В случае некорректности предоставленных данных или необходимости их изменить, обратитесь к @MrCreating и сообщите код направления.
    `;

    return response;
}
