const express = require('express');
const { filterEntryFlow, downloadFilteredPdf } = require('../controllers/FilterFlowController');

const router = express.Router();

router.get('/filter-entry-flow', filterEntryFlow);

// PDF download endpoint
router.get('/download/:filterId', downloadFilteredPdf);

module.exports = router;