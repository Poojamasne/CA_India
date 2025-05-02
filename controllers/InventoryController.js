const db = require("../db");
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');


// Inventory Report
exports.getInventoryReport = async (req, res) => {
    try {
        const { user_id, book_id, business_id, start_date, end_date } = req.query;

        // Validate required parameters
        if (!user_id || !book_id || !business_id) {
            return res.status(400).json({
                success: false,
                message: "user_id, book_id, and business_id are required parameters"
            });
        }

        // Base query for inventory report
        let query = `
            SELECT 
                inv.InvoiceNo AS invoice_no,
                inv.invoice_date,
                inv.customer_or_supplier AS party,
                inv.gstin,
                ii.item_name,
                ii.hsn_code,
                ii.quantity_unit,
                ii.tax_rate,
                ii.taxable_amount,
                inv.igst,
                inv.cgst,
                inv.sgst,
                (ii.taxable_amount + inv.igst + inv.cgst + inv.sgst) AS total_amount
            FROM invoices inv
            JOIN invoice_items ii ON inv.id = ii.invoice_id
            WHERE inv.user_id = ? AND inv.book_id = ? AND inv.business_id = ?
        `;

        const params = [user_id, book_id, business_id];

        // Add date range filtering if provided
        if (start_date && end_date) {
            query += ` AND inv.invoice_date BETWEEN ? AND ?`;
            params.push(start_date, end_date);
        } else if (start_date) {
            query += ` AND inv.invoice_date >= ?`;
            params.push(start_date);
        } else if (end_date) {
            query += ` AND inv.invoice_date <= ?`;
            params.push(end_date);
        }

        // Execute query
        const [report] = await db.query(query, params);

        res.status(200).json({
            success: true,
            count: report.length,
            data: report
        });

    } catch (error) {
        console.error("Error in getInventoryReport:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

// Inventory Report (Item Wise)
exports.getItemWiseInventoryReport = async (req, res) => {
    try {
        const { user_id, book_id, business_id, start_date, end_date } = req.query;

        // Validate required parameters
        if (!user_id || !book_id || !business_id) {
            return res.status(400).json({
                success: false,
                message: "user_id, book_id, and business_id are required parameters"
            });
        }

        // Base query for item-wise inventory report
        let query = `
            SELECT 
                ii.item_name,
                inv.InvoiceNo AS invoice_no,
                inv.invoice_date,
                inv.customer_or_supplier AS party,
                inv.gstin,
                ii.hsn_code,
                ii.quantity_unit,
                ii.tax_rate,
                ii.taxable_amount,
                inv.igst,
                inv.cgst,
                inv.sgst,
                (ii.taxable_amount + inv.igst + inv.cgst + inv.sgst) AS total_amount
            FROM invoices inv
            JOIN invoice_items ii ON inv.id = ii.invoice_id
            WHERE inv.user_id = ? AND inv.book_id = ? AND inv.business_id = ?
        `;

        const params = [user_id, book_id, business_id];

        // Add date range filtering if provided
        if (start_date && end_date) {
            query += ` AND inv.invoice_date BETWEEN ? AND ?`;
            params.push(start_date, end_date);
        } else if (start_date) {
            query += ` AND inv.invoice_date >= ?`;
            params.push(start_date);
        } else if (end_date) {
            query += ` AND inv.invoice_date <= ?`;
            params.push(end_date);
        }

        // Group by item_name
        query += `
            ORDER BY ii.item_name, inv.invoice_date
        `;

        // Execute query
        const [report] = await db.query(query, params);

        // Group the results by item_name for better readability
        const groupedReport = report.reduce((acc, current) => {
            if (!acc[current.item_name]) {
                acc[current.item_name] = [];
            }
            acc[current.item_name].push(current);
            return acc;
        }, {});

        res.status(200).json({
            success: true,
            count: report.length,
            data: groupedReport
        });

    } catch (error) {
        console.error("Error in getItemWiseInventoryReport:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

// Inventory Report - Detailed Transactions (All Items)
exports.getDetailedInventoryReport = async (req, res) => {
    try {
        const { user_id, book_id, business_id, start_date, end_date } = req.query;

        // Validate required parameters
        if (!user_id || !book_id || !business_id) {
            return res.status(400).json({
                success: false,
                message: "user_id, book_id, and business_id are required parameters"
            });
        }

        // Base query for purchases
        let purchaseQuery = `
            SELECT 
                'PURCHASE' AS transaction_type,
                p.id AS transaction_id,
                p.purchase_date AS date,
                p.invoice_no AS invoice_no,
                p.party_name AS party,
                p.gstin,
                i.item_name AS item,
                i.hsn_code,
                p.quantity,
                i.gst_rate,
                p.taxable_amount,
                p.igst_amount,
                p.cgst_amount,
                p.sgst_amount,
                p.total_amount
            FROM purchases p
            JOIN items i ON p.item_id = i.id
            WHERE p.user_id = ? AND p.book_id = ? AND p.business_id = ?
        `;

        const purchaseParams = [user_id, book_id, business_id];

        // Base query for sales
        let saleQuery = `
            SELECT 
                'SALE' AS transaction_type,
                s.id AS transaction_id,
                s.invoice_date AS date,
                s.invoice_no AS invoice_no,
                s.customer_or_supplier AS party,
                s.gstin,
                i.item_name AS item,
                i.hsn_code,
                -s.quantity AS quantity,  # Negative for sales
                i.gst_rate,
                s.taxable_amount,
                s.igst_amount,
                s.cgst_amount,
                s.sgst_amount,
                s.total_amount
            FROM sales s
            JOIN items i ON s.item_id = i.id
            WHERE s.user_id = ? AND s.book_id = ? AND s.business_id = ?
        `;

        const saleParams = [user_id, book_id, business_id];

        // Add date range filtering if provided
        if (start_date && end_date) {
            purchaseQuery += ` AND p.purchase_date BETWEEN ? AND ?`;
            purchaseParams.push(start_date, end_date);
            
            saleQuery += ` AND s.invoice_date BETWEEN ? AND ?`;
            saleParams.push(start_date, end_date);
        } else if (start_date) {
            purchaseQuery += ` AND p.purchase_date >= ?`;
            purchaseParams.push(start_date);
            
            saleQuery += ` AND s.invoice_date >= ?`;
            saleParams.push(start_date);
        } else if (end_date) {
            purchaseQuery += ` AND p.purchase_date <= ?`;
            purchaseParams.push(end_date);
            
            saleQuery += ` AND s.invoice_date <= ?`;
            saleParams.push(end_date);
        }

        // Combine queries with UNION ALL
        const combinedQuery = `
            ${purchaseQuery}
            UNION ALL
            ${saleQuery}
            ORDER BY date
        `;

        const combinedParams = [...purchaseParams, ...saleParams];

        const [transactions] = await db.query(combinedQuery, combinedParams);

        // Get item list with stock information
        const [items] = await db.query(`
            SELECT 
                i.id AS item_id,
                i.item_name,
                i.hsn_code,
                i.gst_rate,
                i.opening_stock,
                COALESCE(SUM(p.quantity), 0) AS total_purchased,
                COALESCE(SUM(s.quantity), 0) AS total_sold,
                (i.opening_stock + COALESCE(SUM(p.quantity), 0) - COALESCE(SUM(s.quantity), 0)) AS closing_stock
            FROM items i
            LEFT JOIN purchases p ON i.id = p.item_id AND p.user_id = ? AND p.book_id = ? AND p.business_id = ?
            LEFT JOIN sales s ON i.id = s.item_id AND s.user_id = ? AND s.book_id = ? AND s.business_id = ?
            WHERE i.user_id = ? AND i.book_id = ?
            GROUP BY i.id
        `, [
            user_id, book_id, business_id,
            user_id, book_id, business_id,
            user_id, book_id
        ]);

        res.status(200).json({
            success: true,
            items,
            count: transactions.length,
            transactions
        });

    } catch (error) {
        console.error("Error in getDetailedInventoryReport:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

// Get invoices for a single item
exports.getSingleItemInvoices = async (req, res) => {
    try {
        const { user_id, item_id } = req.query;

        if (!user_id || !item_id) {
            return res.status(400).json({
                success: false,
                message: "user_id and item_id are required parameters"
            });
        }

        // First check if item exists
        const [item] = await db.query('SELECT id, item_name FROM items WHERE id = ? AND user_id = ?', [item_id, user_id]);
        
        if (item.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Item with ID ${item_id} not found for this user`
            });
        }

        // Then query for invoices
        const [report] = await db.query(`
            SELECT 
                inv.InvoiceNo AS invoice_no,
                inv.invoice_date,
                inv.customer_or_supplier AS party,
                inv.gstin,
                ii.item_name,
                ii.hsn_code,
                ii.quantity_unit,
                ii.tax_rate,
                ii.taxable_amount,
                inv.igst,
                inv.cgst,
                inv.sgst,
                (ii.taxable_amount + inv.igst + inv.cgst + inv.sgst) AS total_amount
            FROM invoices inv
            JOIN invoice_items ii ON inv.id = ii.invoice_id
            WHERE inv.user_id = ? AND ii.item_id = ?
            ORDER BY inv.invoice_date DESC
        `, [user_id, item_id]);

        return res.status(200).json({
            success: true,
            item: item[0],
            count: report.length,
            data: report
        });

    } catch (error) {
        console.error("Error in getSingleItemInvoices:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};