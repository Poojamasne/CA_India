const express = require('express');
const router = express.Router();
const headAccountController = require('../controllers/headAccountController');
const verifyToken = require('../middleware/auth');

// API Endpoints
router.post('/head-account', verifyToken, headAccountController.addHeadAccount);
router.get('/head-account', verifyToken, headAccountController.getHeadAccounts);

router.get('/:bookId/details', verifyToken, headAccountController.getBookWithHeadAccount);


module.exports = router;

