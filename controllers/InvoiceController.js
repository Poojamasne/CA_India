const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const db = require("../db");

const pdfsDir = path.join(__dirname, '..', 'pdfs');
if (!fs.existsSync(pdfsDir)) {
    fs.mkdirSync(pdfsDir);
}

// Function to generate PDF invoice and save it to a file
const generateInvoicePDF = (invoiceData, filePath) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument();
        const writeStream = fs.createWriteStream(filePath);

        doc.pipe(writeStream);

        // Invoice Header
        doc.fontSize(18).text('TAX INVOICE ORIGINAL FOR RECIPIENT', 50, 50);
        doc.fontSize(12).text(`Invoice No: ${invoiceData.invoiceId}`, 50, 80);
        doc.fontSize(12).text(`Invoice Date: ${invoiceData.invoice_date}`, 50, 100);

        // Customer Details
        doc.fontSize(14).text('BILL TO', 50, 140);
        doc.fontSize(12).text(invoiceData.customer_or_supplier, 50, 170);

        // Items Table
        doc.fontSize(14).text('Items', 50, 230);
        doc.rect(50, 250, 500, 30).stroke();
        doc.fontSize(12).text('SN', 50, 260);
        doc.fontSize(12).text('Items', 100, 260);
        doc.fontSize(12).text('HSN', 200, 260);
        doc.fontSize(12).text('Quantity', 250, 260);
        doc.fontSize(12).text('Price per unit', 350, 260);
        doc.fontSize(12).text('Tax per unit', 450, 260);
        doc.fontSize(12).text('Amount', 550, 260);

        let y = 280;
        invoiceData.items.forEach((item, index) => {
            doc.rect(50, y, 500, 30).stroke();
            doc.fontSize(12).text(`${index + 1}`, 50, y + 10);
            doc.fontSize(12).text(item.item_name, 100, y + 10);
            doc.fontSize(12).text(item.hsn_code, 200, y + 10);
            doc.fontSize(12).text(item.quantity_unit, 250, y + 10);
            doc.fontSize(12).text(item.rate_per_unit.toFixed(2), 350, y + 10);
            doc.fontSize(12).text(item.tax_rate.toFixed(2), 450, y + 10);
            doc.fontSize(12).text(item.taxable_amount.toFixed(2), 550, y + 10);
            y += 30;
        });

        // Totals
        doc.fontSize(14).text('Totals', 50, y + 20);
        doc.fontSize(12).text(`Taxable Amount: ${invoiceData.totals.taxable.toFixed(2)}`, 50, y + 50);
        doc.fontSize(12).text(`CGST @ 9.0%: ${invoiceData.totals.cgst.toFixed(2)}`, 50, y + 70);
        doc.fontSize(12).text(`SGST @ 9.0%: ${invoiceData.totals.sgst.toFixed(2)}`, 50, y + 90);
        doc.fontSize(12).text(`CGST @ 14.0%: ${invoiceData.totals.igst.toFixed(2)}`, 50, y + 110);
        doc.fontSize(12).text(`SGST @ 14.0%: ${invoiceData.totals.igst.toFixed(2)}`, 50, y + 130);
        doc.fontSize(12).text(`Total Amount: ${invoiceData.totals.grand_total.toFixed(2)}`, 50, y + 150);

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

// ✅ Add a new invoice (with user_id)
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

        // Calculate total values
        let total_taxable = items.reduce((sum, item) => sum + parseFloat(item.taxable_amount || 0), 0);
        let total_cgst = (total_taxable * 9) / 100;
        let total_sgst = (total_taxable * 9) / 100;
        let total_igst = (total_taxable * 18) / 100;
        let total_amount = total_taxable + total_cgst + total_sgst - discount_amount + round_off;

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Insert invoice
            const [invoiceResult] = await connection.query(
                `INSERT INTO invoices 
                    (type, customer_or_supplier, invoice_date, total_taxable, 
                     cgst, sgst, igst, total_amount, discount_amount, 
                     percentage, round_off, user_id, book_id, bank_account_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [type, customer_or_supplier, invoice_date, total_taxable, 
                 total_cgst, total_sgst, total_igst, total_amount, 
                 discount_amount, percentage, round_off, user_id, book_id, bank_account_id]
            );

            const invoiceId = invoiceResult.insertId;

            // Insert invoice items
            for (const item of items) {
                await connection.query(
                    `INSERT INTO invoice_items 
                        (invoice_id, item_name, hsn_code, quantity_unit, 
                         rate_per_unit, tax_rate, taxable_amount, user_id)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [invoiceId, item.item_name, item.hsn_code, item.quantity_unit, 
                     item.rate_per_unit, item.tax_rate, item.taxable_amount, user_id]
                );
            }

            await connection.commit();

            // Generate and save PDF
            const invoiceData = {
                invoiceId,
                type,
                customer_or_supplier,
                invoice_date,
                items,
                totals: {
                    taxable: total_taxable,
                    cgst: total_cgst,
                    sgst: total_sgst,
                    igst: total_igst,
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


