module.exports = function (institute = null, data) {
    if (!institute) {
        return 'Вы не указали институт. Например, /list ИКНК';
    }

    const items = data.institutes[institute.toUpperCase().trim()];
    if (!items || items.length === 0) {
        return `Не найдены направления или институт. В случае ошибки, проверьте - не опечатались ли вы.`;
    }

    let response = `Список чатов для института:\n`;

    for (let direction in items) {
        const info = items[direction];

        response += `
-> ${info.direction} - ${info.chatLink} (${info.institute})
        `;
    }

    response += `
В случае некорректности предоставленных данных или необходимости их изменить, обратитесь к @MrCreating и сообщите код направления.
    `;

    return response;
}
