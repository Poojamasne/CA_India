const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');

router.get('/stock-register', stockController.getStockRegister);

// GET: Combined Inventory Report
router.get('/combined-inventory-report', stockController.getCombinedInventoryReport);

module.exports = router;
