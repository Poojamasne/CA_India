const db = require('../db');

// Add new party
// Add new party with book_id
exports.addpartyEntry = async (req, res) => {
    const { 
        party, 
        gst_number, 
        address, 
        state, 
        contact_number, 
        reference_name, 
        customerFieldId,  // corresponds to customer_field in DB
        grade,
        user_id,
        book_id,          // NEW: Add book_id
        add_email         // NEW: Add add_email
    } = req.body;

    // Only party and contact_number are required
    if (!party || !contact_number) {
        return res.status(400).json({ 
            message: "Party name and contact number are required",
            missing_fields: {
                party: !party,
                contact_number: !contact_number
            }
        });
    }

    try {
        const query = `
            INSERT INTO parties 
            (party, gst_number, address, state, contact_number, 
             reference_name, customer_field, grade, user_id, book_id, add_email) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await db.execute(query, [
            party, gst_number || null, address || null, state || null, contact_number,
            reference_name || null, customerFieldId || null, grade || null,
            user_id || null, book_id || null, add_email || null
        ]);

        res.status(201).json({ 
            success: true,
            message: "Party added successfully",
            party_id: result.insertId,
            user_id: user_id,
            book_id: book_id
        });
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            sqlError: error.sqlMessage
        });
    }
};



// Get all parties (with user filtering)
exports.getAllpartys = async (req, res) => {
    try {
        const { user_id, book_id } = req.query;

        if (!user_id || !book_id) {
            return res.status(400).json({ message: "user_id and book_id are required" });
        }

        const [results] = await db.execute(
            "SELECT * FROM parties WHERE user_id = ? AND book_id = ?", 
            [user_id, book_id]
        );

        res.json({
            parties: results,
            count: results.length,
            user_id,
            book_id
        });
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            sqlError: error.sqlMessage
        });
    }
};


// Update a party
exports.updatepartyEntry = async (req, res) => {
    const { id } = req.params;
    const { 
        party, 
        gst_number, 
        address, 
        state, 
        contact_number, 
        alt_contact_number, 
        reference_name, 
        customer_field, 
        grade,
        user_id  // Added user_id
    } = req.body;

    try {
        // Verify party belongs to user before updating
        const [verify] = await db.execute(
            "SELECT id FROM parties WHERE id = ? AND user_id = ?",
            [id, user_id]
        );

        if (verify.length === 0) {
            return res.status(403).json({ 
                message: "Party not found or not owned by user" 
            });
        }

        const query = `
            UPDATE parties 
            SET party = ?, gst_number = ?, address = ?, state = ?, 
                contact_number = ?, alt_contact_number = ?, 
                reference_name = ?, customer_field = ?, grade = ? 
            WHERE id = ? AND user_id = ?
        `;
        const [result] = await db.execute(query, [
            party, gst_number, address, state, contact_number, 
            alt_contact_number, reference_name, customer_field, 
            grade, id, user_id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Party not found" });
        }

        res.json({ 
            success: true,
            message: "Party updated successfully",
            party_id: id,
            user_id: user_id
        });
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            sqlError: error.sqlMessage
        });
    }
};

// Delete a party
exports.deletepartyEntry = async (req, res) => {
    const { id } = req.params;
    const { user_id } = req.body;  // Require user_id for verification

    if (!user_id) {
        return res.status(400).json({ message: "user_id is required" });
    }

    try {
        // Verify party belongs to user before deleting
        const [verify] = await db.execute(
            "SELECT id FROM parties WHERE id = ? AND user_id = ?",
            [id, user_id]
        );

        if (verify.length === 0) {
            return res.status(403).json({ 
                message: "Party not found or not owned by user" 
            });
        }

        const [result] = await db.execute(
            "DELETE FROM parties WHERE id = ? AND user_id = ?",
            [id, user_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Party not found" });
        }

        res.json({ 
            success: true,
            message: "Party deleted successfully",
            party_id: id,
            user_id: user_id
        });
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            sqlError: error.sqlMessage
        });
    }
};

// Get grades by book (updated with user verification)
exports.getGradeByBook = async (req, res) => {
    const bookId = parseInt(req.params.bookId);
    const { user_id } = req.query;  // Get user_id from query params

    if (!user_id) {
        return res.status(400).json({ message: "user_id is required" });
    }

    try {
        const query = `
            SELECT 
                b.book_id, 
                b.book_name, 
                b.inventory_status, 
                b.business_id, 
                b.net_balance, 
                b.created_at, 
                p.party, 
                p.gst_number, 
                p.address, 
                p.state, 
                p.contact_number, 
                p.alt_contact_number, 
                p.reference_name, 
                p.customer_field, 
                p.grade,
                p.user_id
            FROM books b
            LEFT JOIN parties p ON b.party_id = p.id
            WHERE b.book_id = ? AND p.user_id = ?`;

        const [result] = await db.query(query, [bookId, user_id]);

        if (!result || result.length === 0) {
            return res.status(404).json({ 
                message: 'Book not found or no grade available for this user',
                book_id: bookId,
                user_id: user_id
            });
        }

        const bookWithGrade = result[0];
        res.json({
            ...bookWithGrade,
            user_id: user_id
        });
    } catch (error) {
        console.error('Error fetching book grade:', error);
        res.status(500).json({ 
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

