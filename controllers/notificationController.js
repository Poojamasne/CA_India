const notification = require('../models/notificationModel');

let io; // To store socket instance

const setSocket = (socketIo) => {
    io = socketIo;
};

const sendnotification = async (req, res) => {
    const { message, userId } = req.body; // Add userId to request body
    if (!message || !userId) {
        return res.status(400).json({ 
            success: false, 
            message: "Message and userId are required" 
        });
    }

    try {
        // Pass userId to the createnotification function
        const id = await notification.createnotification(message, userId);
        const newNotification = { 
            id, 
            message, 
            userId, // Include userId in the notification object
            timestamp: new Date() 
        };

        // Send the notification to all connected clients
        if (io) {
            io.emit('newnotification', newNotification);
        }

        res.status(201).json({ 
            success: true, 
            message: "Notification sent", 
            notification: newNotification 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: "Failed to send notification", 
            error: error.message 
        });
    }
};

const getnotifications = async (req, res) => {
    const { status } = req.query; // Get status from query parameters

    try {
        let notifications;

        if (!status || status.toLowerCase() === "all") {
            // Fetch all notifications if no specific status is provided
            notifications = await notification.getnotifications();
        } else {
            // Fetch notifications based on status (Request, Update)
            notifications = await notification.getnotificationsByStatus(status);
        }

        res.status(200).json({
            success: true,
            notifications
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch notifications",
            error: error.message
        });
    }
};


module.exports = { sendnotification, getnotifications, setSocket };