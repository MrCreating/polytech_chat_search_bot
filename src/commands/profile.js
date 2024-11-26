module.exports = function (user, admin) {
    let institute = admin.getInstitute(user.institute_id);

    return `
Профиль пользователя @${user.tg_username}:

ID чата в Telegram: ${user.tg_chat_id}
Институт: ${institute === null ? "Не указан" : institute.name}  
    `;
}
