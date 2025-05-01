const db = require('../db');
const moment = require('moment');
const PDFDocument = require('pdfkit');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const ExcelJS = require('exceljs');

// Cache for storing filtered results temporarily
const filterCache = new Map();

// const filterEntryFlow = async (req, res) => {
//     try {
//         const {
//             user_id,
//             book_id,
//             dateFilter,
//             CustomDate,
//             startDate,
//             endDate,
//             entryType,
//             party,
//             reference,
//             category,
//             subCategory,
//             headAccount,
//             paymentMode,
//             grade,
//             customField,
//             Field,
//             party_id // Ensure party_id is parsed correctly
//         } = req.query;

//         console.log('Received query parameters:', req.query);

//         if (!user_id) {
//             return res.status(400).json({ message: "user_id is required" });
//         }

//         if (Field) {
//             return handleFieldOptions(req, res);
//         }

//         const lowerEntryType = entryType?.toLowerCase();
//         if (!lowerEntryType) {
//             return res.status(400).json({ message: "entryType is required for entry filtering" });
//         }

//         let query, table;

//         switch (lowerEntryType) {
//             case 'receipt':
//                 table = 'receipt_entries';
//                 break;
//             case 'transfer':
//                 table = 'transfers';
//                 break;
//             case 'payment':
//                 table = 'payment_entries';
//                 break;
//             default:
//                 return res.status(400).json({ message: "Invalid entry type. Must be receipt, payment, or transfer" });
//         }

//         query = `SELECT * FROM ${table} WHERE user_id = ?`;
//         let params = [user_id];

//         // Add book_id filter if provided
//         if (book_id) {
//             query += ` AND book_id = ?`;
//             params.push(book_id);
//         }

//         // Date Filter
//         if (dateFilter && dateFilter !== 'All') {
//             const normalizedDateFilter = dateFilter.replace(/\s+/g, '').toLowerCase();
//             switch (normalizedDateFilter) {
//                 case 'customdate':
//                     if (!CustomDate) {
//                         return res.status(400).json({ message: "CustomDate is required for CustomDate filter" });
//                     }
//                     const filterDate = moment(CustomDate, 'YYYY-MM-DD', true);
//                     if (!filterDate.isValid()) {
//                         return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
//                     }
//                     query += ` AND DATE(created_at) = ?`;
//                     params.push(filterDate.format('YYYY-MM-DD'));
//                     break;

//                 case 'customperiod':
//                     if (!startDate || !endDate) {
//                         return res.status(400).json({ message: "startDate and endDate are required for CustomPeriod filter" });
//                     }
//                     const start = moment(startDate, 'YYYY-MM-DD', true);
//                     const end = moment(endDate, 'YYYY-MM-DD', true);
//                     if (!start.isValid() || !end.isValid()) {
//                         return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
//                     }
//                     query += ` AND DATE(created_at) BETWEEN ? AND ?`;
//                     params.push(start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'));
//                     break;

//                 case 'currentmonth':
//                     query += ` AND YEAR(created_at) = YEAR(CURRENT_DATE) AND MONTH(created_at) = MONTH(CURRENT_DATE)`;
//                     break;

//                 case 'lastmonth':
//                     query += ` AND YEAR(created_at) = YEAR(CURRENT_DATE - INTERVAL 1 MONTH) 
//                               AND MONTH(created_at) = MONTH(CURRENT_DATE - INTERVAL 1 MONTH)`;
//                     break;

//                 case 'currentfinancialyear':
//                     const currentYear = moment().year();
//                     const currentMonth = moment().month() + 1;
//                     const fyStart = currentMonth >= 4 ? `${currentYear}-04-01` : `${currentYear-1}-04-01`;
//                     const fyEnd = currentMonth >= 4 ? `${currentYear+1}-03-31` : `${currentYear}-03-31`;
//                     query += ` AND DATE(created_at) BETWEEN ? AND ?`;
//                     params.push(fyStart, fyEnd);
//                     break;

//                 case 'lastfinancialyear':
//                     const lastFyYear = moment().year();
//                     const lastFyMonth = moment().month() + 1;
//                     const lastFyStart = lastFyMonth >= 4 ? `${lastFyYear-1}-04-01` : `${lastFyYear-2}-04-01`;
//                     const lastFyEnd = lastFyMonth >= 4 ? `${lastFyYear}-03-31` : `${lastFyYear-1}-03-31`;
//                     query += ` AND DATE(created_at) BETWEEN ? AND ?`;
//                     params.push(lastFyStart, lastFyEnd);
//                     break;

//                 default:
//                     return res.status(400).json({ message: "Invalid date filter" });
//             }
//         }

//         // Party Filter
//         if (party_id) {
//             query += ` AND party_id = ?`;
//             params.push(party_id);
//         }

//         query += ` ORDER BY created_at DESC`;

//         console.log('Executing query:', query);
//         console.log('With parameters:', params);

//         const [results] = await db.query(query, params);

//         // Generate a unique filter ID and cache the results
//         const filterId = uuidv4();
//         filterCache.set(filterId, {
//             data: results,
//             timestamp: Date.now(),
//             filters: req.query
//         });

//         // Set cache expiration (1 hour)
//         setTimeout(() => {
//             filterCache.delete(filterId);
//         }, 3600000);

//         // Create download link
//         const downloadPdfLink = `${req.protocol}://${req.get('host')}/api/filter-flow/download/${filterId}`;

//         res.json({
//             success: true,
//             count: results.length,
//             entries: results,
//             downloadPdfLink: downloadPdfLink
//         });

//     } catch (error) {
//         console.error('Error:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Server error',
//             error: error.message
//         });
//     }
// };



const filterEntryFlow = async (req, res) => {
    try {
        const {
            user_id,
            book_id,
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
            Field,
            party_id
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

        // Add book_id filter if provided
        if (book_id) {
            query += ` AND book_id = ?`;
            params.push(book_id);
        }

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
        if (party_id) {
            const partyIds = party_id.split(',').map(id => id.trim());
            query += ` AND party_id IN (${partyIds.map(() => '?').join(', ')})`;
            params.push(...partyIds);
        }

        // Category Filter
        if (category) {
            const categories = category.split(',').map(cat => cat.trim());
            query += ` AND category IN (${categories.map(() => '?').join(', ')})`;
            params.push(...categories);
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

        // Create download links
        const downloadPdfLink = `${req.protocol}://${req.get('host')}/api/filter-flow/download/${filterId}`;
        const downloadExcelLink = `${req.protocol}://${req.get('host')}/api/filter-flow/download-excel/${filterId}`;

        res.json({
            success: true,
            count: results.length,
            entries: results,
            downloadPdfLink: downloadPdfLink,
            downloadExcelLink: downloadExcelLink
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

        // Add logo (if available)
        // doc.image('path/to/logo.png', 50, 45, { width: 50 });

        // Add header
        doc.fontSize(18)
           .font('Helvetica-Bold')
           .text('ENTRIES REPORT', { align: 'center' })
           .moveDown(0.5);

        // Add report metadata
        doc.fontSize(10)
           .font('Helvetica')
           .text(`Duration: ${new Date().toLocaleString()}`, { align: 'right' })
           .text(`Total Entries: ${filteredData.length}`, { align: 'left' })
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

        if (filters.party && filters.party !== 'All') {
            filtersText += `Party: ${filters.party}\n`;
        }

        if (filters.paymentMode && filters.paymentMode !== 'All') {
            filtersText += `Payment Mode: ${filters.paymentMode}\n`;
        }

        doc.text(filtersText || 'No filters applied')
           .moveDown(1);

        // Define table parameters
        const startX = 30;
        let startY = 220;
        const rowHeight = 25;
        const colWidth = {
            receiptNo: 100,
            date: 80,
            party: 120,
            amount: 80,
            paymentMode: 100,
            status: 60
        };

        // Add table headers
        doc.font('Helvetica-Bold')
           .fontSize(10)
           .fillColor('#333333');

        doc.text('Receipt No', startX, startY);
        doc.text('Date', startX + colWidth.receiptNo, startY);
        doc.text('Party', startX + colWidth.receiptNo + colWidth.date, startY);
        doc.text('Amount', startX + colWidth.receiptNo + colWidth.date + colWidth.party, startY);
        doc.text('Payment Mode', startX + colWidth.receiptNo + colWidth.date + colWidth.party + colWidth.amount, startY);
        doc.text('Status', startX + colWidth.receiptNo + colWidth.date + colWidth.party + colWidth.amount + colWidth.paymentMode, startY);

        // Draw header line
        doc.moveTo(startX, startY + 15)
           .lineTo(startX + Object.values(colWidth).reduce((a, b) => a + b, 0), startY + 15)
           .lineWidth(1)
           .strokeColor('#cccccc')
           .stroke();

        // Reset font for data
        doc.font('Helvetica')
           .fontSize(9)
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
                   .fontSize(10)
                   .fillColor('#333333')
                   .text('Receipt No', startX, currentY)
                   .text('Date', startX + colWidth.receiptNo, currentY)
                   .text('Party', startX + colWidth.receiptNo + colWidth.date, currentY)
                   .text('Amount', startX + colWidth.receiptNo + colWidth.date + colWidth.party, currentY)
                   .text('Payment Mode', startX + colWidth.receiptNo + colWidth.date + colWidth.party + colWidth.amount, currentY)
                   .text('Status', startX + colWidth.receiptNo + colWidth.date + colWidth.party + colWidth.amount + colWidth.paymentMode, currentY);
                
                doc.moveTo(startX, currentY + 15)
                   .lineTo(startX + Object.values(colWidth).reduce((a, b) => a + b, 0), currentY + 15)
                   .lineWidth(1)
                   .strokeColor('#cccccc')
                   .stroke();
                
                currentY += rowHeight;
                doc.font('Helvetica')
                   .fontSize(9)
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

            // Format status with color
            const statusColor = entry.status === 'credit' ? '#009900' : '#ff0000';

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
            
            // Status with color
            doc.fillColor(statusColor)
               .text(entry.status || '-', 
                     startX + colWidth.receiptNo + colWidth.date + colWidth.party + colWidth.amount + colWidth.paymentMode, currentY)
               .fillColor('#000000');

            // Draw row line
            doc.moveTo(startX, currentY + 15)
               .lineTo(startX + Object.values(colWidth).reduce((a, b) => a + b, 0), currentY + 15)
               .lineWidth(0.5)
               .strokeColor('#eeeeee')
               .stroke();
            
            currentY += rowHeight;
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

// const downloadFilteredExcel = async (req, res) => {
//     try {
//         const { filterId } = req.params;
        
//         if (!filterCache.has(filterId)) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Filtered results not found or expired'
//             });
//         }

//         const cacheData = filterCache.get(filterId);
//         const filteredData = cacheData.data;
//         const filters = cacheData.filters;
//         const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

//         // Create a new workbook
//         const workbook = new ExcelJS.Workbook();
//         const worksheet = workbook.addWorksheet('Entries Report');

//         // Add headers
//         const headers = ['Receipt No', 'Date', 'Party', 'Amount', 'Payment Mode', 'Status'];
//         worksheet.addRow(headers);

//         // Add data rows
//         filteredData.forEach(entry => {
//             const row = [
//                 entry.receipt_no || '-',
//                 entry.created_at ? moment(entry.created_at).format('DD/MM/YYYY') : '-',
//                 entry.party || '-',
//                 entry.amount || 0,
//                 entry.payment_mode || '-',
//                 entry.status || '-'
//             ];
//             worksheet.addRow(row);
//         });

//         // Set response headers
//         res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//         res.setHeader('Content-Disposition', `attachment; filename=entries-report-${timestamp}.xlsx`);

//         // Write the workbook to the response
//         await workbook.xlsx.write(res);
//         res.end();
//     } catch (error) {
//         console.error('Error generating Excel:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Error generating Excel',
//             error: error.message
//         });
//     }
// };

// async function handleFieldOptions(req, res) {
//     const { user_id, entryType, dateFilter, CustomDate, startDate, endDate, Field, party_id, category_id ,
//           category_group_id, head_account_id, payment_mode, custom_field_id, Referencer_id, grade_id} = req.query;

//     if (!Field) {
//         return res.status(400).json({ message: "Field parameter is required" });
//     }

//     let table = 'receipt_entries'; 
//     if (entryType) {
//         const lowerEntryType = entryType.toLowerCase();
//         switch (lowerEntryType) {
//             case 'receipt': table = 'receipt_entries'; break;
//             case 'payment': table = 'payment_entries'; break;
//             case 'transfer': table = 'transfers'; break;
//             default:
//                 return res.status(400).json({ message: "Invalid entryType. Must be receipt, payment, or transfer" });
//         }
//     }

//     let params = [];
//     let fieldQuery = '';

//     switch (Field.toLowerCase()) {
//         case 'party':
//     if (party_id) {
        
//         fieldQuery = `
//             SELECT id, party
//             FROM parties
//             WHERE user_id = ? AND id = ?
//             LIMIT 1
//         `;
//         params.push(user_id, party_id);
//     } 
//     else if (dateFilter === 'CustomDate' && CustomDate) {
//         // Filter based on a single CustomDate
//         fieldQuery = `
//             SELECT DISTINCT id, party
//             FROM parties
//             WHERE user_id = ? AND DATE(created_at) = ?
//             ORDER BY party ASC
//         `;
//         params.push(user_id, CustomDate);
//     } 
//     else if (dateFilter === 'CustomPeriod' && startDate && endDate) {
//         // Filter based on a date range
//         fieldQuery = `
//             SELECT DISTINCT id, party
//             FROM parties
//             WHERE user_id = ? AND DATE(created_at) BETWEEN ? AND ?
//             ORDER BY party ASC
//         `;
//         params.push(user_id, startDate, endDate);
//     } 
//     else {
//         // Default case - all parties for user
//         fieldQuery = `
//             SELECT DISTINCT id, party
//             FROM parties
//             WHERE user_id = ?
//             ORDER BY party ASC
//         `;
//         params.push(user_id);
//     }

//     console.log('Party Query:', fieldQuery);
//     console.log('Party Params:', params);

//     try {
//         const [results] = await db.query(fieldQuery, params);
        
//         // If party_id was specified but no results found
//         if (party_id && results.length === 0) {
//             return res.status(404).json({
//                 success: false,
//                 message: `Party with ID ${party_id} not found for this user`
//             });
//         }

//         return res.json({
//             success: true,
//             field: Field,
//             options: results,
//             message: party_id 
//                 ? 'Specific party retrieved' 
//                 : 'Party list retrieved'
//         });
//     } catch (error) {
//         console.error('Database error:', error);
//         return res.status(500).json({
//             success: false,
//             message: 'Failed to retrieve parties',
//             error: error.message
//         });
//     }
//     break;
//     case 'referencer':
//         if (Referencer_id) {
//             // If Referencer_id is provided, return just that specific referencer
//             fieldQuery = `
//                 SELECT id, referencer AS name 
//                 FROM book_referencers 
//                 WHERE user_id = ? AND id = ?
//                 LIMIT 1
//             `;
//             params.push(user_id, Referencer_id);
//         } else if (dateFilter === 'CustomDate' && CustomDate) {
//             // Filter based on the provided CustomDate
//             fieldQuery = `
//                 SELECT id, referencer AS name 
//                 FROM book_referencers 
//                 WHERE user_id = ? AND DATE(created_at) = ?
//                 ORDER BY referencer ASC
//             `;
//             params.push(user_id, CustomDate);
//         } else {
//             // If no date filter is provided, fetch all records for the user
//             fieldQuery = `
//                 SELECT id, referencer AS name 
//                 FROM book_referencers 
//                 WHERE user_id = ?
//                 ORDER BY referencer ASC
//             `;
//             params.push(user_id);
//         }

//         console.log('Referencer Query:', fieldQuery);
//         console.log('Referencer Params:', params);

//         try {
//             const [results] = await db.query(fieldQuery, params);

//             console.log('Referencer Results:', results);

//             return res.json({
//                 success: true,
//                 field: Field,
//                 options: results
//             });
//         } catch (error) {
//             console.error('Database error:', error);
//             return res.status(500).json({
//                 success: false,
//                 message: 'Failed to retrieve referencers',
//                 error: error.message
//             });
//         }
//         break;

//         case 'category':
//             if (category_id) {
//                 // If category_id is provided, return just that specific category
//                 fieldQuery = `
//                     SELECT id, category_name, amount, category_group, user_id, category_group_id, book_id 
//                     FROM categories 
//                     WHERE user_id = ? AND id = ?
//                     LIMIT 1
//                 `;
//                 params.push(user_id, category_id);
//             } else if (dateFilter === 'CustomDate' && CustomDate) {
//                 // Filter based on the provided CustomDate
//                 fieldQuery = `
//                     SELECT id, category_name, amount, category_group, user_id, category_group_id, book_id 
//                     FROM categories 
//                     WHERE user_id = ? AND DATE(created_at) = ?
//                     ORDER BY category_name ASC
//                 `;
//                 params.push(user_id, CustomDate);
//             } else if (dateFilter === 'CustomPeriod' && startDate && endDate) {
//                 // Filter between startDate and endDate
//                 fieldQuery = `
//                     SELECT id, category_name, amount, category_group, user_id, category_group_id, book_id 
//                     FROM categories 
//                     WHERE user_id = ? AND DATE(created_at) BETWEEN ? AND ?
//                     ORDER BY category_name ASC
//                 `;
//                 params.push(user_id, startDate, endDate);
//             } else {
//                 // If no date filter is provided, fetch all records for the user
//                 fieldQuery = `
//                     SELECT id, category_name, amount, category_group, user_id, category_group_id, book_id
//                     FROM categories
//                     WHERE user_id = ?
//                     ORDER BY category_name ASC
//                 `;
//                 params.push(user_id);
//             }

//             console.log('Category Query:', fieldQuery);
//             console.log('Category Params:', params);

//             try {
//                 const [results] = await db.query(fieldQuery, params);

//                 console.log('Category Results:', results);

//                 // Only return id and category_name
//                 const filteredResults = results.map(item => ({
//                     id: item.id,
//                     category_name: item.category_name
//                 }));

//                 return res.json({
//                     success: true,
//                     field: Field,
//                     options: filteredResults
//                 });
//             } catch (error) {
//                 console.error('Database error:', error);
//                 return res.status(500).json({
//                     success: false,
//                     message: 'Failed to retrieve categories',
//                     error: error.message
//                 });
//             }
//             break;  

//             case 'group category':
//                 if (category_group_id) {
//                     // If category_group_id is provided, return just that specific group category
//                     fieldQuery = `
//                         SELECT id, group_name 
//                         FROM category_groups 
//                         WHERE user_id = ? AND id = ?
//                         LIMIT 1
//                     `;
//                     params.push(user_id, category_group_id);
//                 } else if (dateFilter === 'CustomDate' && CustomDate) {
//                     // Filter based on the provided CustomDate
//                     fieldQuery = `
//                         SELECT id, group_name 
//                         FROM category_groups 
//                         WHERE user_id = ? AND DATE(created_at) = ?
//                         ORDER BY group_name ASC
//                     `;
//                     params.push(user_id, CustomDate);
//                 } else {
//                     // If no date filter is provided, fetch all records for the user
//                     fieldQuery = `
//                         SELECT id, group_name 
//                         FROM category_groups 
//                         WHERE user_id = ?
//                         ORDER BY group_name ASC
//                     `;
//                     params.push(user_id);
//                 }
    
//                 console.log('Group Category Query:', fieldQuery);
//                 console.log('Group Category Params:', params);
    
//                 try {
//                     const [results] = await db.query(fieldQuery, params);
    
//                     console.log('Group Category Results:', results);
    
//                     return res.json({
//                         success: true,
//                         field: Field,
//                         options: results
//                     });
//                 } catch (error) {
//                     console.error('Database error:', error);
//                     return res.status(500).json({
//                         success: false,
//                         message: 'Failed to retrieve group categories',
//                         error: error.message
//                     });
//                 }
//                 break;


//                 case 'head account':
//             if (head_account_id) {
//                 // If head_account_id is provided, return just that specific head account
//                 fieldQuery = `
//                     SELECT id, name 
//                     FROM head_accounts 
//                     WHERE user_id = ? AND id = ?
//                     LIMIT 1
//                 `;
//                 params.push(user_id, head_account_id);
//             } else if (dateFilter === 'CustomDate' && CustomDate) {
//                 // Filter based on the provided CustomDate
//                 fieldQuery = `
//                     SELECT id, name 
//                     FROM head_accounts 
//                     WHERE user_id = ? AND DATE(created_at) = ?
//                     ORDER BY name ASC
//                 `;
//                 params.push(user_id, CustomDate);
//             } else {
//                 // If no date filter is provided, fetch all records for the user
//                 fieldQuery = `
//                     SELECT id, name 
//                     FROM head_accounts 
//                     WHERE user_id = ?
//                     ORDER BY name ASC
//                 `;
//                 params.push(user_id);
//             }

//             console.log('Head Account Query:', fieldQuery);
//             console.log('Head Account Params:', params);

//             try {
//                 const [results] = await db.query(fieldQuery, params);

//                 console.log('Head Account Results:', results);

//                 return res.json({
//                     success: true,
//                     field: Field,
//                     options: results
//                 });
//             } catch (error) {
//                 console.error('Database error:', error);
//                 return res.status(500).json({
//                     success: false,
//                     message: 'Failed to retrieve head accounts',
//                     error: error.message
//                 });
//             }
//             break;


//             case 'payment mode':
//             if (payment_mode) {
//                 // If payment_mode is provided, return just that specific payment mode
//                 fieldQuery = `
//                     SELECT DISTINCT id, payment_mode AS name 
//                     FROM ${table} 
//                     WHERE user_id = ? AND payment_mode = ?
//                 `;
//                 params.push(user_id, payment_mode);
//             } else if (dateFilter === 'CustomDate' && CustomDate) {
//                 // Filter based on the provided CustomDate
//                 fieldQuery = `
//                     SELECT DISTINCT id, payment_mode AS name 
//                     FROM ${table} 
//                     WHERE user_id = ? AND DATE(created_at) = ?
//                     ORDER BY payment_mode ASC
//                 `;
//                 params.push(user_id, CustomDate);
//             } else {
//                 // If no date filter is provided, fetch all records for the user
//                 fieldQuery = `
//                     SELECT DISTINCT id, payment_mode AS name 
//                     FROM ${table} 
//                     WHERE user_id = ?
//                     ORDER BY payment_mode ASC
//                 `;
//                 params.push(user_id);
//             }

//             console.log('Payment Mode Query:', fieldQuery);
//             console.log('Payment Mode Params:', params);

//             try {
//                 const [results] = await db.query(fieldQuery, params);

//                 console.log('Payment Mode Results:', results);

//                 return res.json({
//                     success: true,
//                     field: Field,
//                     options: results
//                 });
//             } catch (error) {
//                 console.error('Database error:', error);
//                 return res.status(500).json({
//                     success: false,
//                     message: 'Failed to retrieve payment modes',
//                     error: error.message
//                 });
//             }
//             break;

//             case 'grade':
//                 let gradeQuery = `
//                     SELECT DISTINCT p.grade AS name, p.id AS sort_id
//                     FROM parties p
//                     WHERE p.user_id = ?
//                 `;
//                 params = [user_id];
    
//                 if (grade_id) {
//                     // If grade_id is provided, return just that specific grade
//                     gradeQuery += ` AND p.id = ?`;
//                     params.push(grade_id);
//                 } else if (dateFilter === 'CustomPeriod' && startDate && endDate) {
//                     // Filter based on the provided CustomPeriod
//                     gradeQuery += ` AND DATE(p.created_at) BETWEEN ? AND ?`;
//                     params.push(startDate, endDate);
//                 } else if (dateFilter === 'CustomDate' && CustomDate) {
//                     // Filter based on the provided CustomDate
//                     const filterDate = moment(CustomDate, 'YYYY-MM-DD', true);
//                     if (!filterDate.isValid()) {
//                         return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
//                     }
//                     const formattedDate = filterDate.format('YYYY-MM-DD');
//                     gradeQuery += ` AND DATE(p.created_at) = ?`;
//                     params.push(formattedDate);
//                 }
    
//                 // Order by party id and then by grade name
//                 gradeQuery += ` ORDER BY sort_id ASC, name ASC`;
    
//                 console.log('Grade query:', gradeQuery);
//                 console.log('Grade params:', params);
    
//                 try {
//                     const [gradeResults] = await db.query(gradeQuery, params);
    
//                     // Use party ID as id, and grade as name
//                     const formattedResults = gradeResults.map(result => ({
//                         id: result.sort_id,
//                         name: result.name
//                     }));
    
//                     return res.json({
//                         success: true,
//                         field: Field,
//                         options: formattedResults,
//                         message: gradeResults.length === 0 ? 'No grades found' : 'Grades retrieved successfully'
//                     });
//                 } catch (error) {
//                     console.error('Database error (grade):', error);
//                     return res.status(500).json({
//                         success: false,
//                         message: 'Failed to retrieve grades',
//                         error: error.message
//                     });
//                 }
//                 break;

//             case 'custom field':
//                 if (custom_field_id) {
//                     // If custom_field_id is provided, return just that specific custom field
//                     fieldQuery = `
//                         SELECT id, field_name AS name 
//                         FROM customer_fields 
//                         WHERE user_id = ? AND id = ?
//                         LIMIT 1
//                     `;
//                     params.push(user_id, custom_field_id);
//                 } else if (dateFilter === 'CustomDate' && CustomDate) {
//                     // Filter based on the provided CustomDate
//                     fieldQuery = `
//                         SELECT id, field_name AS name 
//                         FROM customer_fields 
//                         WHERE user_id = ? AND DATE(created_at) = ?
//                         ORDER BY field_name ASC
//                     `;
//                     params.push(user_id, CustomDate);
//                 } else {
//                     // If no date filter is provided, fetch all records for the user
//                     fieldQuery = `
//                         SELECT id, field_name AS name 
//                         FROM customer_fields 
//                         WHERE user_id = ?
//                         ORDER BY field_name ASC
//                     `;
//                     params.push(user_id);
//                 }
    
//                 console.log('Custom Field Query:', fieldQuery);
//                 console.log('Custom Field Params:', params);
    
//                 try {
//                     const [results] = await db.query(fieldQuery, params);
    
//                     console.log('Custom Field Results:', results);
    
//                     return res.json({
//                         success: true,
//                         field: Field,
//                         options: results
//                     });
//                 } catch (error) {
//                     console.error('Database error:', error);
//                     return res.status(500).json({
//                         success: false,
//                         message: 'Failed to retrieve custom fields',
//                         error: error.message
//                     });
//                 }
//                 break;
//         default:
//             return res.status(400).json({ message: "Invalid Field parameter" });
//     }

//     console.log('Field query:', fieldQuery);
//     console.log('Field params:', params);

//     const [results] = await db.query(fieldQuery, params);

//     console.log('Query results:', results);

//     return res.json({
//         success: true,
//         field: Field,
//         options: results
//     });
// }

// async function handleFieldOptions(req, res) {
//     const { user_id, entryType, dateFilter, CustomDate, startDate, endDate, Field, party_id, category_id,
//           category_group_id, head_account_id, payment_mode, custom_field_id, Referencer_id, grade_id } = req.query;

//     if (!Field) {
//         return res.status(400).json({ message: "Field parameter is required" });
//     }

//     let table = 'receipt_entries';
//     if (entryType) {
//         const lowerEntryType = entryType.toLowerCase();
//         switch (lowerEntryType) {
//             case 'receipt': table = 'receipt_entries'; break;
//             case 'payment': table = 'payment_entries'; break;
//             case 'transfer': table = 'transfers'; break;
//             default:
//                 return res.status(400).json({ message: "Invalid entryType. Must be receipt, payment, or transfer" });
//         }
//     }

//     let params = [];
//     let fieldQuery = '';

//     const applyDateFilter = (baseQuery, dateColumn = 'created_at') => {
//         let filteredQuery = baseQuery;
//         const normalizedDateFilter = (dateFilter || '').toLowerCase();

//         if (normalizedDateFilter === 'customdate' && CustomDate) {
//             filteredQuery += ` AND DATE(${dateColumn}) = ?`;
//             params.push(CustomDate);
//         } else if (normalizedDateFilter === 'customperiod' && startDate && endDate) {
//             filteredQuery += ` AND DATE(${dateColumn}) BETWEEN ? AND ?`;
//             params.push(startDate, endDate);
//         } else if (normalizedDateFilter === 'currentmonth') {
//             filteredQuery += ` AND YEAR(${dateColumn}) = YEAR(CURRENT_DATE) AND MONTH(${dateColumn}) = MONTH(CURRENT_DATE)`;
//         } else if (normalizedDateFilter === 'lastmonth') {
//             filteredQuery += ` AND YEAR(${dateColumn}) = YEAR(CURRENT_DATE - INTERVAL 1 MONTH) 
//                                AND MONTH(${dateColumn}) = MONTH(CURRENT_DATE - INTERVAL 1 MONTH)`;
//         } else if (normalizedDateFilter === 'currentfinanceyear') {
//             const currentYear = moment().year();
//             const currentMonth = moment().month() + 1;
//             const fyStart = currentMonth >= 4 ? `${currentYear}-04-01` : `${currentYear - 1}-04-01`;
//             const fyEnd = currentMonth >= 4 ? `${currentYear + 1}-03-31` : `${currentYear}-03-31`;
//             filteredQuery += ` AND DATE(${dateColumn}) BETWEEN ? AND ?`;
//             params.push(fyStart, fyEnd);
//         } else if (normalizedDateFilter === 'lastfinanceyear') {
//             const lastFyYear = moment().year();
//             const lastFyMonth = moment().month() + 1;
//             const lastFyStart = lastFyMonth >= 4 ? `${lastFyYear - 1}-04-01` : `${lastFyYear - 2}-04-01`;
//             const lastFyEnd = lastFyMonth >= 4 ? `${lastFyYear}-03-31` : `${lastFyYear - 1}-03-31`;
//             filteredQuery += ` AND DATE(${dateColumn}) BETWEEN ? AND ?`;
//             params.push(lastFyStart, lastFyEnd);
//         }

//         return filteredQuery;
//     };

//     switch (Field.toLowerCase()) {
//         case 'party':
//             if (party_id) {
//                 fieldQuery = `
//                     SELECT id, party
//                     FROM parties
//                     WHERE user_id = ? AND id = ?
//                     LIMIT 1
//                 `;
//                 params.push(user_id, party_id);
//             } else {
//                 fieldQuery = `
//                     SELECT DISTINCT id, party
//                     FROM parties
//                     WHERE user_id = ?
//                 `;
//                 params.push(user_id);
//                 fieldQuery = applyDateFilter(fieldQuery);
//                 fieldQuery += ` ORDER BY party ASC`;
//             }
//             break;

//         case 'referencer':
//             if (Referencer_id) {
//                 fieldQuery = `
//                     SELECT id, referencer AS name 
//                     FROM book_referencers 
//                     WHERE user_id = ? AND id = ?
//                     LIMIT 1
//                 `;
//                 params.push(user_id, Referencer_id);
//             } else {
//                 fieldQuery = `
//                     SELECT id, referencer AS name 
//                     FROM book_referencers 
//                     WHERE user_id = ?
//                 `;
//                 params.push(user_id);
//                 fieldQuery = applyDateFilter(fieldQuery);
//                 fieldQuery += ` ORDER BY referencer ASC`;
//             }
//             break;

//         case 'category':
//             if (category_id) {
//                 fieldQuery = `
//                     SELECT id, category_name, amount, category_group, user_id, category_group_id, book_id 
//                     FROM categories 
//                     WHERE user_id = ? AND id = ?
//                     LIMIT 1
//                 `;
//                 params.push(user_id, category_id);
//             } else {
//                 fieldQuery = `
//                     SELECT id, category_name, amount, category_group, user_id, category_group_id, book_id 
//                     FROM categories 
//                     WHERE user_id = ?
//                 `;
//                 params.push(user_id);
//                 fieldQuery = applyDateFilter(fieldQuery);
//                 fieldQuery += ` ORDER BY category_name ASC`;
//             }
//             break;

//         case 'group category':
//             if (category_group_id) {
//                 fieldQuery = `
//                     SELECT id, group_name 
//                     FROM category_groups 
//                     WHERE user_id = ? AND id = ?
//                     LIMIT 1
//                 `;
//                 params.push(user_id, category_group_id);
//             } else {
//                 fieldQuery = `
//                     SELECT id, group_name 
//                     FROM category_groups 
//                     WHERE user_id = ?
//                 `;
//                 params.push(user_id);
//                 fieldQuery = applyDateFilter(fieldQuery);
//                 fieldQuery += ` ORDER BY group_name ASC`;
//             }
//             break;

//         case 'head account':
//             if (head_account_id) {
//                 fieldQuery = `
//                     SELECT id, name 
//                     FROM head_accounts 
//                     WHERE user_id = ? AND id = ?
//                     LIMIT 1
//                 `;
//                 params.push(user_id, head_account_id);
//             } else {
//                 fieldQuery = `
//                     SELECT id, name 
//                     FROM head_accounts 
//                     WHERE user_id = ?
//                 `;
//                 params.push(user_id);
//                 fieldQuery = applyDateFilter(fieldQuery);
//                 fieldQuery += ` ORDER BY name ASC`;
//             }
//             break;

//         case 'payment mode':
//             if (payment_mode) {
//                 fieldQuery = `
//                     SELECT DISTINCT id, payment_mode AS name 
//                     FROM ${table} 
//                     WHERE user_id = ? AND payment_mode = ?
//                 `;
//                 params.push(user_id, payment_mode);
//             } else {
//                 fieldQuery = `
//                     SELECT DISTINCT id, payment_mode AS name 
//                     FROM ${table} 
//                     WHERE user_id = ?
//                 `;
//                 params.push(user_id);
//                 fieldQuery = applyDateFilter(fieldQuery);
//                 fieldQuery += ` ORDER BY payment_mode ASC`;
//             }
//             break;

//         case 'grade':
//             if (grade_id) {
//                 fieldQuery = `
//                     SELECT DISTINCT p.grade AS name, p.id AS sort_id
//                     FROM parties p
//                     WHERE p.user_id = ? AND p.id = ?
//                 `;
//                 params.push(user_id, grade_id);
//             } else {
//                 fieldQuery = `
//                     SELECT DISTINCT p.grade AS name, p.id AS sort_id
//                     FROM parties p
//                     WHERE p.user_id = ?
//                 `;
//                 params.push(user_id);
//                 fieldQuery = applyDateFilter(fieldQuery, 'p.created_at');
//                 fieldQuery += ` ORDER BY sort_id ASC, name ASC`;
//             }
//             break;

//         case 'custom field':
//             if (custom_field_id) {
//                 fieldQuery = `
//                     SELECT id, field_name AS name 
//                     FROM customer_fields 
//                     WHERE user_id = ? AND id = ?
//                 `;
//                 params.push(user_id, custom_field_id);
//             } else {
//                 fieldQuery = `
//                     SELECT id, field_name AS name 
//                     FROM customer_fields 
//                     WHERE user_id = ?
//                 `;
//                 params.push(user_id);
//             }
//             fieldQuery = applyDateFilter(fieldQuery);
//             fieldQuery += ` ORDER BY field_name ASC`;
//             break;

//         default:
//             return res.status(400).json({ message: "Invalid Field parameter" });
//     }

//     console.log('Field query:', fieldQuery);
//     console.log('Field params:', params);

//     try {
//         const [results] = await db.query(fieldQuery, params);

//         // For category field, only return id and category_name
//         if (Field.toLowerCase() === 'category') {
//             const filteredResults = results.map(item => ({
//                 id: item.id,
//                 category_name: item.category_name
//             }));
//             return res.json({
//                 success: true,
//                 field: Field,
//                 options: filteredResults
//             });
//         }

//         return res.json({
//             success: true,
//             field: Field,
//             options: results
//         });
//     } catch (error) {
//         console.error('Database error:', error);
//         return res.status(500).json({
//             success: false,
//             message: `Failed to retrieve ${Field}`,
//             error: error.message
//         });
//     }
// }

const downloadFilteredExcel = async (req, res) => {
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

        // Create a new workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Entries Report');

        // Dynamically generate headers based on the first entry's keys
        const headers = Object.keys(filteredData[0] || {}).map(key => key.replace(/_/g, ' '));
        worksheet.addRow(headers);

        // Add data rows
        filteredData.forEach(entry => {
            const row = headers.map(header => {
                const key = header.replace(/ /g, '_');
                return entry[key] || '-';
            });
            worksheet.addRow(row);
        });

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=entries-report-${timestamp}.xlsx`);

        // Write the workbook to the response
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error generating Excel:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating Excel',
            error: error.message
        });
    }
};

async function handleFieldOptions(req, res) {
    const { user_id, entryType, dateFilter, CustomDate, startDate, endDate, Field, party_id, category_id,
          category_group_id, head_account_id, payment_mode, custom_field_id, Referencer_id, grade_id } = req.query;

    if (!Field) {
        return res.status(400).json({ message: "Field parameter is required" });
    }

    let table = 'receipt_entries';
    if (entryType) {
        const lowerEntryType = entryType.toLowerCase();
        switch (lowerEntryType) {
            case 'receipt': table = 'receipt_entries'; break;
            case 'payment': table = 'payment_entries'; break;
            case 'transfer': table = 'transfers'; break;
            default:
                return res.status(400).json({ message: "Invalid entryType. Must be receipt, payment, or transfer" });
        }
    }

    let params = [];
    let fieldQuery = '';

    const applyDateFilter = (baseQuery, dateColumn = 'created_at') => {
        let filteredQuery = baseQuery;
        const normalizedDateFilter = (dateFilter || '').toLowerCase();

        if (normalizedDateFilter === 'customdate' && CustomDate) {
            filteredQuery += ` AND DATE(${dateColumn}) = ?`;
            params.push(CustomDate);
        } else if (normalizedDateFilter === 'customperiod' && startDate && endDate) {
            filteredQuery += ` AND DATE(${dateColumn}) BETWEEN ? AND ?`;
            params.push(startDate, endDate);
        } else if (normalizedDateFilter === 'currentmonth') {
            filteredQuery += ` AND YEAR(${dateColumn}) = YEAR(CURRENT_DATE) AND MONTH(${dateColumn}) = MONTH(CURRENT_DATE)`;
        } else if (normalizedDateFilter === 'lastmonth') {
            filteredQuery += ` AND YEAR(${dateColumn}) = YEAR(CURRENT_DATE - INTERVAL 1 MONTH) 
                               AND MONTH(${dateColumn}) = MONTH(CURRENT_DATE - INTERVAL 1 MONTH)`;
        } else if (normalizedDateFilter === 'currentfinanceyear') {
            const currentYear = moment().year();
            const currentMonth = moment().month() + 1;
            const fyStart = currentMonth >= 4 ? `${currentYear}-04-01` : `${currentYear - 1}-04-01`;
            const fyEnd = currentMonth >= 4 ? `${currentYear + 1}-03-31` : `${currentYear}-03-31`;
            filteredQuery += ` AND DATE(${dateColumn}) BETWEEN ? AND ?`;
            params.push(fyStart, fyEnd);
        } else if (normalizedDateFilter === 'lastfinanceyear') {
            const lastFyYear = moment().year();
            const lastFyMonth = moment().month() + 1;
            const lastFyStart = lastFyMonth >= 4 ? `${lastFyYear - 1}-04-01` : `${lastFyYear - 2}-04-01`;
            const lastFyEnd = lastFyMonth >= 4 ? `${lastFyYear}-03-31` : `${lastFyYear - 1}-03-31`;
            filteredQuery += ` AND DATE(${dateColumn}) BETWEEN ? AND ?`;
            params.push(lastFyStart, lastFyEnd);
        }

        return filteredQuery;
    };

    switch (Field.toLowerCase()) {
        case 'party':
            if (party_id) {
                const partyIds = party_id.split(',').map(id => id.trim());
                fieldQuery = `
                    SELECT id, party
                    FROM parties
                    WHERE user_id = ? AND id IN (${partyIds.map(() => '?').join(', ')})
                `;
                params.push(user_id, ...partyIds);
            } else {
                fieldQuery = `
                    SELECT DISTINCT id, party
                    FROM parties
                    WHERE user_id = ?
                `;
                params.push(user_id);
                fieldQuery = applyDateFilter(fieldQuery);
                fieldQuery += ` ORDER BY party ASC`;
            }
            break;

        case 'referencer':
            if (Referencer_id) {
                const referencerIds = Referencer_id.split(',').map(id => id.trim());
                fieldQuery = `
                    SELECT id, referencer AS name 
                    FROM book_referencers 
                    WHERE user_id = ? AND id IN (${referencerIds.map(() => '?').join(', ')})
                `;
                params.push(user_id, ...referencerIds);
            } else {
                fieldQuery = `
                    SELECT id, referencer AS name 
                    FROM book_referencers 
                    WHERE user_id = ?
                `;
                params.push(user_id);
                fieldQuery = applyDateFilter(fieldQuery);
                fieldQuery += ` ORDER BY referencer ASC`;
            }
            break;

        case 'category':
            if (category_id) {
                const categoryIds = category_id.split(',').map(id => id.trim());
                fieldQuery = `
                    SELECT id, category_name, amount, category_group, user_id, category_group_id, book_id 
                    FROM categories 
                    WHERE user_id = ? AND id IN (${categoryIds.map(() => '?').join(', ')})
                `;
                params.push(user_id, ...categoryIds);
            } else {
                fieldQuery = `
                    SELECT id, category_name, amount, category_group, user_id, category_group_id, book_id 
                    FROM categories 
                    WHERE user_id = ?
                `;
                params.push(user_id);
                fieldQuery = applyDateFilter(fieldQuery);
                fieldQuery += ` ORDER BY category_name ASC`;
            }
            break;

        case 'group category':
            if (category_group_id) {
                const categoryGroupIds = category_group_id.split(',').map(id => id.trim());
                fieldQuery = `
                    SELECT id, group_name 
                    FROM category_groups 
                    WHERE user_id = ? AND id IN (${categoryGroupIds.map(() => '?').join(', ')})
                `;
                params.push(user_id, ...categoryGroupIds);
            } else {
                fieldQuery = `
                    SELECT id, group_name 
                    FROM category_groups 
                    WHERE user_id = ?
                `;
                params.push(user_id);
                fieldQuery = applyDateFilter(fieldQuery);
                fieldQuery += ` ORDER BY group_name ASC`;
            }
            break;

        case 'head account':
            if (head_account_id) {
                const headAccountIds = head_account_id.split(',').map(id => id.trim());
                fieldQuery = `
                    SELECT id, name 
                    FROM head_accounts 
                    WHERE user_id = ? AND id IN (${headAccountIds.map(() => '?').join(', ')})
                `;
                params.push(user_id, ...headAccountIds);
            } else {
                fieldQuery = `
                    SELECT id, name 
                    FROM head_accounts 
                    WHERE user_id = ?
                `;
                params.push(user_id);
                fieldQuery = applyDateFilter(fieldQuery);
                fieldQuery += ` ORDER BY name ASC`;
            }
            break;

        case 'payment mode':
            if (payment_mode) {
                const paymentModes = payment_mode.split(',').map(mode => mode.trim());
                fieldQuery = `
                    SELECT DISTINCT id, payment_mode AS name 
                    FROM ${table} 
                    WHERE user_id = ? AND payment_mode IN (${paymentModes.map(() => '?').join(', ')})
                `;
                params.push(user_id, ...paymentModes);
            } else {
                fieldQuery = `
                    SELECT DISTINCT id, payment_mode AS name 
                    FROM ${table} 
                    WHERE user_id = ?
                `;
                params.push(user_id);
                fieldQuery = applyDateFilter(fieldQuery);
                fieldQuery += ` ORDER BY payment_mode ASC`;
            }
            break;

        case 'grade':
            if (grade_id) {
                const gradeIds = grade_id.split(',').map(id => id.trim());
                fieldQuery = `
                    SELECT DISTINCT p.grade AS name, p.id AS sort_id
                    FROM parties p
                    WHERE p.user_id = ? AND p.id IN (${gradeIds.map(() => '?').join(', ')})
                `;
                params.push(user_id, ...gradeIds);
            } else {
                fieldQuery = `
                    SELECT DISTINCT p.grade AS name, p.id AS sort_id
                    FROM parties p
                    WHERE p.user_id = ?
                `;
                params.push(user_id);
                fieldQuery = applyDateFilter(fieldQuery, 'p.created_at');
                fieldQuery += ` ORDER BY sort_id ASC, name ASC`;
            }
            break;

        case 'custom field':
            if (custom_field_id) {
                const customFieldIds = custom_field_id.split(',').map(id => id.trim());
                fieldQuery = `
                    SELECT id, field_name AS name 
                    FROM customer_fields 
                    WHERE user_id = ? AND id IN (${customFieldIds.map(() => '?').join(', ')})
                `;
                params.push(user_id, ...customFieldIds);
            } else {
                fieldQuery = `
                    SELECT id, field_name AS name 
                    FROM customer_fields 
                    WHERE user_id = ?
                `;
                params.push(user_id);
            }
            fieldQuery = applyDateFilter(fieldQuery);
            fieldQuery += ` ORDER BY field_name ASC`;
            break;

        default:
            return res.status(400).json({ message: "Invalid Field parameter" });
    }

    console.log('Field query:', fieldQuery);
    console.log('Field params:', params);

    try {
        const [results] = await db.query(fieldQuery, params);

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

        // Create download links
        const downloadExcelLink = `${req.protocol}://${req.get('host')}/api/filter-flow/download-excel/${filterId}`;

        // For category field, only return id and category_name
        if (Field.toLowerCase() === 'category') {
            const filteredResults = results.map(item => ({
                id: item.id,
                category_name: item.category_name
            }));
            return res.json({
                success: true,
                field: Field,
                options: filteredResults,
                downloadExcelLink: downloadExcelLink
            });
        }

        return res.json({
            success: true,
            field: Field,
            options: results,
            downloadExcelLink: downloadExcelLink
        });
    } catch (error) {
        console.error('Database error:', error);
        return res.status(500).json({
            success: false,
            message: `Failed to retrieve ${Field}`,
            error: error.message
        });
    }
}

module.exports = {
    filterEntryFlow,
    downloadFilteredPdf,
    downloadFilteredExcel,
    handleFieldOptions
};




