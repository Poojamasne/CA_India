const db = require('../db'); // Import database connection

// ✅ Add a New Customer Field
exports.addCustomerField = async (req, res) => {
    try {
        const { field_name } = req.body;

        if (!field_name) {
            return res.status(400).json({ error: "Customer field name is required." });
        }

        const sql = `INSERT INTO customer_fields (field_name) VALUES (?)`;

        const [result] = await db.execute(sql, [field_name]);

        res.json({ 
            success: true,
            message: "Customer field added successfully", 
            customer_field_id: result.insertId 
        });

    } catch (error) {
        console.error("Error adding customer field:", error);
        res.status(500).json({ error: error.message });
    }
};

// ✅ Get Customer Field for a Specific Book
exports.getCustomerFieldByBook = async (req, res) => {
    try {
        const { book_id } = req.params;

        if (!book_id) {
            return res.status(400).json({ error: "Book ID is required." });
        }

        const sql = `
            SELECT 
                b.book_id, 
                b.book_name, 
                b.business_id, 
                b.inventory_status, 
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
                cf.id AS customer_field_id,
                cf.field_name AS customer_field_name
            FROM books b
            LEFT JOIN parties p ON b.party_id = p.id
            LEFT JOIN customer_fields cf ON p.customer_field = cf.field_name
            WHERE b.book_id = ?
        `;

        const [result] = await db.execute(sql, [book_id]);

        if (result.length === 0) {
            return res.status(404).json({ error: "No records found for the given book ID." });
        }

        res.json(result[0]);

    } catch (error) {
        console.error("Error fetching customer field for book:", error);
        res.status(500).json({ error: error.message });
    }
};

