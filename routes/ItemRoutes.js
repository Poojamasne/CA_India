const express = require("express");
const router = express.Router();
const ItemController = require("../controllers/ItemController");
const verifyToken = require('../middleware/auth');

// Routes
router.post("/items/add", verifyToken, ItemController.addItem); // Add new item
router.get("/items", verifyToken, ItemController.getItems); // Get all items
router.get("/items/:id", verifyToken, ItemController.getItemById); // Get item by ID
router.delete("/items/:id", verifyToken, ItemController.deleteItem); // Delete item

router.get('/user', verifyToken, ItemController.getItemsByUserAndBook);
module.exports = router;
