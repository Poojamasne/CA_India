const express = require("express");
const router = express.Router();
const bookController = require("../controllers/bookController");
const referencerController = require('../controllers/Referencer');
const verifyToken = require('../middleware/auth'); // Ensure the path is correct


// Routes
// router.post("/books", bookController.addBook);                 // Add book
// router.get("/books", bookController.getBooks);                // Get all books
// router.put("/books/:book_id", bookController.renameBook);     // Rename book
// router.post("/books/members", bookController.addMember);      // Add member to book
// router.delete("/books/:book_id", bookController.deleteBook);  // Delete book


// Add a new book
router.post('/books', verifyToken, bookController.addBook);

// Get all books
router.get('/books', verifyToken, bookController.getBooks);

// Rename a book
router.put('/books/:book_id', verifyToken, bookController.renameBook);

// Add a member to a book
router.post('/books/members', verifyToken, bookController.addMember);

// Delete a book
router.delete('/books/:book_id', verifyToken, bookController.deleteBook);

// Add a referencer to a book
router.post('/books/:book_id/referencer', verifyToken, referencerController.addReferencer);

// Get referencer for a book
router.get('/books/:book_id/referencer', verifyToken, referencerController.getReferencer);

module.exports = router;
