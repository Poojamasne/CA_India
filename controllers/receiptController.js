const db = require('../db');

// Function to generate a unique receipt number
const generateReceiptNo = () => {
    return `RECPT-${Date.now().toString().slice(-6)}`;
};

// 📌 Add a new receipt entry (ASYNC/AWAIT)
exports.addReceiptEntry = async (req, res) => {
    try {
        const {
            receipt_type,
            amount,
            party_id,
            remark,
            category_split,   // Array of objects: [{ name: "Rent", amount: 500 }]
            customer_field_id,
            payment_mode,
            selected_bank,
            user_id,
            book_id
        } = req.body;

        // Check required fields
        if (!receipt_type || !amount || !party_id || !payment_mode || !user_id || !book_id || !category_split) {
            return res.status(400).json({
                error: "Missing required fields",
                missing: {
                    receipt_type: !receipt_type,
                    amount: !amount,
                    party_id: !party_id,
                    payment_mode: !payment_mode,
                    user_id: !user_id,
                    book_id: !book_id,
                    category_split: !category_split
                }
            });
        }

        // Generate unique receipt number
        const receipt_no = generateReceiptNo();

        // Insert receipt into receipt_entries
        const sql = `
            INSERT INTO receipt_entries 
            (receipt_no, receipt_type, amount, party_id, remark, category_split, 
             customer_field_id, payment_mode, selected_bank, user_id, book_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;

        // Stringify category_split to store in one column (if storing as JSON)
        const categoryJson = JSON.stringify(category_split);

        const [result] = await db.execute(sql, [
            receipt_no, receipt_type, amount, party_id, remark, 
            categoryJson, customer_field_id, payment_mode, 
            selected_bank, user_id, book_id
        ]);

        res.status(201).json({
            success: true,
            message: "Receipt entry added successfully",
            receipt_id: result.insertId,
            receipt_no,
            user_id,
            book_id,
            date: new Date().toLocaleDateString('en-US', {
                month: 'short', day: '2-digit', year: 'numeric'
            }),
            time: new Date().toLocaleTimeString('en-US', {
                hour: '2-digit', minute: '2-digit', hour12: true
            })
        });

    } catch (error) {
        res.status(500).json({
            error: error.message,
            sqlError: error.sqlMessage || null
        });
    }
};


// 📌 Get all receipt entries (ASYNC/AWAIT)
exports.getAllReceipts = async (req, res) => {
    try {
        const { user_id } = req.query;
        if (!user_id) {
            return res.status(400).json({ error: "user_id is required" });
        }

        const [results] = await db.execute(
            `SELECT *, 
             DATE_FORMAT(created_at, '%d %b %Y') AS date, 
             DATE_FORMAT(created_at, '%h:%i %p') AS time 
             FROM receipt_entries 
             WHERE user_id = ?`,
            [user_id]
        );

        // Optional: Modify status based on receipt_type or any other logic
        const receiptsWithStatus = results.map(receipt => ({
            ...receipt,
            status: receipt.status || (
                receipt.receipt_type === 'receipt' ? 'credit' : 'debit'
            )
        }));

        res.json({ 
            receipts: receiptsWithStatus,
            count: receiptsWithStatus.length,
            user_id: user_id
        });

    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            sqlError: error.sqlMessage
        });
    }
};


// 📌 Delete a receipt entry (ASYNC/AWAIT)
exports.deleteReceiptEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.body;  // Require user_id for verification

        if (!user_id) {
            return res.status(400).json({ error: "user_id is required" });
        }

        // Verify the receipt belongs to the user before deleting
        const [verify] = await db.execute(
            "SELECT id FROM receipt_entries WHERE id = ? AND user_id = ?",
            [id, user_id]
        );

        if (verify.length === 0) {
            return res.status(403).json({ 
                error: "Receipt not found or not owned by user" 
            });
        }

        const [result] = await db.execute(
            "DELETE FROM receipt_entries WHERE id = ? AND user_id = ?",
            [id, user_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Receipt entry not found" });
        }

        res.json({ 
            message: "Receipt entry deleted successfully",
            receipt_id: id,
            user_id: user_id
        });

    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            sqlError: error.sqlMessage
        });
    }
};

// 📌 Update a receipt entry
exports.updateReceiptEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            receipt_type, 
            amount, 
            party, 
            remark, 
            category_split, 
            customer_field, 
            payment_mode, 
            selected_bank,
            user_id  // Added user_id
        } = req.body;

        // Include user_id in validation
        if (!receipt_type || !amount || !party || !payment_mode || !user_id) {
            return res.status(400).json({ 
                error: "Missing required fields",
                missing: {
                    receipt_type: !receipt_type,
                    amount: !amount,
                    party: !party,
                    payment_mode: !payment_mode,
                    user_id: !user_id
                }
            });
        }

        // Verify ownership before update
        const [verify] = await db.execute(
            "SELECT id FROM receipt_entries WHERE id = ? AND user_id = ?",
            [id, user_id]
        );

        if (verify.length === 0) {
            return res.status(403).json({ 
                error: "Receipt not found or not owned by user" 
            });
        }

        const sql = `UPDATE receipt_entries 
            SET receipt_type = ?, amount = ?, party = ?, remark = ?, 
                category_split = ?, customer_field = ?, payment_mode = ?, 
                selected_bank = ?
            WHERE id = ? AND user_id = ?`;

        const [result] = await db.execute(sql, [
            receipt_type, amount, party, remark, category_split, 
            customer_field, payment_mode, selected_bank, 
            id, user_id  // Added user_id as parameter
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Receipt entry not found" });
        }

        res.json({ 
            success: true,
            message: "Receipt entry updated successfully",
            receipt_id: id,
            user_id: user_id
        });

    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            sqlError: error.sqlMessage
        });
    }
};


