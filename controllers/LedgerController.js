// controllers/LedgerController.js
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

exports.generateLedgerPDF = async (req, res) => {
    const ledgerData = [
        { date: '25-12-2024', particulars: 'INCOME CATEGORY HEAD ACCOUNT WRITING CH\nINCOME TAX FEES\nGST FEES', cashBank: 'Invoice no– 264163', amount: 10000 },
        { date: '25-12-2024', particulars: 'Shellcode (DERIVED FROM RECEIPT ENTRY)', cashBank: '', amount: 10000 },
        { date: '25-12-2024', particulars: 'AMOL PATIL', cashBank: 'TRANSFER', amount: 10000 }
    ];

    const pdfsDir = path.join(__dirname, '..', 'pdfs');
    if (!fs.existsSync(pdfsDir)) {
        fs.mkdirSync(pdfsDir);
    }
    const filePath = path.join(pdfsDir, 'ledger.pdf');
    await generateLedgerPDF(ledgerData, filePath);

    res.status(200).json({
        success: true,
        message: "Ledger PDF generated successfully",
        downloadLink: `/api/download/ledger.pdf`
    });
};

const generateLedgerPDF = async (ledgerData, filePath) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const writeStream = fs.createWriteStream(filePath);

        doc.pipe(writeStream);

        // Add company name and title
        doc.fontSize(20).text('Ledger', { align: 'center', x: 250, y: 30 });
        doc.fontSize(12).text('NEXURA INFRA PRIVATE LIMITED', { align: 'center', x: 250, y: 60 });

        // Define table headers and their positions
        const headers = ['DATE', 'PARTICULARS', 'CASH/BANK', 'AMOUNT'];
        const headerWidths = [100, 300, 100, 100]; // Widths of each column
        const xPositions = [50, 150, 250, 350]; // X positions for each column

        // Draw table headers
        let yPos = 100;
        headers.forEach((header, index) => {
            doc.fontSize(12).text(header, { align: 'center', x: xPositions[index], y: yPos });
        });

        // Draw table lines
        doc.moveTo(50, yPos + 20).lineTo(400, yPos + 20).stroke();
        doc.moveTo(50, yPos + 30).lineTo(400, yPos + 30).stroke();

        // Add table data
        ledgerData.forEach((item, rowIndex) => {
            yPos += 30; // Move to the next row
            doc.fontSize(10).text(item.date, { x: xPositions[0], y: yPos });
            doc.text(item.particulars, { x: xPositions[1], y: yPos });
            doc.text(item.cashBank, { x: xPositions[2], y: yPos });
            doc.text(item.amount.toString(), { x: xPositions[3], y: yPos });
        });

        // Calculate total and add it to the table
        const totalAmount = ledgerData.reduce((sum, item) => sum + parseFloat(item.amount), 0);
        yPos += 20; // Move below the last row
        doc.fontSize(12).text(`TOTAL: ${totalAmount}`, { align: 'right', x: xPositions[3], y: yPos });

        // End the PDF document
        doc.end();

        writeStream.on('finish', () => {
            resolve(filePath);
        });

        writeStream.on('error', (err) => {
            reject(err);
        });
    });
};