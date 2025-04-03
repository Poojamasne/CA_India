const db = require("../db");

// ✅ Add a new book
exports.addBook = async (req, res) => {
    const {
        book_name,
        inventory_status,
        business_id,
        net_balance,
        receipt,
        payment,
        recent_entries_date,
        party_id,
        income_tax_challan,
        entry_by,
        entry_time,
        balance
    } = req.body;

    if (!book_name) {
        return res.status(400).json({ success: false, message: "Book name is required" });
    }

    try {
        const [result] = await db.query(
            "INSERT INTO books (book_name, inventory_status, business_id, net_balance, receipt, payment, recent_entries_date, party_id, income_tax_challan, entry_by, entry_time, balance, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())",
            [
                book_name,
                inventory_status ?? true,
                business_id ?? null,
                net_balance ?? 0,
                receipt ?? 0,
                payment ?? 0,
                recent_entries_date ?? null,
                party_id ?? null,
                income_tax_challan ?? null,
                entry_by ?? null,
                entry_time ?? null,
                balance ?? 0
            ]
        );

        // Retrieve the last inserted book_id
        const bookId = result.insertId;

        res.status(201).json({ success: true, message: "Book added successfully", book_id: bookId });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to add book", error: err.message });
    }
};


// ✅ Get all books
// exports.getBooks = async (req, res) => {
//     try {
//         const [books] = await db.query("SELECT * FROM books");
//         res.status(200).json({ success: true, data: books });
//     } catch (err) {
//         res.status(500).json({ success: false, message: "Failed to fetch books", error: err.message });
//     }
// };


// ✅ Get all books with member count
exports.getBooks = async (req, res) => {
    try {
        const [books] = await db.query(`
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
                COUNT(m.member_name) AS member_count
            FROM books b
            LEFT JOIN book_members m ON b.book_id = m.book_id
            GROUP BY b.book_id
        `);

        res.status(200).json({ success: true, data: books });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to fetch books", error: err.message });
    }
};

exports.getBookById = async (req, res) => {
    const { book_id } = req.params;

    try {
        const [book] = await db.query("SELECT * FROM books WHERE book_id = ?", [book_id]);

        if (book.length === 0) {
            return res.status(404).json({ success: false, message: "Book not found" });
        }

        res.status(200).json({ success: true, data: book[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to fetch book", error: err.message });
    }
};

// ✅ Rename a book
exports.renameBook = async (req, res) => {
    const { book_id } = req.params;
    const { new_name } = req.body;

    if (!new_name) {
        return res.status(400).json({ success: false, message: "New book name is required" });
    }

    try {
        const [result] = await db.query("UPDATE books SET book_name = ? WHERE book_id = ?", [new_name, book_id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Book not found" });
        }

        res.status(200).json({ success: true, message: "Book renamed successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to rename book", error: err.message });
    }
};

// ✅ Add a member to a book
exports.addMember = async (req, res) => {
    const { book_id, member_name } = req.body;

    if (!book_id || !member_name) {
        return res.status(400).json({ success: false, message: "Book ID and Member Name are required" });
    }

    try {
        // Check if the book exists
        const [book] = await db.query("SELECT book_id FROM books WHERE book_id = ?", [book_id]);

        if (book.length === 0) {
            return res.status(404).json({ success: false, message: "Book ID does not exist" });
        }

        // Insert the member if the book exists
        await db.query("INSERT INTO book_members (book_id, member_name) VALUES (?, ?)", 
                      [book_id, member_name]);

        res.status(201).json({ success: true, message: "Member added successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to add member", error: err.message });
    }
};


// ✅ Delete a book
exports.deleteBook = async (req, res) => {
    const { book_id } = req.params; 

    try {
        const [result] = await db.execute("DELETE FROM books WHERE book_id = ?", [book_id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Book not found" });
        }

        res.status(200).json({ success: true, message: "Book deleted successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to delete book", error: err.message });
    }
};

// ✅ Get all books by user ID
// ✅ Get all books by user ID
exports.getBooksByUserId = async (req, res) => {
    const { user_id } = req.params;

    if (!user_id || isNaN(user_id)) {
        return res.status(400).json({ 
            success: false, 
            message: "Valid user ID is required" 
        });
    }

    try {
        const [books] = await db.query(`
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
                COUNT(m.member_name) AS member_count
            FROM books b
            LEFT JOIN book_members m ON b.book_id = m.book_id
            WHERE b.entry_by = ?
            GROUP BY b.book_id
            ORDER BY b.created_at DESC
        `, [parseInt(user_id)]);  // Ensure numeric user_id

        if (books.length === 0) {
            return res.status(404).json({ 
                success: true, 
                message: "No books found for this user",
                data: []
            });
        }

        res.status(200).json({ 
            success: true, 
            data: books 
        });
    } catch (err) {
        console.error("Error fetching books:", err);
        res.status(500).json({ 
            success: false, 
            message: "Failed to fetch books", 
            error: err.message 
        });
    }
};


