const express = require("express");
const router = express.Router();
const categoryBookController = require("../controllers/categoryBookController"); // New import
const verifyToken = require('../middleware/auth'); // Ensure the path is correct


// Route to get categories linked to a book
router.get("/books/:book_id/categories", verifyToken, categoryBookController.getCategoriesByBook);


// 2️⃣ Add a new category group
router.post("/category/group", verifyToken, categoryBookController.addCategoryGroup);

// // 3️⃣ Get all categories of a group in a specific book
// router.get("/books/:book_id/categories-group", verifyToken, categoryBookController.getCategoriesByGroup);


// Link Categories to a Book
router.post("/books/link-category", verifyToken, categoryBookController.linkCategoryToBook);

// Link Category Groups to a Book
router.post("/books/link-category-group", verifyToken, categoryBookController.linkCategoryGroupToBook);

// Get Categories by Group for a Book
router.get("/:book_id/categories-group", verifyToken, categoryBookController.getCategoriesByGroup);



module.exports = router;
