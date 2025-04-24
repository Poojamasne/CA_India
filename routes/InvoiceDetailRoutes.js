const express = require('express');
const router = express.Router();
const InvoiceDetailController = require('../controllers/InvoiceDetailController');
const verifyToken = require('../middleware/auth');

// Routes for the new invoice generation
router.post('/sales-new-invoice', verifyToken, InvoiceDetailController.newaddInvoice);
router.get('/sales-new-invoice', verifyToken, InvoiceDetailController.newgetInvoices);

router.post('/sales-return-new-invoice', verifyToken, InvoiceDetailController.newaddInvoice);
router.get('/sales-return-new-invoice', verifyToken, InvoiceDetailController.newgetInvoices);

router.post('/purchase-new-invoice', verifyToken, InvoiceDetailController.newaddInvoice);
router.get('/purchase-new-invoice', verifyToken, InvoiceDetailController.newgetInvoices);

router.post('/purchase-return-new-invoice', verifyToken, InvoiceDetailController.newaddInvoice);
router.get('/purchase-return-new-invoice', verifyToken, InvoiceDetailController.newgetInvoices);

router.get('/new-invoice/:id', verifyToken, InvoiceDetailController.newgetInvoiceById);

// Use a different base path than static files
router.get('/detail-invoice/:id',  InvoiceDetailController.downloadPDF);

module.exports = router;