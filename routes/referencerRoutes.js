const express = require('express');
const router = express.Router();
const referencerController = require('../controllers/referencerController');
const verifyToken = require('../middleware/auth');

// Routes
router.post('/books/:book_id/referencer', verifyToken, referencerController.addReferencer);
router.get('/:book_id/referencer', verifyToken, referencerController.getReferencer);

module.exports = router; // ✅ Export the actual router
