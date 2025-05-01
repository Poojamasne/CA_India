const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/InventoryController');

// Inventory Report - All Items Summary
router.get('/all-items', inventoryController.getAllItemsInventoryReport);

// Inventory Report - Item Wise Detailed Transactions
router.get('/item-wise', inventoryController.getItemWiseInventoryReport);

// Inventory Report - Detailed Transactions (All Items)
router.get('/detailed', inventoryController.getDetailedInventoryReport);

module.exports = router;