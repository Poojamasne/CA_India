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


const getnotificationsByStatusAndUser = async (status, user_id) => {
    const [notifications] = await db.query(
        "SELECT * FROM notifications WHERE status = ? AND user_id = ? ORDER BY created_at DESC",
        [status, user_id]
    );
    return notifications;
};

const getnotificationsByUser = async (user_id) => {
    const [notifications] = await db.query(
        "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC",
        [user_id]
    );
    return notifications;
};


module.exports = {
    createnotification,
    getnotifications,
    getnotificationsByStatus,
    getnotificationsByStatusAndUser,
    getnotificationsByUser

};