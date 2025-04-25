const express = require('express');
const router = express.Router();
const InventoryController = require('../controllers/InventoryController');
const verifyToken = require('../middleware/auth'); // Ensure the path is correct
const roleMiddleware = require('../middlewares/roleMiddleware');


router.get('/inventory/report', verifyToken,roleMiddleware(['admin', 'accountant']), InventoryController.generateInventoryReport);


module.exports = router;


