const db = require('../db');

// ✅ Add a New Head Account (with user_id)
exports.addHeadAccount = async (req, res) => {
    try {
        const { name, user_id } = req.body;

        if (!name || !user_id) {
            return res.status(400).json({ 
                error: "Head account name and user ID are required.",
                missing_fields: {
                    name: !name,
                    user_id: !user_id
                }
            });
        }

        const sql = `INSERT INTO head_accounts (name, user_id) VALUES (?, ?)`;
        const [result] = await db.execute(sql, [name, user_id]);

        res.json({ 
            message: "Head account added successfully", 
            headAccountId: result.insertId,
            user_id: user_id
        });

    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            sqlError: error.sqlMessage
        });
    }
};

// ✅ Get All Head Accounts (filtered by user_id)
exports.getHeadAccounts = async (req, res) => {
    try {
        const { user_id } = req.query;
        
        if (!user_id) {
            return res.status(400).json({ 
                error: "User ID is required",
                code: "USER_ID_REQUIRED"
            });
        }

        const [rows] = await db.execute(
            "SELECT * FROM head_accounts WHERE user_id = ? ORDER BY created_at DESC",
            [user_id]
        );

        res.json({
            headAccounts: rows,
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

// ✅ Get Book with Head Account Details (with user verification)
exports.getBookWithHeadAccount = async (req, res) => {
    const bookId = parseInt(req.params.bookId);
    const { user_id } = req.query;

    if (!user_id) {
        return res.status(400).json({ 
            error: "User ID is required",
            code: "USER_ID_REQUIRED"
        });
    }

    try {
        const query = `
            SELECT 
                b.book_id, 
                b.book_name, 
                b.inventory_status, 
                b.business_id, 
                b.net_balance, 
                b.receipt, 
                b.payment, 
                b.recent_entries_date, 
                b.party_id, 
                b.income_tax_challan, 
                b.entry_by, 
                b.entry_time, 
                b.balance, 
                b.created_at, 
                b.referencer, 
                b.category_id, 
                b.head_account_id,
                b.user_id,
                ha.name AS head_account_name, 
                ha.created_at AS head_account_created_at,
                ha.user_id AS head_account_user_id
            FROM books b
            LEFT JOIN head_accounts ha ON b.head_account_id = ha.id
            WHERE b.book_id = ? AND b.user_id = ?`;

        const [result] = await db.query(query, [bookId, user_id]);

        if (!result || result.length === 0) {
            return res.status(404).json({ 
                message: 'Book not found or not owned by user',
                book_id: bookId,
                user_id: user_id
            });
        }

        const bookData = {
            ...result[0],
            Head_Account: {
                head_account_name: result[0].head_account_name,
                head_account_created_at: result[0].head_account_created_at,
                user_id: result[0].head_account_user_id
            },
            user_id: result[0].user_id
        };

        // Clean up redundant fields
        delete bookData.head_account_name;
        delete bookData.head_account_created_at;
        delete bookData.head_account_user_id;

        res.json(bookData);
    } catch (error) {
        console.error('Error fetching book with head account:', error);
        res.status(500).json({ 
            message: 'Internal Server Error',
            error: error.message,
            code: "DB_ERROR"
        });
    }
};