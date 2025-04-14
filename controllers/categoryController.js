const db = require("../db");

// ✅ Predefined Category Groups
const CATEGORY_GROUPS = [
    "Direct Income",
    "Indirect Income",
    "Capital Receipt",
    "Direct Expenses",
    "Indirect Expenses",
    "Capital Expenses",
    "Advance",
    "Miscellaneous Expenses"
];

// ✅ Get all categories
const getAllCategories = async (req, res) => {
    const { user_id } = req.query;

    if (!user_id) {
        return res.status(400).json({ message: "user_id is required" });
    }

    try {
        const [categories] = await db.query(
            "SELECT * FROM categories WHERE user_id = ?",
            [user_id]
        );

        res.status(200).json({
            success: true,
            count: categories.length,
            categories
        });
    } catch (err) {
        res.status(500).json({ message: "Database error", error: err.message });
    }
};

// ✅ Get all predefined and dynamic category groups
const getCategoryGroups = async (req, res) => {
    try {
        const [dynamicGroups] = await db.query("SELECT group_name FROM category_groups");
        const allGroups = [...CATEGORY_GROUPS, ...dynamicGroups.map(g => g.group_name)];
        res.json({ category_groups: allGroups });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ✅ Add a new category group dynamically
const addCategoryGroup = async (req, res) => {
    const { group_name } = req.body;
    
    if (!group_name) {
        return res.status(400).json({ message: "Group name is required" });
    }

    const [existingGroup] = await db.query("SELECT * FROM category_groups WHERE group_name = ?", [group_name]);
    if (existingGroup.length > 0 || CATEGORY_GROUPS.includes(group_name)) {
        return res.status(400).json({ message: "Category group already exists" });
    }

    try {
        const [result] = await db.query("INSERT INTO category_groups (group_name) VALUES (?)", [group_name]);
        res.json({ message: "Category group added successfully", id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ✅ Create a new category
const createCategory = async (req, res) => {
    const { category_name, amount, category_group, user_id } = req.body;

    if (!category_name || amount === undefined || !category_group || !user_id) {
        return res.status(400).json({ message: "Category name, amount, category group, and user ID are required" });
    }

    // Validate group
    const [dynamicGroups] = await db.query("SELECT group_name FROM category_groups");
    const allGroups = [...CATEGORY_GROUPS, ...dynamicGroups.map(g => g.group_name)];

    if (!allGroups.includes(category_group)) {
        return res.status(400).json({ message: "Invalid category group" });
    }

    try {
        const [result] = await db.query(
            "INSERT INTO categories (category_name, amount, category_group, user_id) VALUES (?, ?, ?, ?)",
            [category_name, amount, category_group, user_id]
        );
        res.status(201).json({
            success: true,
            message: "Category added successfully",
            category: { id: result.insertId, category_name, amount, category_group, user_id }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// ✅ Update category amount
const updateCategoryAmount = async (req, res) => {
    const { id } = req.params;
    const { amount } = req.body;
    
    try {
        await db.query("UPDATE categories SET amount = ? WHERE id = ?", [amount, id]);
        res.json({ success: true, message: "Category amount updated successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ✅ Delete a category
const deleteCategory = async (req, res) => {
    const { id } = req.params;
    
    try {
        await db.query("DELETE FROM categories WHERE id = ?", [id]);
        res.json({ message: "Category deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ✅ Get all categories by group
const getCategoriesByGroup = async (req, res) => {
    const { category_group } = req.params;

    const [dynamicGroups] = await db.query("SELECT group_name FROM category_groups");
    const allGroups = [...CATEGORY_GROUPS, ...dynamicGroups.map(g => g.group_name)];

    if (!allGroups.includes(category_group)) {
        return res.status(400).json({ message: "Invalid category group" });
    }

    try {
        const [results] = await db.query("SELECT * FROM categories WHERE category_group = ?", [category_group]);
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// ✅ Export all functions
module.exports = {
    getAllCategories,
    getCategoryGroups,
    addCategoryGroup,
    createCategory,
    updateCategoryAmount,
    deleteCategory,
    getCategoriesByGroup,

};
