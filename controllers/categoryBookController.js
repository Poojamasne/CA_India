const db = require("../db");

// Add a new category and link it to a book
// exports.addCategory = async (req, res) => {
//     const { category_name, book_id } = req.body;

//     if (!category_name) {
//         return res.status(400).json({ success: false, message: "Category name is required" });
//     }

//     try {
//         // ✅ Insert new category
//         const [result] = await db.query(
//             "INSERT INTO categories (category_name) VALUES (?)",
//             [category_name]
//         );

//         const categoryId = result.insertId;

//         let updatedBook = null;

//         // ✅ If book_id is provided, update the book with the new category
//         if (book_id) {
//             await db.query("UPDATE books SET category_id = ? WHERE book_id = ?", [categoryId, book_id]);

//             // Fetch the updated book details
//             const [bookResult] = await db.query(
//                 "SELECT book_id, book_name, category_id FROM books WHERE book_id = ?",
//                 [book_id]
//             );

//             if (bookResult.length > 0) {
//                 updatedBook = bookResult[0];
//             }
//         }

//         res.status(201).json({
//             success: true,
//             message: "Category added successfully",
//             category: { id: categoryId, category_name },
//             book_updated: updatedBook || "No book linked"
//         });

//     } catch (err) {
//         res.status(500).json({ success: false, message: "Failed to add category", error: err.message });
//     }
// };

// ✅ 2️⃣ Add a new category **group** and link it to books
// exports.addCategoryGroup = async (req, res) => {
//     const { category_group, books_id } = req.body;

//     if (!category_group) {
//         return res.status(400).json({ success: false, message: "Category group is required" });
//     }

//     try {
//         const [result] = await db.query(
//             "INSERT INTO category_groups (category_group) VALUES (?)",
//             [category_group]
//         );

//         const categoryGroupId = result.insertId;

//         // ✅ If books_id is provided, link the category group to the book
//         if (books_id) {
//             await db.query("UPDATE books SET category_group_id = ? WHERE book_id = ?", [categoryGroupId, books_id]);
//         }

//         res.status(201).json({
//             success: true,
//             message: "Category group added successfully",
//             category_group: { id: categoryGroupId, category_group },
//             book_updated: books_id ? books_id : "No book linked"
//         });
//     } catch (err) {
//         res.status(500).json({ success: false, message: "Failed to add category group", error: err.message });
//     }
// };

// exports.addCategoryGroup = async (req, res) => {
//     const { category_group } = req.body;

//     if (!category_group) {
//         return res.status(400).json({ success: false, message: "Category group is required" });
//     }

//     try {
//         const [result] = await db.query(
//             "INSERT INTO categories (category_group) VALUES (?)",
//             [category_group]
//         );

//         res.status(201).json({
//             success: true,
//             message: "Category group added successfully",
//             category_group: { id: result.insertId, category_group }
//         });
//     } catch (err) {
//         res.status(500).json({
//             success: false,
//             message: "Failed to add category group",
//             error: err.message
//         });
//     }
// };

exports.addCategoryGroup = async (req, res) => {
    const { category_group } = req.body;

    if (!category_group) {
        return res.status(400).json({ success: false, message: "Category group is required" });
    }

    try {
        const [result] = await db.query(
            "INSERT INTO categories (category_group) VALUES (?)",
            [category_group]
        );

        res.status(201).json({
            success: true,
            message: "Category group added successfully",
            category_group: { id: result.insertId, category_group }
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Failed to add category group",
            error: err.message
        });
    }
};

// Get categories linked to a specific book
// exports.getCategoriesByBook = async (req, res) => {
//     const { book_id } = req.params;

//     try {
//         const [result] = await db.query(`
//             SELECT 
//                 b.book_id, 
//                 b.book_name, 
//                 b.inventory_status, 
//                 b.business_id, 
//                 b.net_balance, 
//                 b.receipt, 
//                 b.payment, 
//                 b.recent_entries_date, 
//                 b.party_id, 
//                 b.income_tax_challan, 
//                 b.entry_by, 
//                 b.entry_time, 
//                 b.balance, 
//                 b.created_at, 
//                 c.id AS category_id,
//                 c.category_name, 
//                 c.amount, 
//                 c.category_group
//             FROM books b
//             LEFT JOIN categories c ON b.category_id = c.id
//             WHERE b.book_id = ?;
//         `, [book_id]);

//         if (result.length === 0) {
//             return res.status(404).json({ success: false, message: "Book not found or no category linked" });
//         }

//         res.status(200).json({ success: true, book: result[0], categories: result });
//     } catch (err) {
//         res.status(500).json({ success: false, message: "Failed to fetch categories for this book", error: err.message });
//     }
// };

exports.getCategoriesByBook = async (req, res) => {
    const { book_id } = req.params;

    try {
        // Get the book details
        const [bookResult] = await db.query(`
            SELECT 
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
                created_at
            FROM books 
            WHERE book_id = ?
        `, [book_id]);

        if (bookResult.length === 0) {
            return res.status(404).json({ success: false, message: "Book not found" });
        }

        const book = bookResult[0];

        // ✅ Fetch categories using the linking table
        const [categoryResult] = await db.query(`
            SELECT 
                c.id AS category_id,
                c.category_name
            FROM categories c
            INNER JOIN book_category_link bcl ON c.id = bcl.category_id
            WHERE bcl.book_id = ?
        `, [book_id]);

        res.status(200).json({
            success: true,
            book: book,
            categories: categoryResult
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch categories for this book",
            error: err.message
        });
    }
};

// Link categories to a book
exports.linkCategoryToBook = async (req, res) => {
    const { book_id, category_ids } = req.body;

    if (!book_id || !Array.isArray(category_ids)) {
        return res.status(400).json({ error: "book_id and category_ids array are required" });
    }

    try {
        // Fetch existing category IDs
        const [existing] = await db.query(`SELECT id FROM categories WHERE id IN (?)`, [category_ids]);
        const existingIds = existing.map(c => c.id);

        const invalidIds = category_ids.filter(id => !existingIds.includes(id));

        if (existingIds.length > 0) {
            const values = existingIds.map(category_id => [book_id, category_id]);
            await db.query(`INSERT IGNORE INTO book_category_link (book_id, category_id) VALUES ?`, [values]);
        }

        res.json({
            success: true,
            message: "Categories processed",
            linked: existingIds,
            invalid: invalidIds
        });

    } catch (error) {
        console.error("Error linking categories:", error);
        res.status(500).json({ error: error.message });
    }
};

// Link category groups to a book
exports.linkCategoryGroupToBook = async (req, res) => {
    const { book_id, category_group_ids } = req.body;

    if (!book_id || !Array.isArray(category_group_ids)) {
        return res.status(400).json({ error: "book_id and category_group_ids array are required" });
    }

    try {
        // Fetch existing category group IDs
        const [existing] = await db.query(`SELECT id FROM category_groups WHERE id IN (?)`, [category_group_ids]);
        const existingIds = existing.map(cg => cg.id);

        const invalidIds = category_group_ids.filter(id => !existingIds.includes(id));

        if (existingIds.length > 0) {
            const values = existingIds.map(group_id => [book_id, group_id]);
            await db.query(`INSERT IGNORE INTO book_category_group_link (book_id, category_group_id) VALUES ?`, [values]);
        }

        res.json({
            success: true,
            message: "Category groups processed",
            linked: existingIds,
            invalid: invalidIds
        });

    } catch (error) {
        console.error("Error linking category groups:", error);
        res.status(500).json({ error: error.message });
    }
};


// Get categories by group linked to a book
exports.getCategoriesByGroup = async (req, res) => {
    const { book_id } = req.params;

    try {
        const [result] = await db.query(`
            SELECT 
                bcgl.book_id,
                cg.id AS category_group_id,
                cg.group_name AS category_group_name,
                c.id AS category_id,
                c.category_name
            FROM book_category_group_link bcgl
            JOIN category_groups cg ON bcgl.category_group_id = cg.id
            LEFT JOIN categories c ON c.category_group_id = cg.id
            WHERE bcgl.book_id = ?
            ORDER BY cg.id, c.id;
        `, [book_id]);

        if (result.length === 0) {
            return res.status(404).json({ success: false, message: "No categories found for this book" });
        }

        // Group categories under their category group
        const grouped = {};
        result.forEach(row => {
            if (!grouped[row.category_group_id]) {
                grouped[row.category_group_id] = {
                    category_group_id: row.category_group_id,
                    category_group_name: row.category_group_name,
                    categories: []
                };
            }
            if (row.category_id) {
                grouped[row.category_group_id].categories.push({
                    category_id: row.category_id,
                    category_name: row.category_name
                });
            }
        });

        res.status(200).json({
            success: true,
            book_id: book_id,
            category_groups: Object.values(grouped)
        });

    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to fetch categories", error: err.message });
    }
};
