const express = require("express");
const router = express.Router();
const InvoiceController = require("../controllers/InvoiceController");
const verifyToken = require('../middleware/auth');

// ✅ Routes for Sales Invoice
router.post("/sales-invoice", verifyToken, InvoiceController.addInvoice);
router.get("/sales-invoice", verifyToken, InvoiceController.getInvoices);

// ✅ Routes for Sales Return Invoice
router.post("/sales-return-invoice", verifyToken, InvoiceController.addInvoice);
router.get("/sales-return-invoice", verifyToken, InvoiceController.getInvoices);

// ✅ Routes for Purchase Invoice
router.post("/purchase-invoice", verifyToken, InvoiceController.addInvoice);
router.get("/purchase-invoice", verifyToken, InvoiceController.getInvoices);

// ✅ Routes for Purchase Return Invoice
router.post("/purchase-return-invoice", verifyToken, InvoiceController.addInvoice);
router.get("/purchase-return-invoice", verifyToken, InvoiceController.getInvoices);

// ✅ Get Invoice by ID (with items)
router.get("/invoice/:id", verifyToken, InvoiceController.getInvoiceById);

// ✅ Download Invoice PDF
router.get("/download/invoice/:id", verifyToken, InvoiceController.downloadPDF);

module.exports = router;