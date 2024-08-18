module.exports = function (institute = null, data) {
    if (!institute) {
        return 'Вы не указали институт. Например, /list ИКНК';
    }

    return institute;
}
