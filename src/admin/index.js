const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

let currentBotObject;

const app = express();
const port = parseInt(process.env.ADMIN_PANEL_PORT, 10);

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

let authRequests = {};
let adminSessions = {};

module.exports = {
    init: function (bot) {
        currentBotObject = bot;

        return this;
    },
    start: function () {
        return false;
    }
}
