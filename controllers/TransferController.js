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
    const { date, recipient, sender, amount } = req.body;

    if (!date || !recipient || !sender || !amount) {
        return res.status(400).json({ message: "All fields are required" });
    }

    try {
        const transferNo = await generateTransferNumber();
        const sql = "INSERT INTO transfers (transfer_no, date, recipient, sender, amount) VALUES (?, ?, ?, ?, ?)";
        const values = [transferNo, date, recipient, sender, amount];

        const [result] = await db.query(sql, values);

        res.status(201).json({
            success: true,
            message: "Transfer added successfully",
            transfer_no: transferNo,
            id: result.insertId // ✅ Return the inserted transfer ID
        });

    } catch (error) {
        res.status(500).json({ message: "Database error", error: error.message });
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
