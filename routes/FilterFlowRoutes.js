const express = require('express');
const { filterEntryFlow } = require('../controllers/FilterFlowController');

const router = express.Router();

router.get('/filter-entry-flow', filterEntryFlow);

module.exports = router;