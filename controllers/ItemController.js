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
        const { item_name, quantity_measurement, gst_rate, opening_stock, opening_stock_date, hsn_code } = req.body;

        // Check for required fields
        if (!item_name || !quantity_measurement || !gst_rate || !opening_stock || !opening_stock_date || !hsn_code) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Validate quantity measurement
        if (!validMeasurements.includes(quantity_measurement)) {
            return res.status(400).json({ message: "Invalid quantity measurement unit" });
        }

        // Insert into database
        const sql = "INSERT INTO items (item_name, quantity_measurement, gst_rate, opening_stock, opening_stock_date, hsn_code) VALUES (?, ?, ?, ?, ?, ?)";
        const values = [item_name, quantity_measurement, gst_rate, opening_stock, opening_stock_date, hsn_code];

        const [result] = await db.query(sql, values);
        res.status(201).json({ success: true, message: "Item added successfully", item_id: result.insertId });
    } catch (err) {
        res.status(500).json({ message: "Database error", error: err });
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
