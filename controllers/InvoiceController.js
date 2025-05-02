const express = require('express');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const db = require("../db"); // Ensure this module exports a function to get a database connection

const pdfsDir = path.join(__dirname, '..', 'pdfs');
if (!fs.existsSync(pdfsDir)) {
    fs.mkdirSync(pdfsDir);
}

// Function to generate PDF invoice in the format of the provided template
// const generateInvoicePDF = (invoiceData, filePath) => {
//     return new Promise((resolve, reject) => {
//         const doc = new PDFDocument({ size: 'A4', margin: 50 });
//         const writeStream = fs.createWriteStream(filePath);

//         doc.pipe(writeStream);

//         // Set font styles
//         const boldFont = 'Helvetica-Bold';
//         const regularFont = 'Helvetica';

//         // Header Section
//         doc.font(boldFont).fontSize(16).text('AMRUTKAR AND ASSOCIATES', 50, 50);
//         doc.font(regularFont).fontSize(10).text('201, 2ND FLOOR, JALGAON-425001', 50, 70);
        
//         // Logo placeholder
//         // Ensure the path to the logo is correct
//         const logoPath = path.join(__dirname, '..', 'uploads', 'logo.jpeg');

//         doc.image(logoPath, { width: 100, height: 50, x: 500, y: 30 });

//         // Bill To Section
//         doc.moveDown(2);
//         doc.font(boldFont).fontSize(12).text('BILL TO', 50, 120);
//         doc.font(regularFont).fontSize(10).text(invoiceData.customer_or_supplier, 50, 140);
//         doc.font(regularFont).fontSize(10).text('JALGAON', 50, 155);
//         doc.font(regularFont).fontSize(10).text(`MOBILE NO : ${invoiceData.mobile_number || 'N/A'}`, 50, 170);

//         // Invoice Details
//         doc.font(regularFont).fontSize(10).text(`INVOICE NO-${invoiceData.invoiceId}`, { align: 'right', x: 500, y: 120 });
//         doc.font(regularFont).fontSize(10).text(`DATE-${invoiceData.invoice_date}`, { align: 'right', x: 500, y: 135 });

//         // Items Table Header
//         doc.moveDown(4);
//         doc.font(boldFont).fontSize(12).text('PARTICULARS', 50, 220);
//         doc.font(boldFont).fontSize(12).text('AMOUNT (RS)', { align: 'right', x: 500, y: 220 });
        
//         // Draw a line under the header
//         doc.moveTo(50, 240).lineTo(550, 240).stroke();

//         // Items List
//         let y = 250;
//         invoiceData.items.forEach((item) => {
//             doc.font(regularFont).fontSize(10).text(`Item ${item.item_name} (${item.remark || ''})`, 50, y);
//             doc.font(regularFont).fontSize(10).text(item.taxable_amount.toFixed(2), { align: 'right', x: 500, y });
//             y += 20;
//         });

//         // Totals Section
//         y += 10;
//         doc.font(regularFont).fontSize(10).text('Round off', 50, y);
//         doc.font(regularFont).fontSize(10).text(invoiceData.totals.round_off.toFixed(2), { align: 'right', x: 500, y });
//         y += 20;

//         doc.font(boldFont).fontSize(10).text('Total', 50, y);
//         doc.font(boldFont).fontSize(10).text(invoiceData.totals.taxable.toFixed(2), { align: 'right', x: 500, y });
//         y += 20;

//         doc.font(regularFont).fontSize(10).text('Discount', 50, y);
//         doc.font(regularFont).fontSize(10).text(invoiceData.totals.discount.toFixed(2), { align: 'right', x: 500, y });
//         y += 20;

//         doc.font(boldFont).fontSize(12).text('Final Amount', 50, y);
//         doc.font(boldFont).fontSize(12).text(invoiceData.totals.grand_total.toFixed(2), { align: 'right', x: 500, y });
//         y += 30;

//         // Footer Section
//         doc.font(regularFont).fontSize(10).text(invoiceData.bank_name || 'SBI', 50, y);
//         doc.font(regularFont).fontSize(10).text('For AMRUTKAR AND ASSOCIATES', 50, y + 20);
//         doc.font(regularFont).fontSize(10).text('(Attach Sign Here)', 50, y + 40);
//         doc.font(regularFont).fontSize(10).text('Authorized Signatory', 50, y + 60);

//         // End the PDF document
//         doc.end();

//         writeStream.on('finish', () => {
//             resolve(filePath);
//         });

//         writeStream.on('error', (err) => {
//             reject(err);
//         });
//     });
// };
const generateInvoicePDF = (invoiceData, filePath) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        const bold = 'Helvetica-Bold';
        const regular = 'Helvetica';

        // Load images
        const logoPath = path.join(__dirname, '..', 'uploads', 'LOGO_LEDGER BOOK-1.png');
        const avatarPath = path.join(__dirname, '..', 'uploads', 'avatar.jpeg'); // placeholder for round image

        // Header
        doc.font(bold).fontSize(14).text('AMRUTKAR AND ASSOCIATES', 50, 40);
        doc.font(regular).fontSize(10).text('201, 2ND FLOOR, JALGAON–425001', 50, 60);

        // Logo
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 480, 35, { width: 70, height: 35 });
        }

        // BILL TO
        doc.font(bold).fontSize(10).text('BILL TO', 50, 100);
        doc.font(regular).text(invoiceData.customer_or_supplier, 50, 115);
        doc.text('JALGAON', 50, 130);
        doc.text(`MOBILE NO : ${invoiceData.mobile_number || 'N/A'}`, 50, 145);

        // Avatar / User icon
        if (fs.existsSync(avatarPath)) {
            doc.circle(500 + 15, 105 + 15, 15).clip().image(avatarPath, 500, 105, { width: 30, height: 30 }).restore();
        }

        // Invoice Info
        doc.font(regular).text(`INVOICE NO–${invoiceData.invoiceId}`, 450, 105);
        doc.text(`DATE–${invoiceData.invoice_date}`, 450, 120);
        doc.fillColor('red').fontSize(8).text('DUE DATE [NOT TO BE PRINTED ON INVOICE]', 450, 135).fillColor('black');

        // Table Header
        doc.moveTo(50, 170).lineTo(550, 170).stroke();
        doc.font(bold).fontSize(10).text('PARTICULARS', 50, 175);
        doc.text('AMOUNT (RS)', 450, 175);
        doc.moveTo(50, 195).lineTo(550, 195).stroke();

        // Items
        let y = 200;
        invoiceData.items.forEach((item, index) => {
            doc.font(regular).fontSize(10).text(`Item ${item.item_name} (${item.remark || ''})`, 50, y);
            doc.text(item.taxable_amount.toFixed(2), 450, y);
            y += 20;
        });

        // Total Section
        doc.moveTo(50, y).lineTo(550, y).stroke();
        y += 10;
        doc.text('Round off', 50, y);
        doc.text(invoiceData.totals.round_off.toFixed(2), 450, y);
        y += 20;
        doc.font(bold).text('Total', 50, y);
        doc.text(invoiceData.totals.taxable.toFixed(2), 450, y);
        y += 20;
        doc.font(regular).text('Discount', 50, y);
        doc.text(invoiceData.totals.discount.toFixed(2), 450, y);
        y += 20;
        doc.font(bold).fontSize(11).text('Final Amount', 50, y);
        doc.fillColor('green').fontSize(12).text(invoiceData.totals.grand_total.toFixed(2), 450, y);
        doc.fillColor('black');
        y += 30;

        // Footer
        doc.font(regular).fontSize(10).text(invoiceData.bank_name || 'SBI', 50, y);
        doc.text('For AMRUTKAR AND ASSOCIATES', 350, y);
        doc.text('(Attach Sign Here)', 350, y + 20);
        doc.text('Authorized Signatory.', 350, y + 40);

        // Finalize
        doc.end();
        writeStream.on('finish', () => resolve(filePath));
        writeStream.on('error', (err) => reject(err));
    });
};

exports.addInvoice = async (req, res) => {
  try {
    const { 
      type, 
      customer_or_supplier, 
      invoice_date, 
      discount_amount = 0.00, 
      percentage = "0%", 
      round_off = 0.00, 
      items,
      user_id,
      book_id,
      bank_account_id,
      gstin,
      businessId
    } = req.body;

    // 1) Basic validation
    if (
      !type || !customer_or_supplier || !invoice_date ||
      !user_id || !Array.isArray(items) || items.length === 0 ||
      !book_id || !bank_account_id || !businessId
    ) {
      return res.status(400).json({ 
        error: "Missing required fields",
        missing_fields: {
          type: !type,
          customer_or_supplier: !customer_or_supplier,
          invoice_date: !invoice_date,
          user_id: !user_id,
          items: !items || items.length === 0,
          book_id: !book_id,
          bank_account_id: !bank_account_id,
          businessId: !businessId
        }
      });
    }

    // 2) Fetch user & bank details
    const [u] = await db.query(
      'SELECT name, phone_number, email FROM users WHERE id = ?', 
      [user_id]
    );
    if (u.length === 0) return res.status(400).json({ error: "User not found" });
    const { phone_number } = u[0];

    const [b] = await db.query(
      'SELECT bank_name FROM bank_accounts WHERE id = ?', 
      [bank_account_id]
    );
    if (b.length === 0) return res.status(400).json({ error: "Bank account not found" });
    const { bank_name } = b[0];

    // 3) Generate next InvoiceNo
    const [lastInv] = await db.query(
      'SELECT InvoiceNo FROM invoices ORDER BY id DESC LIMIT 1'
    );
    let newInvoiceNo = 'INV00001';
    if (lastInv.length && lastInv[0].InvoiceNo) {
      const n = parseInt(lastInv[0].InvoiceNo.match(/\d+/)[0], 10) + 1;
      newInvoiceNo = `INV${String(n).padStart(5, '0')}`;
    }

    // 4) Compute totals
    const total_taxable = items.reduce((sum, it) => sum + Number(it.taxable_amount||0), 0);
    const total_cgst    = items.reduce((sum, it) =>
                          sum + ((Number(it.taxable_amount||0) * (Number(it.tax_rate||0)/2)) / 100),
                          0);
    const total_sgst = total_cgst;
    const total_igst = 0.00; 
    const total_amount = total_taxable + total_cgst + total_sgst
                         - discount_amount + round_off;

    // grab an hsn_code from first item just to satisfy invoice-level column
    const hsn_code = items[0]?.hsn_code || '';

    // 5) Start transaction
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // 5a) Insert into invoices
      const [invRes] = await conn.query(
        `INSERT INTO invoices
           (type, customer_or_supplier, invoice_date, total_taxable,
            cgst, sgst, igst, total_amount, discount_amount,
            percentage, round_off, user_id, book_id, bank_account_id,
            hsn_code, gstin, InvoiceNo, business_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          type, customer_or_supplier, invoice_date, total_taxable,
          total_cgst, total_sgst, total_igst, total_amount,
          discount_amount, percentage, round_off,
          user_id, book_id, bank_account_id,
          hsn_code, gstin, newInvoiceNo, businessId
        ]
      );
      const invoiceId = invRes.insertId;

      // 5b) Insert each item into invoice_items
      for (const item of items) {
        // validate the FK
        const [chk] = await conn.query(
          'SELECT id FROM items WHERE id = ?', 
          [item.item_id]
        );
        if (chk.length === 0) {
          throw new Error(`Item ID ${item.item_id} not found`);
        }

        // parse "500 kg" → quantity=500, quantity_unit="kg"
        let quantity = 0.00, quantity_unit = '';
        if (item.quantity_unit) {
          const parts = item.quantity_unit.trim().split(' ');
          quantity = parseFloat(parts[0]) || 0;
          quantity_unit = parts.slice(1).join(' ') || '';
        }

        await conn.query(
          `INSERT INTO invoice_items
             (user_id, book_id, business_id, invoice_id,
              item_id, item_name, hsn_code, quantity_unit,
              quantity, rate_per_unit, tax_rate,
              taxable_amount, remark)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            user_id, book_id, businessId, invoiceId,
            item.item_id, item.item_name, item.hsn_code,
            quantity_unit, quantity,
            item.rate_per_unit, item.tax_rate,
            item.taxable_amount, item.remark||''
          ]
        );
      }

      await conn.commit();

      // 6) Generate PDF & respond
      const invoiceData = {
        invoiceId, type, customer_or_supplier,
        invoice_date, mobile_number: phone_number,
        bank_name, items,
        totals: {
          taxable: total_taxable, cgst: total_cgst,
          sgst: total_sgst, igst: total_igst,
          discount: discount_amount, round_off, grand_total: total_amount
        },
        user_id, gstin, InvoiceNo: newInvoiceNo
      };
      const filePath = path.join(pdfsDir, `invoice_${invoiceId}.pdf`);
      await generateInvoicePDF(invoiceData, filePath);

      return res.status(200).json({
        success: true,
        message: "Invoice generated successfully",
        downloadLink: `/download/invoice_${invoiceId}.pdf`,
        invoiceId, InvoiceNo: newInvoiceNo
      });

    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

  } catch (error) {
    console.error("Error adding invoice:", error);
    res.status(500).json({
      error: error.message || "Internal Server Error",
      sqlError: error.sqlMessage,
      code: "INVOICE_CREATION_FAILED"
    });
  }
};


// ✅ Download PDF
exports.downloadPDF = async (req, res) => {
    const { id } = req.params;
    const filePath = path.join(pdfsDir, `invoice_${id}.pdf`);

    if (fs.existsSync(filePath)) {
        res.download(filePath, (err) => {
            if (err) {
                console.error('Error downloading file:', err);
                res.status(500).send('Error downloading file');
            }
        });
    } else {
        res.status(404).send('File not found');
    }
};

// ✅ Get all invoices (filtered by user_id and optionally by type)
// exports.getInvoices = async (req, res) => {
//     try {
//         const { 
//             type, 
//             user_id, 
//             businessId,
//             bookId,
//             debug,
//             start_date,
//             end_date
//         } = req.query;

//         // Validate required parameters
//         if (!user_id) {
//             return res.status(400).json({ 
//                 error: "user_id is required",
//                 code: "USER_ID_REQUIRED"
//             });
//         }

//         // OPTION 2: Separate queries with manual joining (more reliable)
//         const getInvoicesSeparateQueries = async () => {
//             // Get base invoices
//             let invoiceSql = `SELECT * FROM invoices WHERE user_id = ?`;
//             const invoiceParams = [user_id];
            
//             // Add businessId filter if provided
//             if (businessId) {
//                 invoiceSql += ` AND business_id = ?`;
//                 invoiceParams.push(businessId);
//             }
            
//             // Add bookId filter if provided (only if businessId is also provided)
//             if (bookId && businessId) {
//                 invoiceSql += ` AND book_id = ?`;
//                 invoiceParams.push(bookId);
//             }
            
//             if (type) {
//                 invoiceSql += ` AND type = ?`;
//                 invoiceParams.push(type);
//             }
            
//             // Add date range filtering if provided
//             if (start_date && end_date) {
//                 invoiceSql += ` AND invoice_date BETWEEN ? AND ?`;
//                 invoiceParams.push(start_date, end_date);
//             } else if (start_date) {
//                 invoiceSql += ` AND invoice_date >= ?`;
//                 invoiceParams.push(start_date);
//             } else if (end_date) {
//                 invoiceSql += ` AND invoice_date <= ?`;
//                 invoiceParams.push(end_date);
//             }
            
//             invoiceSql += ` ORDER BY invoice_date DESC`;
            
//             const [invoices] = await db.query(invoiceSql, invoiceParams);

//             // Return early if no invoices found
//             if (invoices.length === 0) {
//                 return [];
//             }

//             // Get all items for these invoices
//             const [items] = await db.query(
//                 `SELECT * FROM invoice_items WHERE invoice_id IN (?)`,
//                 [invoices.map(i => i.id)]
//             );

//             // Group items by invoice_id
//             const itemsMap = items.reduce((map, item) => {
//                 if (!map[item.invoice_id]) map[item.invoice_id] = [];
//                 map[item.invoice_id].push({
//                     item_name: item.item_name,
//                     taxable_amount: item.taxable_amount,
//                     remark: item.remark,
//                     hsn_code: item.hsn_code,
//                     quantity_unit: item.quantity_unit,
//                     rate_per_unit: item.rate_per_unit,
//                     tax_rate: item.tax_rate
//                 });
//                 return map;
//             }, {});

//             // Combine invoices with their items
//             return invoices.map(invoice => ({
//                 ...invoice,
//                 items: itemsMap[invoice.id] || []
//             }));
//         };

//         const invoices = await getInvoicesSeparateQueries();

//         // Debug information if requested
//         const debugInfo = debug ? {
//             query_used: 'separate',
//             filters: {
//                 type,
//                 businessId: businessId || 'not provided',
//                 bookId: bookId || 'not provided',
//                 date_range: start_date || end_date ? 
//                     `${start_date || '...'} to ${end_date || '...'}` : 'none'
//             },
//             stats: {
//                 invoice_count: invoices.length,
//                 items_count: invoices.reduce((sum, inv) => sum + inv.items.length, 0)
//             }
//         } : undefined;

//         res.status(200).json({ 
//             success: true,
//             invoices,
//             count: invoices.length,
//             user_id,
//             ...(debugInfo && { debug: debugInfo })
//         });

//     } catch (error) {
//         console.error("Error fetching invoices:", error);
//         res.status(500).json({ 
//             success: false,
//             error: error.message,
//             code: "INVOICE_FETCH_FAILED",
//             details: process.env.NODE_ENV === 'development' ? error.stack : undefined
//         });
//     }
// };

exports.getInvoices = async (req, res) => {
    try {
        const { 
            type, 
            user_id, 
            business_id,
            book_id,
            start_date,
            end_date
        } = req.query;

        // Validate required parameters
        if (!user_id) {
            return res.status(400).json({ 
                error: "user_id is required",
                code: "USER_ID_REQUIRED"
            });
        }

        // OPTION 2: Separate queries with manual joining (more reliable)
        const getInvoicesSeparateQueries = async () => {
            // Get base invoices
            let invoiceSql = `SELECT * FROM invoices WHERE user_id = ?`;
            const invoiceParams = [user_id];
            
            // Add type filter if provided
            if (type) {
                invoiceSql += ` AND type = ?`;
                invoiceParams.push(type);
            }
            
            // Add business_id filter if provided
            if (business_id) {
                invoiceSql += ` AND business_id = ?`;
                invoiceParams.push(business_id);
            }
            
            // Add book_id filter if provided
            if (book_id) {
                invoiceSql += ` AND book_id = ?`;
                invoiceParams.push(book_id);
            }
            
            // Add date range filtering if provided
            if (start_date && end_date) {
                invoiceSql += ` AND invoice_date BETWEEN ? AND ?`;
                invoiceParams.push(start_date, end_date);
            } else if (start_date) {
                invoiceSql += ` AND invoice_date >= ?`;
                invoiceParams.push(start_date);
            } else if (end_date) {
                invoiceSql += ` AND invoice_date <= ?`;
                invoiceParams.push(end_date);
            }
            
            invoiceSql += ` ORDER BY invoice_date DESC`;
            
            const [invoices] = await db.query(invoiceSql, invoiceParams);

            // Return early if no invoices found
            if (invoices.length === 0) {
                return [];
            }

            // Get all items for these invoices
            const [items] = await db.query(
                `SELECT * FROM invoice_items WHERE invoice_id IN (?)`,
                [invoices.map(i => i.id)]
            );

            // Group items by invoice_id
            const itemsMap = items.reduce((map, item) => {
                if (!map[item.invoice_id]) map[item.invoice_id] = [];
                map[item.invoice_id].push({
                    item_name: item.item_name,
                    taxable_amount: item.taxable_amount,
                    remark: item.remark,
                    hsn_code: item.hsn_code,
                    quantity_unit: item.quantity_unit,
                    rate_per_unit: item.rate_per_unit,
                    tax_rate: item.tax_rate
                });
                return map;
            }, {});

            // Combine invoices with their items
            return invoices.map(invoice => ({
                ...invoice,
                items: itemsMap[invoice.id] || []
            }));
        };

        const invoices = await getInvoicesSeparateQueries();

        res.status(200).json({ 
            success: true,
            invoices,
            count: invoices.length,
            user_id
        });

    } catch (error) {
        console.error("Error fetching invoices:", error);
        res.status(500).json({ 
            success: false,
            error: error.message,
            code: "INVOICE_FETCH_FAILED",
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// ✅ Get single invoice details (with user verification)
// ✅ Get single invoice details (with user verification)
exports.getInvoiceById = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.query;

        if (!user_id) {
            return res.status(400).json({ 
                error: "user_id is required",
                code: "USER_ID_REQUIRED"
            });
        }

        // Verify invoice belongs to user
        const [invoice] = await db.query(
            `SELECT * FROM invoices WHERE id = ? AND user_id = ?`, 
            [id, user_id]
        );

        if (invoice.length === 0) {
            return res.status(404).json({ 
                message: "Invoice not found or not owned by user",
                code: "INVOICE_NOT_FOUND"
            });
        }

        // Fetch items for the invoice
        const [items] = await db.query(
            `SELECT * FROM invoice_items WHERE invoice_id = ? AND user_id = ?`,
            [id, user_id]
        );

        // Generate PDF file path and check if exists
        const filePath = path.join(pdfsDir, `invoice_${id}.pdf`);
        const pdfExists = fs.existsSync(filePath);
        
        // Create download link if PDF exists
        const downloadLink = pdfExists ? `/download/invoice_${id}.pdf` : null;

        // If PDF doesn't exist, you might want to generate it here
        if (!pdfExists) {
            try {
                // Prepare invoice data for PDF generation
                const invoiceData = {
                    ...invoice[0],
                    items,
                    totals: {
                        taxable: invoice[0].total_taxable,
                        cgst: invoice[0].cgst,
                        sgst: invoice[0].sgst,
                        igst: invoice[0].igst,
                        discount: invoice[0].discount_amount,
                        round_off: invoice[0].round_off,
                        grand_total: invoice[0].total_amount
                    }
                };

                // Generate the PDF
                await generateInvoicePDF(invoiceData, filePath);
                downloadLink = `/download/invoice_${id}.pdf`;
            } catch (pdfError) {
                console.error("Error generating PDF:", pdfError);
                // Continue without failing the request
            }
        }

        res.status(200).json({ 
            invoice: invoice[0], 
            items,
            user_id,
            downloadLink, // Include the download link in the response
            pdfExists: !!downloadLink // Whether PDF is available
        });

    } catch (error) {
        console.error("Error fetching invoice:", error);
        res.status(500).json({ 
            error: error.message,
            code: "INVOICE_FETCH_FAILED"
        });
    }
};

// ✅ Update an invoice (with user verification)
exports.updateInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            type, 
            customer_or_supplier, 
            invoice_date, 
            discount_amount, 
            percentage, 
            round_off, 
            items,
            user_id
        } = req.body;

        // Verify invoice belongs to user
        const [verify] = await db.query(
            `SELECT id FROM invoices WHERE id = ? AND user_id = ?`,
            [id, user_id]
        );

        if (verify.length === 0) {
            return res.status(403).json({ 
                message: "Invoice not found or not owned by user",
                code: "UNAUTHORIZED_ACCESS"
            });
        }

        // Calculate new amounts
        let total_taxable = items.reduce((sum, item) => sum + parseFloat(item.taxable_amount || 0), 0);
        let total_cgst = (total_taxable * 9) / 100;
        let total_sgst = (total_taxable * 9) / 100;
        let total_igst = (total_taxable * 18) / 100;
        let total_amount = total_taxable + total_cgst + total_sgst - (discount_amount || 0) + (round_off || 0);

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Update invoice header
            await connection.query(
                `UPDATE invoices SET
                    type = ?,
                    customer_or_supplier = ?,
                    invoice_date = ?,
                    total_taxable = ?,
                    cgst = ?,
                    sgst = ?,
                    igst = ?,
                    total_amount = ?,
                    discount_amount = ?,
                    percentage = ?,
                    round_off = ?
                 WHERE id = ? AND user_id = ?`,
                [type, customer_or_supplier, invoice_date, total_taxable, 
                 total_cgst, total_sgst, total_igst, total_amount,
                 discount_amount, percentage, round_off, id, user_id]
            );

            // Delete existing items
            await connection.query(
                `DELETE FROM invoice_items WHERE invoice_id = ? AND user_id = ?`,
                [id, user_id]
            );

            // Insert new items
            for (let item of items) {
                await connection.query(
                    `INSERT INTO invoice_items 
                        (invoice_id, item_name, hsn_code, quantity_unit, 
                         rate_per_unit, tax_rate, taxable_amount, user_id)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [id, item.item_name, item.hsn_code, item.quantity_unit, 
                     item.rate_per_unit, item.tax_rate, item.taxable_amount, user_id]
                );
            }

            await connection.commit();

            res.status(200).json({ 
                message: "Invoice updated successfully",
                invoiceId: id,
                user_id,
                totals: {
                    taxable: total_taxable,
                    cgst: total_cgst,
                    sgst: total_sgst,
                    igst: total_igst,
                    discount: discount_amount || 0,
                    round_off: round_off || 0,
                    grand_total: total_amount
                }
            });

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error("Error updating invoice:", error);
        res.status(500).json({ 
            error: error.message,
            code: "INVOICE_UPDATE_FAILED"
        });
    }
};

// ✅ Delete an invoice (with user verification)
exports.deleteInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.body;

        if (!user_id) {
            return res.status(400).json({ 
                error: "user_id is required",
                code: "USER_ID_REQUIRED"
            });
        }

        // Verify invoice belongs to user
        const [verify] = await db.query(
            `SELECT id FROM invoices WHERE id = ? AND user_id = ?`,
            [id, user_id]
        );

        if (verify.length === 0) {
            return res.status(403).json({ 
                message: "Invoice not found or not owned by user",
                code: "UNAUTHORIZED_ACCESS"
            });
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Delete items first
            await connection.query(
                `DELETE FROM invoice_items WHERE invoice_id = ? AND user_id = ?`,
                [id, user_id]
            );

            // Then delete invoice
            const [result] = await connection.query(
                `DELETE FROM invoices WHERE id = ? AND user_id = ?`,
                [id, user_id]
            );

            await connection.commit();

            if (result.affectedRows === 0) {
                return res.status(404).json({ 
                    message: "Invoice not found",
                    code: "INVOICE_NOT_FOUND"
                });
            }

            res.status(200).json({ 
                message: "Invoice deleted successfully",
                invoiceId: id,
                user_id
            });

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error("Error deleting invoice:", error);
        res.status(500).json({ 
            error: error.message,
            code: "INVOICE_DELETE_FAILED"
        });
    }
};


