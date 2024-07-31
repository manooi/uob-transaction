const fs = require('fs');
const pdf = require('pdf-parse');
const iconv = require('iconv-lite');
const { Parser } = require('json2csv');
const moment = require('moment');
const filePath = 'statements.pdf';

async function readPDF(filePath) {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return iconv.decode(Buffer.from(data.text, 'binary'), 'utf-8');
};

function parseAmount(text) {
    const spliited = text.split(" ");
    let amount = spliited[spliited.length - 1];

    const installmentPattern = /\d{2}\/\d{2}/;
    const isInstallment = installmentPattern.test(text);
    if (isInstallment) {
        amount = amount.slice(0, amount.length / 2);
    }

    const isCashback = text.includes("%");
    if (isCashback) {
        const idx = text.lastIndexOf("%");
        amount = text.slice(idx + 1);
    }

    amount = amount.replace("PAY", "");
    amount = amount.replace("CR", "");
    amount = amount.replaceAll(",", "");
    amount = +amount;
    return amount;
}

function parseDescription(text) {
    let txt = l.slice(12).split(" ");
    txt = txt.slice(0, txt.length - 1);
    return txt.join(" ")
}

function parseDate(text) {
    const currentYear = moment().year();
    return moment(`${text} ${currentYear}`, "DD MMM YYYY").toDate();
}

let result = [];

readPDF(filePath).then((pdfText) => {
    const lines = pdfText.split("\n");
    for (l of lines) {
        const transactionPattern = /\d{2} [A-Z]{3}\d{2}/;
        const previousBalancePattern = /PREVIOUS BALANCE/;
        const isMatch = transactionPattern.test(l);
        if (isMatch) {
            const amount = parseAmount(l);
            const model = {
                description: parseDescription(l),
                amount: amount,
                sign: l.includes("CR") ? -1 : 1,
                post_date: parseDate(l.slice(0, 6)),
                trans_date: parseDate(l.slice(6, 12)),
            };
            result.push(model);
        }
        else if(previousBalancePattern.test(l)) {
            const model = {
                description: "PREVIOUS BALANCE",
                amount: +(l.replace("PREVIOUS BALANCE", "").replace(",", "")),
                sign: 1,
                post_date: null,
                trans_date: null
            };
            result.push(model);
        }
    };

    const parser = new Parser();
    const csv = parser.parse(result);
    fs.writeFileSync("result.csv", csv);

}).catch((error) => {
    console.error('Error parsing PDF:', error);
});