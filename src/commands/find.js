const group = require('../utils/calculateGroup')

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

    const groupNumber = group(item, false);
    if (groupNumber) {
        response += `
Кстати, с высокой вероятностью номер вашей группы будет ${groupNumber + '01'} (последние 2 цифры могут отличаться на 1 или 2. Расписание тут -> https://ruz.spbstu.ru/search/groups?q=${encodeURI(groupNumber)}
        `;
    }

    response += `
В случае некорректности предоставленных данных или необходимости их изменить, обратитесь к @MrCreating и сообщите код направления.
    `;

    return response;
}
