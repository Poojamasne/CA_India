const db = require("../db");

// ✅ Add a new invoice (with user_id)
exports.addInvoice = async (req, res) => {
    try {
        const { 
            type, 
            customer_or_supplier, 
            invoice_date, 
            discount_amount, 
            percentage, 
            round_off, 
            items,
            user_id  // Added user_id
        } = req.body;

        // Validate required fields including user_id
        if (!type || !customer_or_supplier || !invoice_date || !user_id || !items || items.length === 0) {
            return res.status(400).json({ 
                error: "Missing required fields",
                missing_fields: {
                    type: !type,
                    customer_or_supplier: !customer_or_supplier,
                    invoice_date: !invoice_date,
                    user_id: !user_id,
                    items: !items || items.length === 0
                }
            });
        }

        // Calculate amounts
        let total_taxable = items.reduce((sum, item) => sum + parseFloat(item.taxable_amount || 0), 0);
        let total_cgst = (total_taxable * 9) / 100;
        let total_sgst = (total_taxable * 9) / 100;
        let total_igst = (total_taxable * 18) / 100;
        let total_amount = total_taxable + total_cgst + total_sgst - (discount_amount || 0) + (round_off || 0);

        // Insert invoice with user_id
        const [result] = await db.query(
            `INSERT INTO invoices 
                (type, customer_or_supplier, invoice_date, total_taxable, 
                 cgst, sgst, igst, total_amount, discount_amount, 
                 percentage, round_off, user_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [type, customer_or_supplier, invoice_date, total_taxable, 
             total_cgst, total_sgst, total_igst, total_amount, 
             discount_amount, percentage, round_off, user_id]
        );

        const invoiceId = result.insertId;

        // Insert items with transaction
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            for (let item of items) {
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
            
            res.status(201).json({ 
                success: true,
                message: "Invoice added successfully", 
                invoiceId,
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
        console.error("Error adding invoice:", error);
        res.status(500).json({ 
            error: error.message,
            sqlError: error.sqlMessage,
            code: "INVOICE_CREATION_FAILED"
        });
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


