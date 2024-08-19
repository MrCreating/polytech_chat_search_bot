const group = require('../utils/calculateGroup');

module.exports = function (direction, data) {
    if (!direction) {
        return 'Вы не указали код направления. Пример /group 09.04.04_01';
    }

    const item = data.directions[direction.toLowerCase().trim()];
    if (!item) {
        return 'Увы, направление не найдено. Код направления нужно указать вместе с профилем. Если вы его указали правильно, то предлагаем создать чат и заполнить форму на его добавление в таблицу по ссылке https://forms.gle/w7a17t4UWcNcnVPz9';
    }

    const groupNumber = group(item, false);
    if (!groupNumber) {
        return 'Не указан номер профиля специальности, не могу точно посчитать группу. Укажите значение после _. Например: 09.04.03_04'
    }

    return `
Потенциальный номер вашей группы (последние 2 цифры могут отличаться 01, 02, 03... если вас несколько групп)

${groupNumber + '01'}

На данный момент информация неофициальная и считается по гайдам от студентов, так что перепроверяйте :)

А также можно глянуть расписание: https://ruz.spbstu.ru/search/groups?q=${encodeURI(groupNumber)}
    `;
}
