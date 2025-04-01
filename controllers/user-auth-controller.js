const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');  
const { sendOTP, verifyOTP } = require('../utils/otp');
require('dotenv').config();

exports.signup = async (req, res) => {
    try {
        const { name, email, phone_number, password, confirmPassword } = req.body;

        if (!name || !email || !phone_number || !password || !confirmPassword) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ success: false, message: "Passwords do not match" });
        }

        const [existingUser] = await db.query('SELECT * FROM users WHERE phone_number = ?', [phone_number]);
        if (existingUser.length > 0) {
            return res.status(400).json({ success: false, message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.query(
            'INSERT INTO users (name, email, phone_number, password) VALUES (?, ?, ?, ?)',
            [name, email, phone_number, hashedPassword]
        );

        const userId = result.insertId;  // Get the newly inserted user's ID

        const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '365d' });

        res.status(201).json({ success: true, message: "User registered successfully", token , userId});
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};


exports.login = async (req, res) => {
    try {
        const { phone_number, password } = req.body;

        if (!phone_number || !password) {
            return res.status(400).json({ success: false, message: "Phone number and password are required" });
        }

        const [user] = await db.query('SELECT * FROM users WHERE phone_number = ?', [phone_number]);
        if (user.length === 0) {
            return res.status(400).json({ success: false, message: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user[0].password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Invalid password" });
        }

        const token = jwt.sign({ userId: user[0].id }, process.env.JWT_SECRET, { expiresIn: '365d' });

        res.json({ success: true, message: "Login successful", token, userId: user[0].id });

    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { phone_number } = req.body;
        if (!phone_number) return res.status(400).json({ success: false, message: "Phone number is required" });

        const [user] = await db.query('SELECT * FROM users WHERE phone_number = ?', [phone_number]);
        if (user.length === 0) return res.status(400).json({ success: false, message: "User not found" });

        const sessionId = await sendOTP(phone_number);
        if (!sessionId) return res.status(500).json({ success: false, message: "Failed to send OTP" });

        res.json({ success: true, message: "OTP sent successfully", sessionId });

    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

exports.verifyOTP = async (req, res) => {
    try {
        const { sessionId, otp } = req.body;
        if (!sessionId || !otp) return res.status(400).json({ success: false, message: "Session ID and OTP are required" });

        const isValid = await verifyOTP(sessionId, otp);
        if (!isValid) return res.status(400).json({ success: false, message: "Invalid OTP" });

        res.json({ success: true, message: "OTP verified successfully" });

    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { phone_number, newPassword, confirmPassword } = req.body;

        if (!phone_number || !newPassword || !confirmPassword) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, message: "Passwords do not match" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await db.query('UPDATE users SET password = ? WHERE phone_number = ?', [hashedPassword, phone_number]);

        res.json({ success: true, message: "Password reset successful" });

    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};
