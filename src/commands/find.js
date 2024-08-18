module.exports =function (direction = null, data) {
    if (!direction) {
        return 'Вы не указали код направления. Пример /find 09.04.03';
    }

    console.log(data);

    return direction;
}
