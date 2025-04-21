const db = require('../db'); // Database connection

// Link a party to a book
exports.linkPartyToBook = async (req, res) => {
    try {
        const { book_id, party_ids } = req.body;
        if (!book_id || !Array.isArray(party_ids)) {
            return res.status(400).json({ error: "book_id and party_ids array are required" });
        }

        // ✅ Fetch existing party_ids
        const [existing] = await db.query(`SELECT id FROM parties WHERE id IN (?)`, [party_ids]);
        const existingIds = existing.map(p => p.id);

        const invalidIds = party_ids.filter(id => !existingIds.includes(id));

        if (existingIds.length > 0) {
            const values = existingIds.map(party_id => [book_id, party_id]);
            await db.query(`INSERT IGNORE INTO book_party_link (book_id, party_id) VALUES ?`, [values]);
        }

        res.json({
            success: true,
            message: "Parties processed",
            linked: existingIds,
            invalid: invalidIds
        });

    } catch (error) {
        console.error("Error linking parties:", error);
        res.status(500).json({ error: error.message });
    }
};


exports.getPartyByBook = async (req, res) => {
    try {
        const { bookId } = req.params;

        const [parties] = await db.execute(`
            SELECT p.* FROM book_party_link bpl
            JOIN parties p ON bpl.party_id = p.id
            WHERE bpl.book_id = ?`, [bookId]);

        res.json({ book_id: bookId, linked_parties: parties });

    } catch (error) {
        console.error("Error fetching parties for book:", error);
        res.status(500).json({ error: error.message });
    }
};


// Unlink a party from a book
exports.unlinkPartyFromBook = async (req, res) => {
    try {
        const { bookId, partyId } = req.params;

        if (!bookId || !partyId) {
            return res.status(400).json({ error: "bookId and partyId are required" });
        }

        const [result] = await db.execute(
            `DELETE FROM book_party_link WHERE book_id = ? AND party_id = ?`,
            [bookId, partyId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Link not found or already deleted" });
        }

        res.json({
            success: true,
            message: `Party ${partyId} unlinked from book ${bookId}`
        });

    } catch (error) {
        console.error("Error unlinking party:", error);
        res.status(500).json({ error: error.message });
    }
};
