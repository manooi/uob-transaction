const fs = require('fs');
const pdf = require('pdf-parse');
const iconv = require('iconv-lite');
const moment = require('moment');

async function readPDF(filePath) {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return iconv.decode(Buffer.from(data.text, 'binary'), 'utf-8');
}

function parseAmount(text) {
    const splitted = text.split(" ");
    let amount = splitted[splitted.length - 1];

    const installmentPattern = /\d{2}\/\d{2}/;
    const isInstallment = installmentPattern.test(text);

    const isCashback = text.includes("%");

    const usdPattern = /[A-Z]{3}(\d+)\.(\d{2})/;
    const usdMatched = text.match(usdPattern);

    if (isInstallment) {
        amount = amount.slice(0, amount.length / 2);
    }
    else if (isCashback) {
        const idx = text.lastIndexOf("%");
        amount = text.slice(idx + 1);
    }
    else if(usdMatched) {
        amount = amount.replace(usdMatched[0],"");
    }

    amount = amount.replace("PAY", "");
    amount = amount.replace("CR", "");
    amount = amount.replaceAll(",", "");
    amount = +amount;
    return amount;
}

function parseDescription(text) {
    let txt = text.slice(12).split(" ");
    txt = txt.slice(0, txt.length - 1);
    return txt.join(" ");
}

function parseDate(text) {
    const currentYear = moment().year();
    return moment(`${text} ${currentYear}`, "DD MMM YYYY").toDate();
}

module.exports = {
    readPDF,
    parseAmount,
    parseDescription,
    parseDate
};
