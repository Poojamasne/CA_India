const db = require('../db');

// ✅ Add a New Bank Account (with user_id)
exports.addBankAccount = async (req, res) => {
    try {
        const { 
            bank_name, 
            account_number, 
            ifsc_code, 
            head_account, 
            upi_id,
            user_id  // Added user_id
        } = req.body;

        // Include user_id in validation
        if (!bank_name || !account_number || !ifsc_code || !user_id) {
            return res.status(400).json({ 
                error: "Bank name, Account number, IFSC code, and User ID are required.",
                missing_fields: {
                    bank_name: !bank_name,
                    account_number: !account_number,
                    ifsc_code: !ifsc_code,
                    user_id: !user_id
                }
            });
        }

        const sql = `INSERT INTO bank_accounts 
                     (bank_name, account_number, ifsc_code, head_account, upi_id, user_id)
                     VALUES (?, ?, ?, ?, ?, ?)`;

        const [result] = await db.execute(sql, [
            bank_name, 
            account_number, 
            ifsc_code, 
            head_account, 
            upi_id,
            user_id
        ]);

        res.json({ 
            message: "Bank account added successfully",
            bankId: result.insertId,
            user_id: user_id
        });

    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            sqlError: error.sqlMessage
        });
    }
};

// ✅ Get All Bank Accounts (filtered by user_id)
exports.getBankAccounts = async (req, res) => {
    try {
        const { user_id } = req.query;
        
        if (!user_id) {
            return res.status(400).json({ 
                error: "User ID is required",
                code: "USER_ID_REQUIRED"
            });
        }

        const [rows] = await db.execute(
            "SELECT * FROM bank_accounts WHERE user_id = ? ORDER BY created_at DESC",
            [user_id]
        );

        res.json({
            bankAccounts: rows,
            count: rows.length,
            user_id: user_id
        });

    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            code: "DB_ERROR"
        });
    }
};

// ✅ Update Bank Account (with user verification)
exports.updateBankAccount = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            bank_name, 
            account_number, 
            ifsc_code, 
            head_account, 
            upi_id,
            user_id  // Added user_id
        } = req.body;

        // Verify ownership first
        const [verify] = await db.execute(
            "SELECT id FROM bank_accounts WHERE id = ? AND user_id = ?",
            [id, user_id]
        );

        if (verify.length === 0) {
            return res.status(403).json({ 
                error: "Bank account not found or not owned by user",
                code: "UNAUTHORIZED_ACCESS"
            });
        }

        const sql = `UPDATE bank_accounts 
                     SET bank_name = ?, 
                         account_number = ?, 
                         ifsc_code = ?, 
                         head_account = ?, 
                         upi_id = ?
                     WHERE id = ? AND user_id = ?`;

        const [result] = await db.execute(sql, [
            bank_name, 
            account_number, 
            ifsc_code, 
            head_account, 
            upi_id, 
            id,
            user_id
        ]);

        res.json({ 
            message: "Bank account updated successfully",
            bankId: id,
            user_id: user_id
        });

    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            code: "DB_ERROR"
        });
    }
};

// ✅ Delete Bank Account (with user verification)
exports.deleteBankAccount = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.body;  // Require user_id in body

        if (!user_id) {
            return res.status(400).json({ 
                error: "User ID is required",
                code: "USER_ID_REQUIRED"
            });
        }

        // Verify ownership first
        const [verify] = await db.execute(
            "SELECT id FROM bank_accounts WHERE id = ? AND user_id = ?",
            [id, user_id]
        );

        if (verify.length === 0) {
            return res.status(403).json({ 
                error: "Bank account not found or not owned by user",
                code: "UNAUTHORIZED_ACCESS"
            });
        }

        const [result] = await db.execute(
            "DELETE FROM bank_accounts WHERE id = ? AND user_id = ?",
            [id, user_id]
        );

        res.json({ 
            message: "Bank account deleted successfully",
            bankId: id,
            user_id: user_id
        });

    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            code: "DB_ERROR"
        });
    }
};