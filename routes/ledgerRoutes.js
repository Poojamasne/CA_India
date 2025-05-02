// ledgerRoutes.js
const express = require('express');
const router = express.Router();
const { generateLedgerPDF } = require('../controllers/LedgerController');
const path = require('path');
const fs = require('fs');

// Route to generate and download the ledger PDF
router.post('/generate-ledger', (req, res) => {
    generateLedgerPDF(req, res);
});

// Route to download the generated ledger PDF
router.get('/download/ledger.pdf', (req, res) => {
    const pdfsDir = './pdfs'; // Update with the correct path to your pdfs directory
    const filePath = path.join(pdfsDir, 'ledger.pdf');
    if (fs.existsSync(filePath)) {
        res.download(filePath, 'ledger.pdf');
    } else {
        res.status(404).send('File not found');
    }
});

module.exports = router;