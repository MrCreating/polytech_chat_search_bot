module.exports = function (command) {
    return require(`./../commands/${command}.js`);
}
