const db = require('../db');
const moment = require('moment');
const PDFDocument = require('pdfkit');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Cache for storing filtered results temporarily
const filterCache = new Map();

const filterEntryFlow = async (req, res) => {
    try {
        const {
            user_id,
            dateFilter,
            CustomDate,
            startDate,
            endDate,
            entryType,
            party,
            reference,
            category,
            subCategory,
            headAccount,
            paymentMode,
            grade,
            customField,
            Field
        } = req.query;

        console.log('Received query parameters:', req.query);

        if (!user_id) {
            return res.status(400).json({ message: "user_id is required" });
        }

        if (Field) {
            return handleFieldOptions(req, res);
        }

        const lowerEntryType = entryType?.toLowerCase();
        if (!lowerEntryType) {
            return res.status(400).json({ message: "entryType is required for entry filtering" });
        }

        let query, table;

        switch (lowerEntryType) {
            case 'receipt':
                table = 'receipt_entries';
                break;
            case 'transfer':
                table = 'transfers';
                break;
            case 'payment':
                table = 'payment_entries';
                break;
            default:
                return res.status(400).json({ message: "Invalid entry type. Must be receipt, payment, or transfer" });
        }

        query = `SELECT * FROM ${table} WHERE user_id = ?`;
        let params = [user_id];

        // Date Filter
        if (dateFilter && dateFilter !== 'All') {
            const normalizedDateFilter = dateFilter.replace(/\s+/g, '').toLowerCase();
            switch (normalizedDateFilter) {
                case 'customdate':
                    if (!CustomDate) {
                        return res.status(400).json({ message: "CustomDate is required for CustomDate filter" });
                    }
                    const filterDate = moment(CustomDate, 'YYYY-MM-DD', true);
                    if (!filterDate.isValid()) {
                        return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
                    }
                    query += ` AND DATE(created_at) = ?`;
                    params.push(filterDate.format('YYYY-MM-DD'));
                    break;

                case 'customperiod':
                    if (!startDate || !endDate) {
                        return res.status(400).json({ message: "startDate and endDate are required for CustomPeriod filter" });
                    }
                    const start = moment(startDate, 'YYYY-MM-DD', true);
                    const end = moment(endDate, 'YYYY-MM-DD', true);
                    if (!start.isValid() || !end.isValid()) {
                        return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
                    }
                    query += ` AND DATE(created_at) BETWEEN ? AND ?`;
                    params.push(start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'));
                    break;

                case 'currentmonth':
                    query += ` AND YEAR(created_at) = YEAR(CURRENT_DATE) AND MONTH(created_at) = MONTH(CURRENT_DATE)`;
                    break;

                case 'lastmonth':
                    query += ` AND YEAR(created_at) = YEAR(CURRENT_DATE - INTERVAL 1 MONTH) 
                              AND MONTH(created_at) = MONTH(CURRENT_DATE - INTERVAL 1 MONTH)`;
                    break;

                case 'currentfinancialyear':
                    const currentYear = moment().year();
                    const currentMonth = moment().month() + 1;
                    const fyStart = currentMonth >= 4 ? `${currentYear}-04-01` : `${currentYear-1}-04-01`;
                    const fyEnd = currentMonth >= 4 ? `${currentYear+1}-03-31` : `${currentYear}-03-31`;
                    query += ` AND DATE(created_at) BETWEEN ? AND ?`;
                    params.push(fyStart, fyEnd);
                    break;

                case 'lastfinancialyear':
                    const lastFyYear = moment().year();
                    const lastFyMonth = moment().month() + 1;
                    const lastFyStart = lastFyMonth >= 4 ? `${lastFyYear-1}-04-01` : `${lastFyYear-2}-04-01`;
                    const lastFyEnd = lastFyMonth >= 4 ? `${lastFyYear}-03-31` : `${lastFyYear-1}-03-31`;
                    query += ` AND DATE(created_at) BETWEEN ? AND ?`;
                    params.push(lastFyStart, lastFyEnd);
                    break;

                default:
                    return res.status(400).json({ message: "Invalid date filter" });
            }
        }

        // Party Filter
        if (party && party !== 'All') {
            query += ` AND party_id IN (?)`;
            params.push(party.split(','));
        }

        // Reference Filter
        if (reference) {
            query += ` AND reference = ?`;
            params.push(reference);
        }

        // Category Filter
        if (category && category !== 'All') {
            query += ` AND category_id IN (?)`;
            params.push(category.split(','));
        }

        // SubCategory Filter
        if (subCategory && subCategory !== 'All') {
            query += ` AND sub_category_id IN (?)`;
            params.push(subCategory.split(','));
        }

        // Head Account Filter
        if (headAccount && headAccount !== 'All') {
            query += ` AND head_account_id IN (?)`;
            params.push(headAccount.split(','));
        }

        // Payment Mode Filter
        if (paymentMode && paymentMode !== 'All') {
            query += ` AND payment_mode IN (?)`;
            params.push(paymentMode.split(','));
        }

        // Grade Filter
        if (grade && grade !== 'All') {
            query += ` AND grade IN (?)`;
            params.push(grade.split(','));
        }

        // Custom Field Filter
        if (customField && customField !== 'All') {
            query += ` AND custom_field_id IN (?)`;
            params.push(customField.split(','));
        }

        query += ` ORDER BY created_at DESC`;

        console.log('Executing query:', query);
        console.log('With parameters:', params);

        const [results] = await db.query(query, params);

        // Generate a unique filter ID and cache the results
        const filterId = uuidv4();
        filterCache.set(filterId, {
            data: results,
            timestamp: Date.now(),
            filters: req.query
        });

        // Set cache expiration (1 hour)
        setTimeout(() => {
            filterCache.delete(filterId);
        }, 3600000);

        // Create download link
        const downloadPdfLink = `${req.protocol}://${req.get('host')}/api/filter-flow/download/${filterId}`;

        res.json({
            success: true,
            count: results.length,
            entries: results,
            downloadPdfLink: downloadPdfLink
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

const downloadFilteredPdf = async (req, res) => {
    try {
        const { filterId } = req.params;
        
        if (!filterCache.has(filterId)) {
            return res.status(404).json({
                success: false,
                message: 'Filtered results not found or expired'
            });
        }

        const cacheData = filterCache.get(filterId);
        const filteredData = cacheData.data;
        const filters = cacheData.filters;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        // Create a PDF document
        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        
        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=entries-report-${timestamp}.pdf`);
        
        // Pipe the PDF to the response
        doc.pipe(res);

        // Add header
        doc.fontSize(18)
           .font('Helvetica-Bold')
           .text('ENTRIES REPORT', { align: 'center' })
           .moveDown(0.5);

        // Add report metadata
        doc.fontSize(10)
           .font('Helvetica')
           .text(`Generated on: ${new Date().toLocaleString()}`, { align: 'right' })
           .text(`Total Entries: ${filteredData.length}`, { align: 'right' })
           .moveDown(1);

        // Add filters summary
        doc.fontSize(10)
           .text('Filters Applied:', { underline: true })
           .moveDown(0.5);

        let filtersText = '';
        if (filters.dateFilter && filters.dateFilter !== 'All') {
            filtersText += `Date: ${filters.dateFilter}`;
            if (filters.dateFilter === 'CustomDate' && filters.CustomDate) {
                filtersText += ` (${filters.CustomDate})`;
            } else if (filters.dateFilter === 'CustomPeriod' && filters.startDate && filters.endDate) {
                filtersText += ` (${filters.startDate} to ${filters.endDate})`;
            }
            filtersText += '\n';
        }

        if (filters.entryType) {
            filtersText += `Entry Type: ${filters.entryType}\n`;
        }

        doc.text(filtersText || 'No filters applied')
           .moveDown(1);

        // Define table parameters
        const startX = 30;
        let startY = 200;
        const rowHeight = 20;
        const colWidth = {
            receiptNo: 90,
            date: 70,
            party: 90,
            amount: 70,
            paymentMode: 80,
            categorySplit: 120,
            bank: 80
        };

        // Add table headers
        doc.font('Helvetica-Bold')
           .fontSize(9)
           .fillColor('#333333');

        doc.text('Receipt No', startX, startY);
        doc.text('Date', startX + colWidth.receiptNo, startY);
        doc.text('Party', startX + colWidth.receiptNo + colWidth.date, startY);
        doc.text('Amount', startX + colWidth.receiptNo + colWidth.date + colWidth.party, startY);
        doc.text('Payment Mode', startX + colWidth.receiptNo + colWidth.date + colWidth.party + colWidth.amount, startY);
        doc.text('Category Split', startX + colWidth.receiptNo + colWidth.date + colWidth.party + colWidth.amount + colWidth.paymentMode, startY);
        doc.text('Bank', startX + colWidth.receiptNo + colWidth.date + colWidth.party + colWidth.amount + colWidth.paymentMode + colWidth.categorySplit, startY);

        // Draw header line
        doc.moveTo(startX, startY + 15)
           .lineTo(startX + Object.values(colWidth).reduce((a, b) => a + b, 0), startY + 15)
           .lineWidth(1)
           .strokeColor('#cccccc')
           .stroke();

        // Reset font for data
        doc.font('Helvetica')
           .fontSize(8)
           .fillColor('#000000');

        // Add data rows
        let currentY = startY + rowHeight;
        let isEvenRow = false;

        filteredData.forEach((entry, index) => {
            // Check if we need a new page
            if (currentY > 750) {
                doc.addPage();
                currentY = 50;
                isEvenRow = false;
                
                // Repeat headers on new page
                doc.font('Helvetica-Bold')
                   .fontSize(9)
                   .fillColor('#333333')
                   .text('Receipt No', startX, currentY)
                   .text('Date', startX + colWidth.receiptNo, currentY)
                   .text('Party', startX + colWidth.receiptNo + colWidth.date, currentY)
                   .text('Amount', startX + colWidth.receiptNo + colWidth.date + colWidth.party, currentY)
                   .text('Payment Mode', startX + colWidth.receiptNo + colWidth.date + colWidth.party + colWidth.amount, currentY)
                   .text('Category Split', startX + colWidth.receiptNo + colWidth.date + colWidth.party + colWidth.amount + colWidth.paymentMode, currentY)
                   .text('Bank', startX + colWidth.receiptNo + colWidth.date + colWidth.party + colWidth.amount + colWidth.paymentMode + colWidth.categorySplit, currentY);
                
                doc.moveTo(startX, currentY + 15)
                   .lineTo(startX + Object.values(colWidth).reduce((a, b) => a + b, 0), currentY + 15)
                   .lineWidth(1)
                   .strokeColor('#cccccc')
                   .stroke();
                
                currentY += rowHeight;
                doc.font('Helvetica')
                   .fontSize(8)
                   .fillColor('#000000');
            }
            
            // Alternate row colors
            if (isEvenRow) {
                doc.rect(startX, currentY - 5, 
                        Object.values(colWidth).reduce((a, b) => a + b, 0), rowHeight)
                   .fillColor('#f5f5f5')
                   .fill();
            }
            isEvenRow = !isEvenRow;
            doc.fillColor('#000000');

            // Format amount with currency
            const formattedAmount = new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(entry.amount || 0);

            // Format category split
            let categorySplitText = '-';
            try {
                if (entry.category_split) {
                    if (entry.category_split.startsWith('[')) {
                        // Parse JSON array
                        const categories = JSON.parse(entry.category_split);
                        categorySplitText = categories.map(c => `${c.name}: ${c.amount}`).join('\n');
                    } else {
                        // Use as plain text
                        categorySplitText = entry.category_split;
                    }
                }
            } catch (e) {
                categorySplitText = entry.category_split || '-';
            }

            // Add row data
            doc.text(entry.receipt_no || '-', startX, currentY);
            doc.text(entry.created_at ? moment(entry.created_at).format('DD/MM/YYYY') : '-', 
                   startX + colWidth.receiptNo, currentY);
            doc.text(entry.party || '-', 
                   startX + colWidth.receiptNo + colWidth.date, currentY);
            doc.text(formattedAmount, 
                   startX + colWidth.receiptNo + colWidth.date + colWidth.party, currentY);
            doc.text(entry.payment_mode || '-', 
                   startX + colWidth.receiptNo + colWidth.date + colWidth.party + colWidth.amount, currentY);
            
            // Category split with multiple lines if needed
            const splitLines = categorySplitText.split('\n');
            splitLines.forEach((line, i) => {
                doc.text(line || '-', 
                       startX + colWidth.receiptNo + colWidth.date + colWidth.party + colWidth.amount + colWidth.paymentMode, 
                       currentY + (i * 12));
            });
            
            doc.text(entry.selected_bank || '-', 
                   startX + colWidth.receiptNo + colWidth.date + colWidth.party + colWidth.amount + colWidth.paymentMode + colWidth.categorySplit, 
                   currentY);

            // Draw row line
            doc.moveTo(startX, currentY + 15)
               .lineTo(startX + Object.values(colWidth).reduce((a, b) => a + b, 0), currentY + 15)
               .lineWidth(0.5)
               .strokeColor('#eeeeee')
               .stroke();
            
            currentY += (splitLines.length > 1 ? splitLines.length * 12 : rowHeight);
        });

        // Add footer with page numbers
        const addPageNumbers = () => {
            const pages = doc.bufferedPageRange();
            for (let i = 0; i < pages.count; i++) {
                doc.switchToPage(i);
                doc.fontSize(8)
                   .text(`Page ${i + 1} of ${pages.count}`, 
                         doc.page.width - 50, 
                         doc.page.height - 20,
                         { align: 'right' });
            }
        };

        // Finalize the PDF
        addPageNumbers();
        doc.end();

    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating PDF',
            error: error.message
        });
    }
};

// Keep your existing handleFieldOptions function
async function handleFieldOptions(req, res) {
    // ... (your existing implementation)
}

module.exports = {
    filterEntryFlow,
    downloadFilteredPdf,
    handleFieldOptions
};