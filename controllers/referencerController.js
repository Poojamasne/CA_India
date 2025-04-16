const db = require('../db');

// Add a new referencer to a book
exports.addReferencer = async (req, res) => {
    const { book_id } = req.params;
    const { referencer } = req.body;

    if (!referencer) {
        return res.status(400).json({ success: false, message: "Referencer is required" });
    }

    try {
        // Check if the book exists
        const [book] = await db.query("SELECT book_id FROM books WHERE book_id = ?", [book_id]);

        if (book.length === 0) {
            return res.status(404).json({ success: false, message: "Book not found" });
        }

        // Update the book with the referencer
        await db.query("UPDATE books SET referencer = ? WHERE book_id = ?", [referencer, book_id]);

        res.status(200).json({ success: true, message: "Referencer added successfully" });
    } catch (err) {
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


// Get referencer for a book
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
