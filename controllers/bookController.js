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


// ✅ Add a new book (with user verification)
exports.addnewBook = async (req, res) => {
    const { book_name, inventory_status, business_id, user_id } = req.body;

    if (!book_name || inventory_status === undefined || !business_id || !user_id) {
        return res.status(400).json({ 
            success: false, 
            message: "Book name, inventory status, business ID, and user ID are required",
            missing_fields: {
                book_name: !book_name,
                inventory_status: inventory_status === undefined,
                business_id: !business_id,
                user_id: !user_id
            }
        });
    }

    try {
        // Verify user exists (optional additional check)
        const [userCheck] = await db.query(
            "SELECT id FROM users WHERE id = ?",
            [user_id]
        );

        if (userCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found",
                code: "USER_NOT_FOUND"
            });
        }

        const [result] = await db.query(
            "INSERT INTO books (book_name, inventory_status, business_id, user_id, created_at) VALUES (?, ?, ?, ?, NOW())",
            [book_name, inventory_status, business_id, user_id]
        );

        res.status(201).json({ 
            success: true, 
            message: "Book added successfully", 
            book_id: result.insertId,
            user_id: user_id,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).json({ 
            success: false, 
            message: "Failed to add book", 
            error: err.message,
            code: "BOOK_CREATION_FAILED"
        });
    }
};

// ✅ Get books by user ID
exports.getBooksByUserId = async (req, res) => {
    const { user_id } = req.params;

    if (!user_id) {
        return res.status(400).json({
            success: false,
            message: "User ID is required",
            code: "USER_ID_REQUIRED"
        });
    }

    try {
        // Get all books for the specified user
        const [books] = await db.query(
            `SELECT 
                book_id, 
                book_name, 
                inventory_status, 
                business_id, 
                created_at,
                user_id
             FROM books 
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [user_id]
        );

        res.status(200).json({
            success: true,
            books: books,
            count: books.length,
            user_id: user_id
        });
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).json({
            success: false,
            message: "Failed to fetch books",
            error: err.message,
            code: "BOOK_FETCH_FAILED"
        });
    }
};

// ✅ Get single book with user verification
exports.getBookById = async (req, res) => {
    const { book_id, user_id } = req.params;

    if (!book_id || !user_id) {
        return res.status(400).json({
            success: false,
            message: "Book ID and User ID are required",
            code: "IDS_REQUIRED"
        });
    }

    try {
        const [book] = await db.query(
            `SELECT 
                book_id, 
                book_name, 
                inventory_status, 
                business_id, 
                created_at,
                user_id
             FROM books 
             WHERE book_id = ? AND user_id = ?`,
            [book_id, user_id]
        );

        if (book.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Book not found or not owned by user",
                code: "BOOK_NOT_FOUND"
            });
        }

        res.status(200).json({
            success: true,
            book: book[0],
            user_id: user_id
        });
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).json({
            success: false,
            message: "Failed to fetch book",
            error: err.message,
            code: "BOOK_FETCH_FAILED"
        });
    }
};



