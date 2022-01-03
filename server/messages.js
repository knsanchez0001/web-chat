const moment = require('moment');

function formatMessage(text) {
    return {
        text,
        time: moment().format('LT')
    };
}

module.exports = formatMessage;