const moment = require('moment');

function formatMessage(user, text) {
    return {
        user,
        text,
        time: moment().format('LT')
    };
}

module.exports = formatMessage;