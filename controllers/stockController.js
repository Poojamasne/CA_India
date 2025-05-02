const db = require('../db'); // Assuming this exports the mysql2 promise pool

// Get Stock Register
exports.getStockRegister = async (req, res) => {
  try {
    const query = `
      SELECT
        it.id AS item_id,
        it.item_name,
        it.quantity_measurement,
        it.opening_stock,
        it.opening_stock_date,

        COALESCE(SUM(CASE WHEN i.type = 'purchase-invoice' THEN ii.quantity ELSE 0 END), 0) AS purchase_qty,
        COALESCE(SUM(CASE WHEN i.type = 'purchase-return-invoice' THEN ii.quantity ELSE 0 END), 0) AS purchase_return_qty,
        COALESCE(SUM(CASE WHEN i.type = 'sales-invoice' THEN ii.quantity ELSE 0 END), 0) AS sales_qty,
        COALESCE(SUM(CASE WHEN i.type = 'sales-return-invoice' THEN ii.quantity ELSE 0 END), 0) AS sales_return_qty,

        (
          it.opening_stock +
          COALESCE(SUM(CASE WHEN i.type = 'purchase-invoice' THEN ii.quantity ELSE 0 END), 0) -
          COALESCE(SUM(CASE WHEN i.type = 'purchase-return-invoice' THEN ii.quantity ELSE 0 END), 0) -
          COALESCE(SUM(CASE WHEN i.type = 'sales-invoice' THEN ii.quantity ELSE 0 END), 0) +
          COALESCE(SUM(CASE WHEN i.type = 'sales-return-invoice' THEN ii.quantity ELSE 0 END), 0)
        ) AS closing_stock

      FROM items it
      LEFT JOIN invoice_items ii ON ii.item_id = it.id
      LEFT JOIN invoices i ON i.id = ii.invoice_id
      GROUP BY it.id;
    `;

    // Execute query using promise
    const [rows] = await db.query(query);

    return res.status(200).json({
      message: 'Stock register fetched successfully',
      data: rows
    });

  } catch (err) {
    console.error('Stock register error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Combined Inventory Report API
exports.getCombinedInventoryReport = async (req, res) => {
  try {
    const query = `
      SELECT
        it.id AS item_id,
        it.item_name,
        it.quantity_measurement,
        it.opening_stock,
        it.opening_stock_date,

        COALESCE(SUM(CASE WHEN i.type = 'purchase-invoice' THEN ii.quantity ELSE 0 END), 0) AS purchase_qty,
        COALESCE(SUM(CASE WHEN i.type = 'purchase-return-invoice' THEN ii.quantity ELSE 0 END), 0) AS purchase_return_qty,
        COALESCE(SUM(CASE WHEN i.type = 'sales-invoice' THEN ii.quantity ELSE 0 END), 0) AS sales_qty,
        COALESCE(SUM(CASE WHEN i.type = 'sales-return-invoice' THEN ii.quantity ELSE 0 END), 0) AS sales_return_qty,

        (
          it.opening_stock +
          COALESCE(SUM(CASE WHEN i.type = 'purchase-invoice' THEN ii.quantity ELSE 0 END), 0) -
          COALESCE(SUM(CASE WHEN i.type = 'purchase-return-invoice' THEN ii.quantity ELSE 0 END), 0) -
          COALESCE(SUM(CASE WHEN i.type = 'sales-invoice' THEN ii.quantity ELSE 0 END), 0) +
          COALESCE(SUM(CASE WHEN i.type = 'sales-return-invoice' THEN ii.quantity ELSE 0 END), 0)
        ) AS closing_stock

      FROM items it
      LEFT JOIN invoice_items ii ON ii.item_id = it.id
      LEFT JOIN invoices i ON i.id = ii.invoice_id
      GROUP BY it.id;
    `;

    const [rows] = await db.query(query);

    // Fixed rate for now (you can replace this with real FIFO logic)
    const rate = 2500101;

    const report = {
      opening_stock: [],
      inward_register: [],
      outward_register: [],
      closing_stock: []
    };

    let openingTotal = 0;
    let inwardTotal = 0;
    let outwardTotal = 0;
    let closingTotal = 0;

    rows.forEach((item, index) => {
      const sn = index + 1;
      const hsn = '25010101'; // static HSN (or fetch from DB if available)

      const openingQty = item.opening_stock;
      const inwardQty = item.purchase_qty - item.purchase_return_qty;
      const outwardQty = item.sales_qty - item.sales_return_qty;
      const closingQty = openingQty + inwardQty - outwardQty;

      // Accumulate totals
      openingTotal += rate;
      inwardTotal += rate;
      outwardTotal += rate;
      closingTotal += rate;

      report.opening_stock.push({
        sn, item: item.item_name, hsn, quantity: openingQty, rate, taxable_value: rate
      });

      report.inward_register.push({
        sn, item: item.item_name, hsn, quantity: inwardQty, rate, taxable_value: rate
      });

      report.outward_register.push({
        sn, item: item.item_name, hsn, quantity: outwardQty, rate, taxable_value: rate
      });

      report.closing_stock.push({
        sn, item: item.item_name, hsn, quantity: closingQty, rate, taxable_value: rate
      });
    });

    // Add total rows
    report.opening_stock.push({ total: openingTotal });
    report.inward_register.push({ total: inwardTotal });
    report.outward_register.push({ total: outwardTotal });
    report.closing_stock.push({ total: closingTotal });

    return res.status(200).json({
      message: 'Combined inventory report generated successfully',
      data: report
    });

  } catch (err) {
    console.error('Error generating combined inventory report:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};
