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

// ✅ Add a member to a book with phone number
exports.addMember = async (req, res) => {
    const { book_id, member_name, phone_number, role } = req.body;

    if (!book_id || !member_name || !phone_number || !role) {
        return res.status(400).json({ 
            success: false, 
            message: "Book ID, Member Name, Phone Number, and Role are required" 
        });
    }

    try {
        // Check if the book exists
        const [book] = await db.query("SELECT book_id FROM books WHERE book_id = ?", [book_id]);

        if (book.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Book ID does not exist" 
            });
        }

        // Insert the member and get the insertId
        const [result] = await db.query(
            "INSERT INTO book_members (book_id, member_name, phone_number, role) VALUES (?, ?, ?, ?)", 
            [book_id, member_name, phone_number, role]
        );

        res.status(201).json({ 
            success: true, 
            message: "Member added successfully",
            member_id: result.insertId // ← return new member ID here
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            message: "Failed to add member", 
            error: err.message 
        });
    }
};


exports.updateMember = async (req, res) => {
    const { id } = req.params; // member ID
    const { member_name, phone_number, role } = req.body;

    if (!id || !member_name || !phone_number || !role) {
        return res.status(400).json({
            success: false,
            message: "Member ID, Name, Phone Number, and Role are required"
        });
    }

    try {
        // Check if the member exists
        const [existingMember] = await db.query("SELECT * FROM book_members WHERE id = ?", [id]);

        if (existingMember.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Member not found"
            });
        }

        // Update member details
        await db.query(
            `UPDATE book_members 
             SET member_name = ?, phone_number = ?, role = ? 
             WHERE id = ?`,
            [member_name, phone_number, role, id]
        );

        res.status(200).json({
            success: true,
            message: "Member updated successfully"
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Failed to update member",
            error: err.message
        });
    }
};

// 📌 Get all members by book_id
exports.getAllMembersByBookId = async (req, res) => {
    const { book_id } = req.params;

    if (!book_id) {
        return res.status(400).json({ success: false, message: "Book ID is required" });
    }

    try {
        const [members] = await db.query(
            `SELECT id, member_name, phone_number, role 
             FROM book_members 
             WHERE book_id = ?`, 
            [book_id]
        );

        res.json({
            success: true,
            book_id,
            members,
            count: members.length
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            message: "Failed to fetch members", 
            error: err.message 
        });
    }
};


exports.deleteMember = async (req, res) => {
    const { book_id, member_name } = req.params;

    if (!book_id || !member_name) {
        return res.status(400).json({ success: false, message: "Book ID and Member Name are required" });
    }

    try {
        const [result] = await db.query("DELETE FROM book_members WHERE book_id = ? AND member_name = ?", [book_id, member_name]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Member not found" });
        }

        res.status(200).json({ success: true, message: "Member deleted successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to delete member", error: err.message });
    }
};
    
// Delete member by ID
exports.deleteMemberbyID = async (req, res) => {
    const { member_id } = req.params;

    if (!member_id) {
        return res.status(400).json({ success: false, message: "Member ID is required" });
    }

    try {
        const [result] = await db.query("DELETE FROM book_members WHERE id = ?", [member_id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Member not found" });
        }

        res.json({ success: true, message: "Member deleted successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to delete member", error: err.message });
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

//     if (!book_id || isNaN(book_id) || !user_id || isNaN(user_id)) {
//         return res.status(400).json({
//             success: false,
//             message: "Valid Book ID and User ID are required",
//             code: "IDS_REQUIRED"
//         });
//     }

//     try {
//         const [book] = await db.query(
//             `SELECT 
//                 b.book_id, 
//                 b.book_name, 
//                 b.inventory_status, 
//                 b.business_id, 
//                 b.created_at,
//                 b.user_id,
//                 (
//                     SELECT COUNT(*) 
//                     FROM book_members 
//                     WHERE book_members.book_id = b.book_id
//                 ) AS member_count,
//                 (
//                     SELECT JSON_ARRAYAGG(
//                         JSON_OBJECT(
//                             'id', re.id,
//                             'receipt_no', re.receipt_no,
//                             'amount', re.amount,
//                             'receipt_type', re.receipt_type,
//                             'created_at', DATE_FORMAT(re.created_at, '%Y-%m-%d %H:%i:%s')
//                         )
//                     )
//                     FROM (
//                         SELECT * 
//                         FROM receipt_entries 
//                         WHERE book_id = b.book_id 
//                         ORDER BY created_at DESC 
//                         LIMIT 3
//                     ) AS re
//                 ) AS recent_receipts
//              FROM books b
//              WHERE b.book_id = ?
//                AND (
//                    b.user_id = ?
//                    OR EXISTS (
//                        SELECT 1 FROM book_members 
//                        WHERE book_members.book_id = b.book_id AND book_members.user_id = ?
//                    )
//                )
//              LIMIT 1`,
//             [book_id, user_id, user_id]
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
//             book: {
//                 ...book[0],
//                 inventory_status: Boolean(book[0].inventory_status),
//                 created_at: new Date(book[0].created_at).toLocaleString(),
//                 member_count: book[0].member_count || 0,
//                 recent_receipts: Array.isArray(book[0].recent_receipts)
//                 ? book[0].recent_receipts
//                 : JSON.parse(book[0].recent_receipts || "[]")

//             },
//             user_id: parseInt(user_id),
//             timestamp: new Date().toISOString()
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
                    FROM book_members 
                    WHERE book_members.book_id = b.book_id
                ) AS member_count,
                (
                    SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'id', re.id,
                            'receipt_no', re.receipt_no,
                            'amount', re.amount,
                            'receipt_type', re.receipt_type,
                            'created_at', DATE_FORMAT(re.created_at, '%Y-%m-%d %H:%i:%s'),
                            'partyName', re.party,
                            'categorySplit', CAST(re.category_split AS JSON),
                            'balance', re.amount
                        )
                    )
                    FROM (
                        SELECT * 
                        FROM receipt_entries 
                        WHERE book_id = b.book_id 
                        ORDER BY created_at DESC 
                        LIMIT 3
                    ) AS re
                ) AS recent_receipts,
                (
                    SELECT IFNULL(SUM(amount), 0)
                    FROM receipt_entries
                    WHERE book_id = b.book_id AND receipt_type = 'receipt'
                ) AS receipt,
                (
                    SELECT IFNULL(SUM(amount), 0)
                    FROM receipt_entries
                    WHERE book_id = b.book_id AND receipt_type = 'payment'
                ) AS payment
             FROM books b
             WHERE b.book_id = ?
               AND (
                   b.user_id = ? 
                   OR EXISTS (
                       SELECT 1 FROM book_members 
                       WHERE book_members.book_id = b.book_id AND book_members.user_id = ?
                   )
               )
             LIMIT 1`,
            [book_id, user_id, user_id]
        );

        if (!book || book.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Book not found or not owned by user",
                code: "BOOK_NOT_FOUND"
            });
        }

        const receipt = Number(book[0].receipt) || 0;
        const payment = Number(book[0].payment) || 0;
        const net_balance = receipt - payment;

        res.status(200).json({
            success: true,
            book: {
                ...book[0],
                inventory_status: Boolean(book[0].inventory_status),
                created_at: new Date(book[0].created_at).toLocaleString(),
                member_count: book[0].member_count || 0,
                receipt,
                payment,
                net_balance,
                recent_receipts: Array.isArray(book[0].recent_receipts)
                    ? book[0].recent_receipts
                    : JSON.parse(book[0].recent_receipts || "[]")
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

// ✅ Search books by business and user
exports.searchBooks = async (req, res) => {
    const { businessId, userId } = req.query;

    // Validate required parameters
    if (!businessId || !userId) {
        return res.status(400).json({
            success: false,
            message: "Both businessId and userId are required",
            code: "MISSING_PARAMETERS"
        });
    }

    try {
        // Verify user exists
        const [user] = await db.query(
            "SELECT id FROM users WHERE id = ?",
            [userId]
        );

        if (user.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found",
                code: "USER_NOT_FOUND"
            });
        }

        // Verify business exists
        const [business] = await db.query(
            "SELECT business_id FROM businesses WHERE business_id = ?",
            [businessId]
        );

        if (business.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Business not found",
                code: "BUSINESS_NOT_FOUND"
            });
        }

        // Search books that belong to both the user and business
        const [books] = await db.query(
            `SELECT 
                b.book_id, 
                b.book_name, 
                b.inventory_status,
                b.created_at,
                COUNT(bm.id) AS member_count
             FROM books b
             LEFT JOIN book_members bm ON b.book_id = bm.book_id
             WHERE b.business_id = ? AND b.user_id = ?
             GROUP BY b.book_id
             ORDER BY b.created_at DESC`,
            [businessId, userId]
        );

        res.status(200).json({
            success: true,
            data: books.map(book => ({
                ...book,
                inventory_status: Boolean(book.inventory_status),
                created_at: new Date(book.created_at).toISOString()
            })),
            count: books.length,
            businessId: parseInt(businessId),
            userId: parseInt(userId),
            timestamp: new Date().toISOString()
        });

    } catch (err) {
        console.error("Database error:", err);
        res.status(500).json({
            success: false,
            message: "Failed to search books",
            error: err.message,
            code: "BOOK_SEARCH_FAILED"
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


exports.getAllBooksByUserAndBusinessId = async (req, res) => {
    const { user_id } = req.params;
    const { business_id } = req.query; // or req.params if passed as a param

    // 🛑 Validate User ID
    if (!user_id || isNaN(user_id)) {
        return res.status(400).json({
            success: false,
            message: "Valid user ID is required",
            code: "INVALID_USER_ID"
        });
    }

    // 🛑 Validate Business ID
    if (!business_id || isNaN(business_id)) {
        return res.status(400).json({
            success: false,
            message: "Valid business ID is required",
            code: "INVALID_BUSINESS_ID"
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

        // ✅ Get books for specific user and business
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
             WHERE user_id = ? AND business_id = ?
             ORDER BY created_at DESC`,
            [user_id, business_id]
        );

        if (books.length === 0) {
            return res.status(200).json({
                success: true,
                books: [],
                count: 0,
                user_info: {
                    user_id: parseInt(user_id),
                    name: user[0].name,
                    email: user[0].email
                },
                timestamp: new Date().toISOString()
            });
        }

        // ✅ Get member counts for all books
        const [memberCounts] = await db.query(
            `SELECT book_id, COUNT(*) as member_count 
             FROM book_members 
             WHERE book_id IN (?) 
             GROUP BY book_id`,
            [books.map(book => book.book_id)]
        );

        const memberCountMap = {};
        memberCounts.forEach(mc => {
            memberCountMap[mc.book_id] = mc.member_count;
        });

        // ✅ Final response
        res.status(200).json({
            success: true,
            books: books.map(book => ({
                ...book,
                created_at: new Date(book.created_at).toLocaleString(),
                inventory_status: Boolean(book.inventory_status),
                member_count: memberCountMap[book.book_id] || 0
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


exports.addGradeToBook = async (req, res) => {
    const { book_id } = req.params;
    const { grade } = req.body;

    if (!book_id || !grade) {
        return res.status(400).json({
            success: false,
            message: "Book ID and grade are required"
        });
    }

    try {
        const [result] = await db.execute(
            "UPDATE books SET grade = ? WHERE book_id = ?",
            [grade, book_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Book not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Grade added to book successfully",
            book_id,
            grade
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to add grade",
            error: error.message
        });
    }
};

// ✅ POST: Link head account to a book
exports.linkHeadAccountToBook = async (req, res) => {
    const { book_id, head_account_id } = req.body;

    if (!book_id || !head_account_id) {
        return res.status(400).json({
            success: false,
            message: "Book ID and Head Account ID are required"
        });
    }

    try {
        const [result] = await db.query(
            "UPDATE books SET head_account_id = ? WHERE book_id = ?",
            [head_account_id, book_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Book not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Head account linked to book successfully"
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Failed to link head account",
            error: err.message
        });
    }
};
