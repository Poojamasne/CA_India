const db = require("../db");

// ✅ Add Business
exports.addBusiness = async (req, res) => {
    const { business_name } = req.body;

    if (!business_name) {
        return res.status(400).json({ success: false, message: "Business name is required" });
    }

    try {
        const [result] = await db.query("INSERT INTO businesses (business_name) VALUES (?)", [business_name]);

        // Add the default user role as 'Owner' in business_members table
        await db.query("INSERT INTO business_members (business_id, user_role) VALUES (?, 'Owner')", [result.insertId]);

        res.status(201).json({ success: true, message: "Business added successfully", business_id: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to add business", error: error.message });
    }
};

// ✅ Update Business Category
exports.updateBusinessCategory = async (req, res) => {
    const { id } = req.params;
    const { business_category } = req.body;

    const validCategories = ["Agriculture", "Construction", "Education", "Electronics", "Financial Services", "Food/Restaurant", "Other"];
    if (!validCategories.includes(business_category)) {
        return res.status(400).json({ success: false, message: "Invalid business category" });
    }

    try {
        const [result] = await db.query("UPDATE businesses SET business_category = ? WHERE business_id = ?", [business_category, id]);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Business not found" });

        res.status(200).json({ success: true, message: "Business category updated" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to update category", error: error.message });
    }
};

// ✅ Update Business Type
exports.updateBusinessType = async (req, res) => {
    const { id } = req.params;
    const { business_type } = req.body;

    const validTypes = ["Retailer", "Distributor", "Manufacturer", "Service Provider", "Other"];
    if (!validTypes.includes(business_type)) {
        return res.status(400).json({ success: false, message: "Invalid business type" });
    }

    try {
        const [result] = await db.query("UPDATE businesses SET business_type = ? WHERE business_id = ?", [business_type, id]);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Business not found" });

        res.status(200).json({ success: true, message: "Business type updated" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to update type", error: error.message });
    }
};

// ✅ Get All Businesses with Role & Book Count
exports.getBusinesses = async (req, res) => {
    try {
        const [businesses] = await db.query(`
            SELECT 
                b.business_id, 
                b.business_name, 
                bm.user_role, 
                COALESCE((SELECT COUNT(*) FROM books WHERE books.business_id = b.business_id), 0) AS book_count
            FROM businesses b
            LEFT JOIN business_members bm ON b.business_id = bm.business_id
            GROUP BY b.business_id, bm.user_role;
        `);

        res.status(200).json({ success: true, data: businesses });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch businesses", error: error.message });
    }
};


exports.getBusinessesByUserId = async (req, res) => {
    const { user_id } = req.params;

    if (!user_id || isNaN(user_id)) {
        return res.status(400).json({
            success: false,
            message: "Valid user ID is required"
        });
    }

    try {
        const [businesses] = await db.query(`
            SELECT DISTINCT b.* 
            FROM businesses b
            JOIN books bk ON b.business_id = bk.business_id
            WHERE bk.entry_by = ?
            ORDER BY b.created_at DESC
        `, [parseInt(user_id)]);

        res.status(200).json({
            success: true,
            count: businesses.length,
            data: businesses
        });
    } catch (err) {
        console.error("Error fetching businesses:", err);
        res.status(500).json({
            success: false,
            message: "Failed to fetch businesses",
            error: err.message
        });
    }
};

// ✅ Get a Single Business by ID
exports.getBusinessById = async (req, res) => {
    const { id } = req.params;

    try {
        const [business] = await db.query(`
            SELECT 
                b.business_id, 
                b.business_name, 
                bm.user_role, 
                COALESCE((SELECT COUNT(*) FROM books WHERE books.business_id = b.business_id), 0) AS book_count
            FROM businesses b
            LEFT JOIN business_members bm ON b.business_id = bm.business_id
            WHERE b.business_id = ?
            GROUP BY b.business_id, bm.user_role;
        `, [id]);

        if (business.length === 0) return res.status(404).json({ success: false, message: "Business not found" });

        res.status(200).json({ success: true, data: business[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch business", error: error.message });
    }
};

// ✅ Delete a Business
exports.deleteBusiness = async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await db.query("DELETE FROM businesses WHERE business_id = ?", [id]);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Business not found" });

        res.status(200).json({ success: true, message: "Business deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to delete business", error: error.message });
    }
};
