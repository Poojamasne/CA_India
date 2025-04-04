// Assuming you're using a database, here's how your model might look
const db = require('../db');

const createnotification = async (message, userId) => {
    const sql = 'INSERT INTO notifications (message, user_id) VALUES (?, ?)';
    const [result] = await db.query(sql, [message, userId]);
    return result.insertId;
};

const getnotifications = async () => {
    const sql = 'SELECT id, message, user_id as userId, created_at as timestamp FROM notifications ORDER BY created_at DESC';
    const [results] = await db.query(sql);
    return results;
};

const getnotificationsByStatus = async (status) => {
    const [rows] = await db.query("SELECT * FROM notifications WHERE status = ?", [status]);
    return rows;
};

module.exports = {
    createnotification,
    getnotifications,
    getnotificationsByStatus
};