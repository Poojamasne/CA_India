const express = require('express');
const router = express.Router();
const PartyBookController = require("../controllers/PartyBookController");
const verifyToken = require('../middleware/auth');

// POST API to link a party to a book
router.post('/link', verifyToken, PartyBookController.linkPartyToBook);


// GET API to fetch parties associated with a specific book
router.get('/parties/:bookId', verifyToken, PartyBookController.getPartyByBook);

module.exports = router;