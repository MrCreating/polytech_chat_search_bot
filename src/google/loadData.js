const sortDataByDirections = require("../utils/sortDataByDirections");

module.exports = function (doc) {
    return new Promise(function (resolve) {
        console.log('Loading table...');

        (async function () {
            await doc.loadInfo(true);
            console.log('Loaded!');

            console.log('Updating...');
            let mainSheet = sortDataByDirections(await doc.sheetsByIndex[0].getRows());
            console.log('Updated!');

            return resolve(mainSheet);
        })();
    });
}
