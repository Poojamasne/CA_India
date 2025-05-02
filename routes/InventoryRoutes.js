const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const inventoryController = require('../controllers/InventoryController'); // Import the controller

// Inventory Report - All Items Summary
router.get('/all-items', inventoryController.getInventoryReport);

// Inventory Report - Item Wise Detailed Transactions
router.get('/item-wise', inventoryController.getItemWiseInventoryReport);

// Inventory Report - Detailed Transactions (All Items)
router.get('/detailed', inventoryController.getDetailedInventoryReport);

router.get('/inventory/single-item-invoices', inventoryController.getSingleItemInvoices);

module.exports = router;