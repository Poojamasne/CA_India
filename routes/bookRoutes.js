const express = require("express");
const router = express.Router();
const bookController = require("../controllers/bookController");
const verifyToken = require('../middleware/auth'); // Ensure the path is correct


// Routes
// router.post("/books", bookController.addBook);                 // Add book
// router.get("/books", bookController.getBooks);                // Get all books
// router.put("/books/:book_id", bookController.renameBook);     // Rename book
// router.post("/books/members", bookController.addMember);      // Add member to book
// router.delete("/books/:book_id", bookController.deleteBook);  // Delete book


// Add a new book
// router.post('/books', verifyToken, bookController.addBook);

router.post('/books', verifyToken, bookController.addnewBook);

// Get all books
router.get('/books', verifyToken, bookController.getBooks);

//Get a single book by book_id and user_id
router.get('/books/:book_id/:user_id', bookController.getBookById);

// Rename a book
router.put('/books/:book_id', verifyToken, bookController.renameBook);

// Add a member to a book
router.post('/books/members', verifyToken, bookController.addMember);


// GET API to fetch all members by book_id
router.get('/members/:book_id', verifyToken, bookController.getAllMembersByBookId);

router.delete('/members/:member_id', verifyToken, bookController.deleteMemberbyID);

router.delete('/books/:book_id/members/:member_name',verifyToken, bookController.deleteMember);


// Delete a book
router.delete('/books/:book_id', verifyToken, bookController.deleteBook);

router.get("/user/:user_id", verifyToken, bookController.getAllBooksByUserId);

// GET all books by user_id and business_id (passed as query)
router.get('/books/:user_id', bookController.getAllBooksByUserAndBusinessId);


router.post("/books/:book_id/add-grade", verifyToken, bookController.addGradeToBook);

router.post('/books/head-account/link', verifyToken, bookController.linkHeadAccountToBook);


module.exports = router;
