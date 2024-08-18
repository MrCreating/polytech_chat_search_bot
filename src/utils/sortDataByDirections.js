module.exports = function (data) {
    const directions = {};
    const institutes = {};

    data.forEach((item) => {
        const direction = item.get('Код направления');

        const finalObject = {
            direction: direction,
            institute: item.get('Институт'),
            name: item.get('Название направления'),
            chatLink: item.get('Ссылка'),
            ownerLink: item.get('Создатель (ссылка/тег)')
        }

        if (!institutes[finalObject.institute.toUpperCase().trim()]) {
            institutes[finalObject.institute.toUpperCase().trim()] = {}
        }

        institutes[finalObject.institute.toUpperCase().trim()][direction] = finalObject;
        directions[finalObject.direction.toUpperCase().trim()] = finalObject;
    })

    return {
        directions: directions,
        institutes: institutes
    };
}
