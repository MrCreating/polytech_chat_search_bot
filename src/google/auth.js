const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

module.exports = function () {
    return new JWT({
        keyFile: '/app/credentials.json',
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
}
