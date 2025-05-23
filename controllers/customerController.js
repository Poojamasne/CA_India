const db = require('../db');

// POST - Create a new customer field
// POST - Create a new customer field
exports.addCustomerField = async (req, res) => {
    try {
        const { field_name, user_id, book_id } = req.body;

        // Validation
        if (!field_name?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Field name is required",
                code: "FIELD_NAME_REQUIRED"
            });
        }

        if (!user_id || isNaN(user_id)) {
            return res.status(400).json({
                success: false,
                message: "Valid user ID is required",
                code: "INVALID_USER_ID"
            });
        }

        if (!book_id || isNaN(book_id)) {
            return res.status(400).json({
                success: false,
                message: "Valid book ID is required",
                code: "INVALID_BOOK_ID"
            });
        }

        const [result] = await db.execute(
            `INSERT INTO customer_fields (field_name, user_id, book_id) 
             VALUES (?, ?, ?)`,
            [field_name.trim(), parseInt(user_id), parseInt(book_id)]
        );

        // Verify the insert was successful
        if (!result.insertId) {
            throw new Error("Insert operation failed - no ID returned");
        }

        // Fetch the newly created record
        const [newField] = await db.execute(
            `SELECT id, field_name, user_id, book_id, created_at 
             FROM customer_fields 
             WHERE id = ?`,
            [result.insertId]
        );

        return res.status(201).json({
            success: true,
            message: "Customer field created successfully",
            data: newField[0]
        });

    } catch (error) {
        console.error("Database operation failed:", error);
        
        // Handle specific database errors
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({
                success: false,
                message: "Invalid user_id or book_id - referenced record not found",
                code: "REFERENCE_ERROR"
            });
        } else if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: "Field name already exists for this user and book",
                code: "DUPLICATE_FIELD"
            });
        }

        // Generic database error
        return res.status(500).json({
            success: false,
            message: "Failed to create field",
            code: "DATABASE_ERROR",
            systemError: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

exports.getAllCustomerFields = async (req, res) => {
    try {
        const [fields] = await db.execute(
            `SELECT * FROM customer_fields`
        );

        res.json({
            success: true,
            count: fields.length,
            data: fields
        });

    } catch (error) {
        console.error("Error fetching customer fields:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch customer fields",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// GET - Get fields by book_id and user_id
exports.getFieldsByBookAndUser = async (req, res) => {
    try {
        const { book_id, user_id } = req.params;

        if (!book_id || !user_id || isNaN(book_id) || isNaN(user_id)) {
            return res.status(400).json({
                success: false,
                message: "Valid book ID and user ID are required",
                code: "INVALID_IDS"
            });
        }

        const [results] = await db.execute(
            `SELECT id, field_name, user_id, book_id
             FROM customer_fields
             WHERE book_id = ? AND user_id = ?`,
            [parseInt(book_id), parseInt(user_id)]
        );

        return res.json({
            success: true,
            count: results.length,
            data: results
        });

    } catch (error) {
        console.error("Get by book/user error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch fields",
            code: "DATABASE_ERROR"
        });
    }
};


// GET - Get all customer fields by book_id
exports.getFieldsByBookId = async (req, res) => {
    try {
        const { book_id } = req.params;

        if (!book_id || isNaN(book_id)) {
            return res.status(400).json({
                success: false,
                message: "Valid book ID is required",
                code: "INVALID_BOOK_ID"
            });
        }

        const [fields] = await db.execute(
            `SELECT id, field_name, user_id, book_id 
             FROM customer_fields 
             WHERE book_id = ?`,
            [parseInt(book_id)]
        );

        return res.json({
            success: true,
            count: fields.length,
            data: fields
        });

    } catch (error) {
        console.error("Error fetching customer fields by book_id:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch customer fields",
            code: "DATABASE_ERROR"
        });
    }
};
