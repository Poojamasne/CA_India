const express = require('express');
const { filterEntryFlow, downloadFilteredPdf, downloadFilteredExcel } = require('../controllers/FilterFlowController');

const router = express.Router();

router.get('/filter-entry-flow', filterEntryFlow);

// PDF download endpoint
router.get('/download/:filterId', downloadFilteredPdf);

router.get('/download-excel/:filterId', downloadFilteredExcel);

module.exports = router;