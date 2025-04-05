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


// // ✅ Get single book with user verification
// exports.getBookById = async (req, res) => {
//     const { book_id, user_id } = req.params;

//     if (!book_id || !user_id) {
//         return res.status(400).json({
//             success: false,
//             message: "Book ID and User ID are required",
//             code: "IDS_REQUIRED"
//         });
//     }

//     try {
//         const [book] = await db.query(
//             `SELECT 
//                 book_id, 
//                 book_name, 
//                 inventory_status, 
//                 business_id, 
//                 created_at,
//                 user_id
//              FROM books 
//              WHERE book_id = ? AND user_id = ?`,
//             [book_id, user_id]
//         );

//         if (book.length === 0) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Book not found or not owned by user",
//                 code: "BOOK_NOT_FOUND"
//             });
//         }

//         res.status(200).json({
//             success: true,
//             book: book[0],
//             user_id: user_id
//         });
//     } catch (err) {
//         console.error("Database error:", err);
//         res.status(500).json({
//             success: false,
//             message: "Failed to fetch book",
//             error: err.message,
//             code: "BOOK_FETCH_FAILED"
//         });
//     }
// };

exports.getBookById = async (req, res) => {
    const { book_id, user_id } = req.params;

    if (!book_id || isNaN(book_id) || !user_id || isNaN(user_id)) {
        return res.status(400).json({
            success: false,
            message: "Valid Book ID and User ID are required",
            code: "IDS_REQUIRED"
        });
    }

    try {
        const [book] = await db.query(
            `SELECT 
                b.book_id, 
                b.book_name, 
                b.inventory_status, 
                b.business_id, 
                b.created_at,
                b.user_id,
                (
                    SELECT COUNT(*) 
                    FROM book_members bm 
                    WHERE bm.book_id = b.book_id
                ) AS member_count
             FROM books b
             WHERE b.book_id = ? AND b.user_id = ?
             LIMIT 1`,
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
            book: {
                ...book[0],
                inventory_status: Boolean(book[0].inventory_status),
                created_at: new Date(book[0].created_at).toLocaleString(),
                member_count: book[0].member_count || 0
            },
            user_id: parseInt(user_id),
            timestamp: new Date().toISOString()
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


// ✅ Add New Book
exports.addnewBook = async (req, res) => {
    try {
        const { book_name, inventory_status, business_id,user_id } = req.body;
        console.log("request body:", req.body); // Debugging line to check request body
        console.log("user id:", req.user); // Debugging line to check request body


        // 🛑 Check if User ID is present
        if (!user_id) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized - User ID is missing",
                code: "UNAUTHORIZED"
            });
        }

        // 🛑 Validate Required Fields
        if (!book_name || inventory_status === undefined || !business_id) {
            return res.status(400).json({
                success: false,
                message: "Book name, inventory status, and business ID are required",
                missing_fields: {
                    book_name: !book_name,
                    inventory_status: inventory_status === undefined,
                    business_id: !business_id
                }
            });
        }

        // ✅ Insert New Book into the Database
        const [result] = await db.query(
            `INSERT INTO books 
            (book_name, inventory_status, business_id, user_id, created_at) 
            VALUES (?, ?, ?, ?, NOW())`,
            [book_name, inventory_status, business_id, user_id]
        );

        // 🛑 Ensure the book was inserted
        if (result.affectedRows === 0) {
            return res.status(500).json({
                success: false,
                message: "Failed to add book",
                code: "BOOK_NOT_INSERTED"
            });
        }

        // ✅ Return the Correct Response
        res.status(201).json({
            success: true,
            message: "Book added successfully",
            book_id: result.insertId,
            user_id: user_id, // 🟢 Ensure user_id is included
            timestamp: new Date().toISOString() // 🟢 Ensure timestamp is included
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


// // // ✅ Get ALL Books by User ID
// exports.getAllBooksByUserId = async (req, res) => {
//     const { user_id } = req.params;

//     // 🛑 Validate User ID
//     if (!user_id || isNaN(user_id)) {
//         return res.status(400).json({
//             success: false,
//             message: "Valid user ID is required",
//             code: "INVALID_USER_ID"
//         });
//     }

//     try {
//         // ✅ Verify user exists
//         const [user] = await db.query(
//             "SELECT id, name, email FROM users WHERE id = ?",
//             [user_id]
//         );

//         if (user.length === 0) {
//             return res.status(404).json({
//                 success: false,
//                 message: "User not found",
//                 code: "USER_NOT_FOUND"
//             });
//         }

//         // ✅ Get books with all details from the books table
//         const [books] = await db.query(
//             `SELECT 
//                 book_id, 
//                 book_name, 
//                 inventory_status, 
//                 business_id,
//                 net_balance,
//                 receipt,
//                 payment,
//                 recent_entries_date,
//                 party_id,
//                 income_tax_challan,
//                 entry_by,
//                 entry_time,
//                 balance,
//                 created_at,
//                 referencer,
//                 category_id,
//                 head_account_id
//              FROM books 
//              WHERE user_id = ?
//              ORDER BY created_at DESC`,
//             [user_id]
//         );

//         // ✅ Return books data with user info
//         res.status(200).json({
//             success: true,
//             books: books.map(book => ({
//                 ...book,
//                 created_at: new Date(book.created_at).toLocaleString(),
//                 inventory_status: Boolean(book.inventory_status)
//             })),
//             count: books.length,
//             user_info: {
//                 user_id: parseInt(user_id),
//                 name: user[0].name,
//                 email: user[0].email
//             },
//             timestamp: new Date().toISOString()
//         });

//     } catch (err) {
//         console.error("Database error:", err);
//         res.status(500).json({
//             success: false,
//             message: "Failed to fetch books",
//             error: err.message,
//             code: "BOOK_FETCH_FAILED"
//         });
//     }
// };

exports.getAllBooksByUserId = async (req, res) => {
    const { user_id } = req.params;

    // 🛑 Validate User ID
    if (!user_id || isNaN(user_id)) {
        return res.status(400).json({
            success: false,
            message: "Valid user ID is required",
            code: "INVALID_USER_ID"
        });
    }

    try {
        // ✅ Verify user exists
        const [user] = await db.query(
            "SELECT id, name, email FROM users WHERE id = ?",
            [user_id]
        );

        if (user.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found",
                code: "USER_NOT_FOUND"
            });
        }

        // ✅ Get books with all details from the books table
        const [books] = await db.query(
            `SELECT 
                book_id, 
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
                balance,
                created_at,
                referencer,
                category_id,
                head_account_id
             FROM books 
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [user_id]
        );

        // ✅ Get member counts for all books in one query
        const [memberCounts] = await db.query(
            `SELECT book_id, COUNT(*) as member_count 
             FROM book_members 
             WHERE book_id IN (?) 
             GROUP BY book_id`,
            [books.map(book => book.book_id)]
        );

        // Create a map of book_id to member_count for easy lookup
        const memberCountMap = {};
        memberCounts.forEach(mc => {
            memberCountMap[mc.book_id] = mc.member_count;
        });

        // ✅ Return books data with user info and member counts
        res.status(200).json({
            success: true,
            books: books.map(book => ({
                ...book,
                created_at: new Date(book.created_at).toLocaleString(),
                inventory_status: Boolean(book.inventory_status),
                member_count: memberCountMap[book.book_id] || 0 // Default to 0 if no members
            })),
            count: books.length,
            user_info: {
                user_id: parseInt(user_id),
                name: user[0].name,
                email: user[0].email
            },
            timestamp: new Date().toISOString()
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
