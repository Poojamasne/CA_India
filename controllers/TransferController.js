const db = require("../db");


// Function to generate a unique Transfer Number (e.g., TRF-2025001)
const generateTransferNumber = async () => {
    const prefix = "TRF-";
    try {
        const [rows] = await db.query("SELECT COUNT(*) AS count FROM transfers");
        const count = rows[0].count + 1;
        return `${prefix}${new Date().getFullYear()}${String(count).padStart(3, "0")}`;
    } catch (error) {
        throw new Error("Error generating transfer number");
    }
};

// ✅ POST: Add Transfer
exports.addTransfer = async (req, res) => {
    const { date, recipient, sender, amount, book_id } = req.body;

    // 🔍 Validate required fields
    if (!date || !recipient || !sender || !amount || !book_id) {
        return res.status(400).json({ 
            success: false,
            message: "All fields including book_id are required" 
        });
    }

    // ✅ Optional: Validate book existence (recommended)
    const [bookCheck] = await db.query(
        "SELECT book_id FROM books WHERE book_id = ?",
        [book_id]
    );

    if (bookCheck.length === 0) {
        return res.status(404).json({
            success: false,
            message: "Book not found",
            code: "BOOK_NOT_FOUND"
        });
    }

    try {
        const transferNo = await generateTransferNumber();
        const sql = `
            INSERT INTO transfers 
                (transfer_no, date, recipient, sender, amount, book_id) 
            VALUES (?, ?, ?, ?, ?, ?)`;
        const values = [transferNo, date, recipient, sender, amount, book_id];

        const [result] = await db.query(sql, values);

        res.status(201).json({
            success: true,
            message: "Transfer added successfully",
            transfer_no: transferNo,
            transfer_id: result.insertId
        });

    } catch (error) {
        console.error("Transfer insert error:", error);
        res.status(500).json({ 
            success: false,
            message: "Database error", 
            error: error.message 
        });
    }
};


// ✅ GET: Fetch All Transfers
exports.getTransfers = async (req, res) => {
    try {
        const [results] = await db.query("SELECT * FROM transfers ORDER BY created_at DESC");
        res.status(200).json({ transfers: results });

    } catch (error) {
        res.status(500).json({ message: "Database error", error: error.message });
    }
};
