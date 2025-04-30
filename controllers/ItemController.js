const db = require("../db");

// Allowed Quantity Measurements
const validMeasurements = [
    "Piece", "Box", "Packet", "Peti", "Bottle", "Pack", "Set", "Gram", "KG", "Bora",
    "ml", "Litre", "mm", "cm", "meter", "km", "inch", "feet", "sq.inch", "sq.ft", "sq.meter",
    "dozen", "bundle", "pouch", "carat", "gross", "minute", "hour", "day", "month", "year",
    "service", "work", "pound", "pair", "quintal", "ton", "plate", "person", "ratti", "trolley", "truck"
];

exports.addItem = async (req, res) => {
    try {
        const {
            item_name,
            quantity_measurement,
            gst_rate,
            opening_stock,
            opening_stock_date,
            hsn_code,
            user_id,
            book_id
        } = req.body;

        // Check for required fields
        if (!item_name || !quantity_measurement || !gst_rate || !opening_stock || !opening_stock_date || !hsn_code || !user_id || !book_id) {
            return res.status(400).json({ message: "All fields including user_id and book_id are required" });
        }

        // Validate quantity measurement
        if (!validMeasurements.includes(quantity_measurement)) {
            return res.status(400).json({ message: "Invalid quantity measurement unit" });
        }

        // Optional: Validate book and user exist
        const [[bookExists]] = await db.query("SELECT book_id FROM books WHERE book_id = ?", [book_id]);
        if (!bookExists) {
            return res.status(404).json({ message: "Book not found" });
        }

        const [[userExists]] = await db.query("SELECT id FROM users WHERE id = ?", [user_id]);
        if (!userExists) {
            return res.status(404).json({ message: "User not found" });
        }

        // Insert into database
        const sql = `
            INSERT INTO items 
            (item_name, quantity_measurement, gst_rate, opening_stock, opening_stock_date, hsn_code, user_id, book_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

        const values = [item_name, quantity_measurement, gst_rate, opening_stock, opening_stock_date, hsn_code, user_id, book_id];

        const [result] = await db.query(sql, values);

        res.status(201).json({
            success: true,
            message: "Item added successfully",
            item_id: result.insertId
        });
    } catch (err) {
        console.error("Add item error:", err);
        res.status(500).json({ message: "Database error", error: err.message });
    }
};


// Get all items
exports.getItems = async (req, res) => {
    try {
        const sql = "SELECT * FROM items";
        const [results] = await db.query(sql);
        res.json({ items: results });
    } catch (err) {
        res.status(500).json({ message: "Database error", error: err });
    }
};

// Get item by ID
exports.getItemById = async (req, res) => {
    try {
        const { id } = req.params;
        const sql = "SELECT * FROM items WHERE id = ?";
        const [result] = await db.query(sql, [id]);

        if (result.length === 0) {
            return res.status(404).json({ message: "Item not found" });
        }
        res.json({ item: result[0] });
    } catch (err) {
        res.status(500).json({ message: "Database error", error: err });
    }
};

// Delete item
exports.deleteItem = async (req, res) => {
    try {
        const { id } = req.params;
        const sql = "DELETE FROM items WHERE id = ?";
        await db.query(sql, [id]);
        res.json({ message: "Item deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Database error", error: err });
    }
};

// ✅ GET: Get Items by user_id and book_id
// exports.getItemsByUserAndBook = async (req, res) => {
//     try {
//         const { user_id, book_id } = req.query;

//         // 1. Check if parameters exist
//         if (!user_id || !book_id) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Both `user_id` and `book_id` are required.",
//             });
//         }

//         // 2. Check if user exists
//         const [[user]] = await db.query("SELECT id FROM users WHERE id = ?", [user_id]);
//         if (!user) {
//             return res.status(404).json({
//                 success: false,
//                 message: "User not found.",
//             });
//         }

//         // 3. Check if book exists (and belongs to user)
//         const [[book]] = await db.query(
//             "SELECT book_id FROM books WHERE book_id = ? AND user_id = ?",
//             [book_id, user_id]
//         );
//         if (!book) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Book not found or does not belong to this user.",
//             });
//         }

//         // 4. Fetch items
//         const [items] = await db.query(
//             `SELECT * FROM items WHERE user_id = ? AND book_id = ?`,
//             [user_id, book_id]
//         );

//         // 5. Return items (even if empty)
//         return res.status(200).json({
//             success: true,
//             count: items.length,
//             items,
//         });

//     } catch (err) {
//         console.error("Error:", err);
//         return res.status(500).json({
//             success: false,
//             message: "Server error while fetching items.",
//             error: err.message,
//         });
//     }
// };


exports.getItemsByUserAndBook = async (req, res) => {
    try {
        const { user_id, book_id } = req.query;

        // 1. Check if parameters exist
        if (!user_id || !book_id) {
            return res.status(400).json({
                success: false,
                message: "Both `user_id` and `book_id` are required.",
            });
        }

        // 2. Check if user exists
        const [userResult] = await db.query("SELECT id FROM users WHERE id = ?", [user_id]);
        if (userResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        // 3. Check if book exists (and belongs to user)
        const [bookResult] = await db.query(
            "SELECT book_id FROM books WHERE book_id = ? AND user_id = ?",
            [book_id, user_id]
        );
        if (bookResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Book not found or does not belong to this user.",
            });
        }

        // 4. Fetch items
        const [itemsResult] = await db.query(
            `SELECT * FROM items WHERE user_id = ? AND book_id = ?`,
            [user_id, book_id]
        );

        // 5. Calculate the required fields for each item
        const itemsWithStocks = await Promise.all(
            itemsResult.map(async (item) => {
                const openingStock = item.opening_stock;

                // Calculate Inward Register (Purchase)
                const [purchasesResult] = await db.query(
                    `SELECT COALESCE(SUM(quantity), 0) AS total_quantity FROM purchases WHERE item_id = ? AND user_id = ? AND book_id = ?`,
                    [item.id, user_id, book_id]
                );
                const inwardRegister = purchasesResult[0].total_quantity;

                // Calculate Outward Register (Sale)
                const [salesResult] = await db.query(
                    `SELECT COALESCE(SUM(quantity), 0) AS total_quantity FROM sales WHERE item_id = ? AND user_id = ? AND book_id = ?`,
                    [item.id, user_id, book_id]
                );
                const outwardRegister = salesResult[0].total_quantity;

                // Calculate Closing Stock
                const closingStock = openingStock + inwardRegister - outwardRegister;

                return {
                    ...item,
                    opening_stock: openingStock,
                    inward_register: inwardRegister,
                    outward_register: outwardRegister,
                    closing_stock: closingStock,
                };
            })
        );

        // 6. Return items with calculated fields (even if empty)
        return res.status(200).json({
            success: true,
            count: itemsWithStocks.length,
            items: itemsWithStocks,
        });

    } catch (err) {
        console.error("Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching items.",
            error: err.message,
        });
    }
};