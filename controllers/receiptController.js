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
            party,
            remark,
            category_split,
            customer_field,
            payment_mode,
            selected_bank,
            user_id  // Added user_id to the destructured request body
        } = req.body;

        // Include user_id in required fields check
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

        // Generate a unique receipt number
        const receipt_no = generateReceiptNo();

        // SQL Query to insert a new receipt (added user_id)
        const sql = `INSERT INTO receipt_entries 
            (receipt_no, receipt_type, amount, party, remark, category_split, 
             customer_field, payment_mode, selected_bank, user_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;

        // Execute SQL Query (added user_id to parameters)
        const [result] = await db.execute(sql, [
            receipt_no, receipt_type, amount, party, remark, 
            category_split, customer_field, payment_mode, 
            selected_bank, user_id
        ]);

        res.json({ 
            success: true,
            message: "Receipt entry added successfully",
            receipt_id: result.insertId,
            receipt_no: receipt_no,
            user_id: user_id,  // Include user_id in response
            date: new Date().toLocaleDateString('en-US', { 
                month: 'short', 
                day: '2-digit', 
                year: 'numeric' 
            }),
            time: new Date().toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit', 
                hour12: true 
            })
        });

    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            sqlError: error.sqlMessage  // Include SQL error details if available
        });
    }
};

// 📌 Get all receipt entries (ASYNC/AWAIT)
exports.getAllReceipts = async (req, res) => {
    try {
        // Option 1: Get all receipts for all users (admin view)
        // const [results] = await db.execute(
        //     "SELECT *, DATE_FORMAT(created_at, '%d %b %Y') AS date, 
        //     DATE_FORMAT(created_at, '%h:%i %p') AS time FROM receipt_entries"
        // );

        // Option 2: Get receipts for specific user (common case)
        const { user_id } = req.query;  // Get user_id from query params
        if (!user_id) {
            return res.status(400).json({ error: "user_id is required" });
        }

        const [results] = await db.execute(
            `SELECT *, 
             DATE_FORMAT(created_at, '%d %b %Y') AS date, 
             DATE_FORMAT(created_at, '%h:%i %p') AS time 
             FROM receipt_entries WHERE user_id = ?`,
            [user_id]
        );

        res.json({ 
            receipts: results,
            count: results.length,
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