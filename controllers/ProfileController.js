const db = require("../db");
const bcrypt = require('bcryptjs');

// 📌 Create a Profile (with user_id)
exports.createProfile = async (req, res) => {
    try {
        const { full_name, mobile_number, email, user_id } = req.body;
        const image_url = req.file ? "http://localhost:3000/uploads/" + req.file.filename : null;

        // Validate required fields including user_id
        if (!full_name || !mobile_number || !email || !user_id) {
            return res.status(400).json({ 
                message: "All fields are required",
                missing_fields: {
                    full_name: !full_name,
                    mobile_number: !mobile_number,
                    email: !email,
                    user_id: !user_id
                }
            });
        }

        // Check if user already has a profile
        const [existing] = await db.query(
            "SELECT id FROM profiles WHERE user_id = ?",
            [user_id]
        );

        if (existing.length > 0) {
            return res.status(400).json({ 
                message: "User already has a profile",
                code: "PROFILE_EXISTS"
            });
        }

        const [result] = await db.query(
            "INSERT INTO profiles (full_name, mobile_number, email, image_url, user_id) VALUES (?, ?, ?, ?, ?)",
            [full_name, mobile_number, email, image_url, user_id]
        );

        res.status(201).json({ 
            success: true, 
            message: "Profile created successfully", 
            profile_id: result.insertId,
            user_id: user_id
        });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ 
            message: "Server error", 
            error: error.message,
            code: "PROFILE_CREATION_FAILED"
        });
    }
};

// 📌 Get All Profiles (filtered by user_id)
exports.getProfiles = async (req, res) => {
    try {
        const { user_id } = req.query;

        if (!user_id) {
            return res.status(400).json({ 
                message: "user_id is required",
                code: "USER_ID_REQUIRED"
            });
        }

        const [profiles] = await db.query(
            "SELECT * FROM profiles WHERE user_id = ?",
            [user_id]
        );

        res.status(200).json({
            profiles,
            count: profiles.length,
            user_id: user_id
        });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ 
            message: "Server error", 
            error: error.message,
            code: "PROFILE_FETCH_FAILED"
        });
    }
};

// 📌 Get Profile By ID (with user verification)
exports.getProfileById = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.query;

        if (!user_id) {
            return res.status(400).json({ 
                message: "user_id is required",
                code: "USER_ID_REQUIRED"
            });
        }

        const [profile] = await db.query(
            "SELECT * FROM profiles WHERE id = ? AND user_id = ?",
            [id, user_id]
        );

        if (profile.length === 0) {
            return res.status(404).json({ 
                message: "Profile not found or not owned by user",
                code: "PROFILE_NOT_FOUND"
            });
        }

        res.status(200).json({
            ...profile[0],
            user_id: user_id
        });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ 
            message: "Server error", 
            error: error.message,
            code: "PROFILE_FETCH_FAILED"
        });
    }
};

// 📌 Update a Profile (with user verification)
exports.updateProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const { full_name, mobile_number, email, user_id } = req.body;
        const image_url = req.file ? "http://localhost:3000/uploads/" + req.file.filename : null;

        // Validate required fields including user_id
        if (!full_name || !mobile_number || !email || !user_id) {
            return res.status(400).json({ 
                message: "All fields are required",
                missing_fields: {
                    full_name: !full_name,
                    mobile_number: !mobile_number,
                    email: !email,
                    user_id: !user_id
                }
            });
        }

        // Verify profile belongs to user
        const [verify] = await db.query(
            "SELECT id FROM profiles WHERE id = ? AND user_id = ?",
            [id, user_id]
        );

        if (verify.length === 0) {
            return res.status(403).json({ 
                message: "Profile not found or not owned by user",
                code: "UNAUTHORIZED_ACCESS"
            });
        }

        const [result] = await db.query(
            "UPDATE profiles SET full_name = ?, mobile_number = ?, email = ?, image_url = ? WHERE id = ? AND user_id = ?",
            [full_name, mobile_number, email, image_url, id, user_id]
        );

        res.status(200).json({ 
            success: true, 
            message: "Profile updated successfully",
            profile_id: id,
            user_id: user_id
        });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ 
            message: "Server error", 
            error: error.message,
            code: "PROFILE_UPDATE_FAILED"
        });
    }
};

// 📌 Delete a Profile (with user verification)
exports.deleteProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.body;

        if (!user_id) {
            return res.status(400).json({ 
                message: "user_id is required",
                code: "USER_ID_REQUIRED"
            });
        }

        // Verify profile belongs to user
        const [verify] = await db.query(
            "SELECT id FROM profiles WHERE id = ? AND user_id = ?",
            [id, user_id]
        );

        if (verify.length === 0) {
            return res.status(403).json({ 
                message: "Profile not found or not owned by user",
                code: "UNAUTHORIZED_ACCESS"
            });
        }

        const [result] = await db.query(
            "DELETE FROM profiles WHERE id = ? AND user_id = ?",
            [id, user_id]
        );

        res.status(200).json({ 
            message: "Profile deleted successfully",
            profile_id: id,
            user_id: user_id
        });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ 
            message: "Server error", 
            error: error.message,
            code: "PROFILE_DELETE_FAILED"
        });
    }
};