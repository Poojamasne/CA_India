const db = require('../db');

// Add a new referencer to a book
exports.addReferencer = async (req, res) => {
    const { book_id } = req.params; // Assuming book_id is passed in the URL parameters
    const { referencer, user_id } = req.body; // Get referencer and user_id from the request body

    if (!referencer) {
        return res.status(400).json({ success: false, message: "Referencer is required" });
    }

    if (!user_id) {
        return res.status(400).json({ success: false, message: "User ID is required" });
    }

    try {
        // Check if book exists and belongs to the user
        const [book] = await db.query("SELECT book_id FROM books WHERE book_id = ? AND user_id = ?", [book_id, user_id]);

        console.log('Book query result:', book);

        if (book.length === 0) {
            return res.status(404).json({ success: false, message: "Book not found or you do not have permission to add a referencer" });
        }

        // Insert into book_referencers table
        await db.query(`
            INSERT INTO book_referencers (book_id, user_id, referencer, created_at) 
            VALUES (?, ?, ?, NOW())
        `, [book_id, user_id, referencer]);

        // Update books table's latest referencer field
        await db.query("UPDATE books SET referencer = ? WHERE book_id = ? AND user_id = ?", [referencer, book_id, user_id]);

        res.status(200).json({ success: true, message: "Referencer added successfully" });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ success: false, message: "Failed to add referencer", error: err.message });
    }
};

// Get referencer for a book
// exports.getReferencer = async (req, res) => {
//     const { book_id } = req.params;

//     try {
//         const [result] = await db.query("SELECT referencer FROM books WHERE book_id = ?", [book_id]);

//         if (result.length === 0) {
//             return res.status(404).json({ success: false, message: "Book not found" });
//         }

//         res.status(200).json({ success: true, referencer: result[0].referencer });
//     } catch (err) {
//         res.status(500).json({ success: false, message: "Failed to fetch referencer", error: err.message });
//     }
// };


// // Get referencer for a book
// exports.getReferencer = async (req, res) => {
//     const { book_id } = req.params;
//     const { user_id } = req.query;

//     if (!book_id || !user_id) {
//         return res.status(400).json({ 
//             success: false, 
//             message: "Valid Book ID and User ID are required", 
//             code: "IDS_REQUIRED" 
//         });
//     }

//     try {
//         const [result] = await db.query(`
//             SELECT 
//                 b.book_id, 
//                 b.book_name, 
//                 b.inventory_status, 
//                 b.business_id, 
//                 b.net_balance, 
//                 b.receipt, 
//                 b.payment, 
//                 b.recent_entries_date, 
//                 b.party_id, 
//                 b.income_tax_challan, 
//                 b.entry_by, 
//                 b.entry_time, 
//                 b.balance, 
//                 b.created_at, 
//                 b.referencer,
//                 COUNT(m.member_name) AS member_count
//             FROM books b
//             LEFT JOIN book_members m ON b.book_id = m.book_id
//             WHERE b.book_id = ? 
//             GROUP BY b.book_id
//         `, [book_id]);

//         if (result.length === 0) {
//             return res.status(404).json({ success: false, message: "Book not found" });
//         }

//         res.status(200).json({ success: true, book: result[0] });
//     } catch (err) {
//         res.status(500).json({ success: false, message: "Failed to fetch book details", error: err.message });
//     }
// };

exports.getReferencer = async (req, res) => {
    const { book_id } = req.params;
    const { user_id } = req.query;

    if (!book_id || !user_id) {
        return res.status(400).json({ 
            success: false, 
            message: "Valid Book ID and User ID are required", 
            code: "IDS_REQUIRED" 
        });
    }

    try {
        const [result] = await db.query(`
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
                COUNT(m.member_name) AS member_count
            FROM books b
            LEFT JOIN book_members m ON b.book_id = m.book_id
            WHERE b.book_id = ? 
            GROUP BY b.book_id
        `, [book_id]);

        if (result.length === 0) {
            return res.status(404).json({ success: false, message: "Book not found" });
        }

        res.status(200).json({ success: true, book: result[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to fetch book details", error: err.message });
    }
};


exports.getAllReferencers = async (req, res) => {
    const { book_id } = req.params;

    if (!book_id) {
        return res.status(400).json({ 
            success: false, 
            message: "Book ID is required", 
            code: "BOOK_ID_REQUIRED" 
        });
    }

    try {
        // Check if book exists
        const [bookCheck] = await db.query(`SELECT book_id FROM books WHERE book_id = ?`, [book_id]);

        if (bookCheck.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Book not found", 
                code: "BOOK_NOT_FOUND" 
            });
        }

        // Get referencers from history table
        const [referencers] = await db.query(`
            SELECT referencer, created_at 
            FROM book_referencers 
            WHERE book_id = ?
            ORDER BY created_at DESC
        `, [book_id]);

        res.status(200).json({ 
            success: true,
            count: referencers.length,
            referencers 
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            message: "Failed to fetch referencers", 
            error: err.message,
            code: "SERVER_ERROR"
        });
    }
};



