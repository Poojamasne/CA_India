const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const verifyToken = require('../middleware/auth');

// POST /api/customer-fields
router.post('/customer-fields', verifyToken, customerController.addCustomerField);

// GET /api/customer-fields
router.get('/allcustomer-fields', verifyToken, customerController.getAllCustomerFields);

// GET /api/customer-fields/book/:book_id/user/:user_id
router.get('/book/:book_id/user/:user_id', verifyToken, customerController.getFieldsByBookAndUser);

router.get('/book/:book_id', customerController.getFieldsByBookId);

module.exports = router;