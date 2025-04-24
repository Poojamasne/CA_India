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
        const logoPath = path.join(__dirname, '..', 'uploads', 'logo.jpeg');
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
            bank_account_id
        } = req.body;

        // Validate required fields
        if (!type || !customer_or_supplier || !invoice_date || !user_id || !Array.isArray(items) || items.length === 0 || !book_id || !bank_account_id) {
            return res.status(400).json({ 
                error: "Missing required fields",
                missing_fields: {
                    type: !type,
                    customer_or_supplier: !customer_or_supplier,
                    invoice_date: !invoice_date,
                    user_id: !user_id,
                    items: !items || items.length === 0,
                    book_id: !book_id,
                    bank_account_id: !bank_account_id
                }
            });
        }

        // Fetch user details from the users table
        const [userResult] = await db.query('SELECT name, phone_number, email FROM users WHERE id = ?', [user_id]);
        if (userResult.length === 0) {
            return res.status(400).json({ error: "User not found" });
        }
        const { name, phone_number, email } = userResult[0];

        // Calculate total values (with 0 tax values)
        let total_taxable = items.reduce((sum, item) => sum + parseFloat(item.taxable_amount || 0), 0);
        let total_amount = total_taxable - discount_amount + round_off;

        // Extract hsn_code from the first item (or handle it as needed)
        const hsn_code = items[0]?.hsn_code || 'default_value';

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Insert invoice with 0 values for tax fields
            const [invoiceResult] = await connection.query(
                `INSERT INTO invoices 
                    (type, customer_or_supplier, invoice_date, total_taxable, 
                     cgst, sgst, igst, total_amount, discount_amount, 
                     percentage, round_off, user_id, book_id, bank_account_id, hsn_code)
                 VALUES (?, ?, ?, ?, 0, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [type, customer_or_supplier, invoice_date, total_taxable, 
                 total_amount, discount_amount, percentage, round_off, 
                 user_id, book_id, bank_account_id, hsn_code]
            );

            const invoiceId = invoiceResult.insertId;

            // Insert invoice items
            for (const item of items) {
                await connection.query(
                    `INSERT INTO invoice_items 
                        (invoice_id, item_name, taxable_amount, remark, user_id, hsn_code, quantity_unit, rate_per_unit, tax_rate)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [invoiceId, item.item_name, item.taxable_amount, item.remark || '', user_id, item.hsn_code, item.quantity_unit || 'default_unit', item.rate_per_unit || 0.00, item.tax_rate || 0.00]
                );
            }

            await connection.commit();

            // Generate and save PDF
            const invoiceData = {
                invoiceId,
                type,
                customer_or_supplier,
                invoice_date,
                mobile_number: phone_number,
                bank_name: 'SBI', // Assuming bank_name is not fetched from the user table
                items,
                totals: {
                    taxable: total_taxable,
                    discount: discount_amount,
                    round_off: round_off,
                    grand_total: total_amount
                },
                user_id
            };

            const filePath = path.join(pdfsDir, `invoice_${invoiceId}.pdf`);
            await generateInvoicePDF(invoiceData, filePath);

            // Provide download link in the response
            const downloadLink = `/download/invoice_${invoiceId}.pdf`;
            res.status(200).json({
                success: true,
                message: "Invoice generated successfully",
                downloadLink,
                invoiceId
            });

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
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
exports.getInvoices = async (req, res) => {
    try {
        const { type, user_id } = req.query;

        if (!user_id) {
            return res.status(400).json({ 
                error: "user_id is required",
                code: "USER_ID_REQUIRED"
            });
        }

        let sql = `SELECT * FROM invoices WHERE user_id = ?`;
        const params = [user_id];

        if (type) {
            sql += ` AND type = ?`;
            params.push(type);
        }

        sql += ` ORDER BY invoice_date DESC`;

        const [invoices] = await db.query(sql, params);
        
        res.status(200).json({ 
            invoices,
            count: invoices.length,
            user_id
        });

    } catch (error) {
        console.error("Error fetching invoices:", error);
        res.status(500).json({ 
            error: error.message,
            code: "INVOICE_FETCH_FAILED"
        });
    }
};

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

        res.status(200).json({ 
            invoice: invoice[0], 
            items,
            user_id
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


