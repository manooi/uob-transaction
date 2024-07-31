const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { Parser } = require('json2csv');
const { readPDF, parseAmount, parseDescription, parseDate } = require('./util/util.js');

const app = express();
const port = 3000;

const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const filePath = req.file.path;
    let result = [];

    try {
        const pdfText = await readPDF(filePath);
        const lines = pdfText.split("\n");
        for (let l of lines) {
            console.log(l);
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
            else if (previousBalancePattern.test(l)) {
                const model = {
                    description: "PREVIOUS BALANCE",
                    amount: +(l.replace("PREVIOUS BALANCE", "").replace(",", "")),
                    sign: 1,
                    post_date: null,
                    trans_date: null
                };
                result.push(model);
            }
        }

        const parser = new Parser();
        const csv = parser.parse(result);

        fs.unlinkSync(filePath); // Delete the uploaded file after processing

        res.setHeader('Content-Disposition', 'attachment; filename=result.csv');
        res.setHeader('Content-Type', 'text/csv');
        res.status(200).send(csv);

    }
    catch (error) {
        fs.unlinkSync(filePath); // Delete the uploaded file in case of error
        res.status(500).send('Error parsing PDF:', error.message);
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
