const db = require("../db");

// Inventory Report - All Items
exports.getAllItemsInventoryReport = async (req, res) => {
    try {
        const { user_id, book_id, business_id, start_date, end_date } = req.query;

        // Validate required parameters
        if (!user_id || !book_id || !business_id) {
            return res.status(400).json({
                success: false,
                message: "user_id, book_id, and business_id are required parameters"
            });
        }

        // Base query for items
        let itemQuery = `
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
        `;

        const queryParams = [
            user_id, book_id, business_id,
            user_id, book_id, business_id,
            user_id, book_id
        ];

        // Add date range filtering if provided
        if (start_date && end_date) {
            itemQuery += ` AND (p.purchase_date BETWEEN ? AND ? OR s.invoice_date BETWEEN ? AND ?)`;
            queryParams.push(start_date, end_date, start_date, end_date);
        } else if (start_date) {
            itemQuery += ` AND (p.purchase_date >= ? OR s.invoice_date >= ?)`;
            queryParams.push(start_date, start_date);
        } else if (end_date) {
            itemQuery += ` AND (p.purchase_date <= ? OR s.invoice_date <= ?)`;
            queryParams.push(end_date, end_date);
        }

        itemQuery += ` GROUP BY i.id`;

        const [items] = await db.query(itemQuery, queryParams);

        res.status(200).json({
            success: true,
            count: items.length,
            data: items
        });

    } catch (error) {
        console.error("Error in getAllItemsInventoryReport:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

// Inventory Report - Item Wise Detailed Transactions
exports.getItemWiseInventoryReport = async (req, res) => {
    try {
        const { user_id, book_id, business_id, item_id, start_date, end_date } = req.query;

        // Validate required parameters
        if (!user_id || !book_id || !business_id || !item_id) {
            return res.status(400).json({
                success: false,
                message: "user_id, book_id, business_id, and item_id are required parameters"
            });
        }

        // Get item details
        const [item] = await db.query(`
            SELECT id, item_name, hsn_code, gst_rate 
            FROM items 
            WHERE id = ? AND user_id = ? AND book_id = ?
        `, [item_id, user_id, book_id]);

        if (item.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Item not found"
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
            WHERE p.user_id = ? AND p.book_id = ? AND p.business_id = ? AND p.item_id = ?
        `;

        const purchaseParams = [user_id, book_id, business_id, item_id];

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
            WHERE s.user_id = ? AND s.book_id = ? AND s.business_id = ? AND s.item_id = ?
        `;

        const saleParams = [user_id, book_id, business_id, item_id];

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

        // Calculate opening and closing stock
        const [stockInfo] = await db.query(`
            SELECT 
                i.opening_stock,
                COALESCE(SUM(CASE WHEN p.id IS NOT NULL THEN p.quantity ELSE 0 END), 0) AS total_purchased,
                COALESCE(SUM(CASE WHEN s.id IS NOT NULL THEN s.quantity ELSE 0 END), 0) AS total_sold,
                (i.opening_stock + 
                 COALESCE(SUM(CASE WHEN p.id IS NOT NULL THEN p.quantity ELSE 0 END), 0) - 
                 COALESCE(SUM(CASE WHEN s.id IS NOT NULL THEN s.quantity ELSE 0 END), 0) AS closing_stock
            FROM items i
            LEFT JOIN purchases p ON i.id = p.item_id AND p.user_id = ? AND p.book_id = ? AND p.business_id = ?
            LEFT JOIN sales s ON i.id = s.item_id AND s.user_id = ? AND s.book_id = ? AND s.business_id = ?
            WHERE i.id = ? AND i.user_id = ? AND i.book_id = ?
            GROUP BY i.id
        `, [
            user_id, book_id, business_id,
            user_id, book_id, business_id,
            item_id, user_id, book_id
        ]);

        res.status(200).json({
            success: true,
            item: item[0],
            opening_stock: stockInfo.length > 0 ? stockInfo[0].opening_stock : 0,
            closing_stock: stockInfo.length > 0 ? stockInfo[0].closing_stock : 0,
            count: transactions.length,
            transactions
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