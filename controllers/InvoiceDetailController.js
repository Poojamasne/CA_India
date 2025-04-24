const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const db = require("../db");

// Ensure PDFs directory exists
const pdfsDir = path.join(__dirname, '..', 'pdfs');
if (!fs.existsSync(pdfsDir)) {
  fs.mkdirSync(pdfsDir, { recursive: true });
}

// Download PDF
exports.downloadPDF = async (req, res) => {
  const { id } = req.params;
  const filePath = path.join(pdfsDir, `detail-invoice_${id}.pdf`);

  if (fs.existsSync(filePath)) {
      res.download(filePath, (err) => {
          if (err) {
              console.error('Error downloading file:', err);
              res.status(500).send('Error downloading file');
          }
      });
  } else {
      res.status(404).send('File not found');
  }
};

const generateInvoicePDF = async (invoiceData, res) => {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  
  // Set response headers for PDF download
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=invoice.pdf');
  doc.pipe(res);

  // Set default font and color
  doc.font('Helvetica-Bold').fillColor('black');

  // Add header
  doc.fontSize(14).text('INVOICE FORMAT - IF INVENTORY ENABLED', 50, 50, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(16).text('SALES / PURCHASE INVOICE', { align: 'center' });
  doc.moveDown(0.5);

  // Add company details
  doc.fontSize(12).text(invoiceData.companyName || 'AMBITICAR AND ASSOCIATES', { align: 'center' });
  doc.fontSize(10).text(invoiceData.companyAddress || '201, 2ND FLOOR, JALGAON - 425001', { align: 'center' });
  doc.moveDown(1);

  // Add bill to section without background color
  doc.fontSize(10).text('BILL TO', 60, 160);
  doc.font('Helvetica');
  doc.fillColor('black'); // Ensure text is black
  doc.text(invoiceData.customerName || 'NEXURA INFRA PRIVATE LIMITED', 60, 175);
  doc.text(invoiceData.customerAddress || 'JALGAON', 60, 190);
  doc.text(`GST REGISTRATION NUMBER - ${invoiceData.gstNumber || '27AAAA0000A12A'}`, 60, 205);
  doc.text(`MOBILE NO - ${invoiceData.mobileNo || '99999999'}`, 60, 220);

  // Add invoice details on right side
  doc.font('Helvetica-Bold');
  doc.fillColor('black'); // Ensure text is black
  doc.text(`INVOICE NO - ${invoiceData.invoiceNo || 'YYMMDD01'}`, 350, 160);
  doc.text(`DATE - ${invoiceData.date || 'DD-MM-YYYY'}`, 350, 175);
  doc.text('DUE DATE (NOT TO BE PRINTED ON INVOICE)', 350, 190);
  doc.moveDown(3);

  // Items table header with blue background
  const headers = ['ITEM', 'HSN CODE', 'QUANTITY', 'RATE', 'TAX RATE', 'Taxable', 'IGST', 'CGST', 'SGST', 'TOTAL'];
  const columnPositions = [50, 130, 210, 270, 320, 370, 420, 470, 520, 570];
  
  doc.rect(50, 250, 500, 20).fill('#1a5276').stroke();
  doc.fontSize(8).fillColor('white');
  headers.forEach((header, index) => {
    const width = index === 0 ? 80 : 50;
    doc.text(header, columnPositions[index], 255, { width, align: 'center' });
  });

  // Add items with alternating row colors
  let yPos = 270;
  doc.font('Helvetica').fillColor('black');
  (invoiceData.items || []).forEach((item, index) => {
    // Alternate row colors
    if (index % 2 === 0) {
      doc.rect(50, yPos, 500, 20).fill('#f8f9fa').stroke();
    }
    
    doc.fontSize(8);
    doc.text(item.description || '', columnPositions[0], yPos + 5, { width: 80 });
    doc.text(item.hsnCode || '', columnPositions[1], yPos + 5, { width: 80, align: 'center' });
    doc.text(item.quantity || '', columnPositions[2], yPos + 5, { width: 60, align: 'center' });
    doc.text(item.rate || '', columnPositions[3], yPos + 5, { width: 50, align: 'center' });
    doc.text(`${item.taxRate || ''}%`, columnPositions[4], yPos + 5, { width: 50, align: 'center' });
    doc.text(item.taxableAmount || '', columnPositions[5], yPos + 5, { width: 50, align: 'center' });
    doc.text(item.igst || '', columnPositions[6], yPos + 5, { width: 50, align: 'center' });
    doc.text(item.cgst || '', columnPositions[7], yPos + 5, { width: 50, align: 'center' });
    doc.text(item.sgst || '', columnPositions[8], yPos + 5, { width: 50, align: 'center' });
    doc.text(item.total || '', columnPositions[9], yPos + 5, { width: 50, align: 'center' });
    
    yPos += 20;
  });

  // Totals row with light blue background
  doc.rect(50, yPos, 500, 20).fill('#d4e6f1').stroke();
  doc.font('Helvetica-Bold').fontSize(10).fillColor('black');
  doc.text('TOTAL', columnPositions[0], yPos + 5);
  doc.text(invoiceData.totals?.taxable || '2059700.00', columnPositions[5], yPos + 5, { width: 50, align: 'center' });
  doc.text(invoiceData.totals?.igst || '0.00', columnPositions[6], yPos + 5, { width: 50, align: 'center' });
  doc.text(invoiceData.totals?.cgst || '121238.00', columnPositions[7], yPos + 5, { width: 50, align: 'center' });
  doc.text(invoiceData.totals?.sgst || '121238.00', columnPositions[8], yPos + 5, { width: 50, align: 'center' });
  doc.text(invoiceData.totals?.grandTotal || '2302176.00', columnPositions[9], yPos + 5, { width: 50, align: 'center' });
  
  yPos += 30;

  // Summary section
  doc.rect(300, yPos, 250, 150).stroke();
  doc.font('Helvetica-Bold').fontSize(10).fillColor('black').text('SUMMARY', 300, yPos + 10, { align: 'center' });
  
  // Summary table headers
  const summaryHeaders = ['TAX RATE', 'Taxable', 'IGST', 'CGST', 'SGST', 'TOTAL'];
  const summaryPositions = [300, 350, 390, 430, 470, 510];
  
  doc.fontSize(8).fillColor('black');
  summaryHeaders.forEach((header, index) => {
    doc.text(header, summaryPositions[index], yPos + 30, { width: index === 0 ? 50 : 40, align: 'center' });
  });
  
  // Summary table data
  const summaryData = invoiceData.summary || [
    { rate: '0.00%', taxable: '750000.00', igst: '0.00', cgst: '0.00', sgst: '0.00', total: '750000.00' },
    { rate: '5.00%', taxable: '257000.00', igst: '0.00', cgst: '6425.00', sgst: '6425.00', total: '269850.00' },
    { rate: '12.00%', taxable: '0.00', igst: '0.00', cgst: '0.00', sgst: '0.00', total: '0.00' },
    { rate: '18.00%', taxable: '651300.00', igst: '0.00', cgst: '58617.00', sgst: '58617.00', total: '768534.00' },
    { rate: '28.00%', taxable: '401400.00', igst: '0.00', cgst: '56196.00', sgst: '56196.00', total: '513792.00' },
    { rate: '3.00%', taxable: '0.00', igst: '0.00', cgst: '0.00', sgst: '0.00', total: '0.00' },
    { rate: 'TOTAL', taxable: '2059700.00', igst: '0.00', cgst: '121238.00', sgst: '121238.00', total: '2302176.00' }
  ];

  doc.font('Helvetica').fillColor('black');
  summaryData.forEach((row, i) => {
    const rowY = yPos + 50 + (i * 15);
    doc.fontSize(8).text(row.rate, summaryPositions[0], rowY, { width: 50, align: 'center' });
    doc.text(row.taxable, summaryPositions[1], rowY, { width: 40, align: 'center' });
    doc.text(row.igst, summaryPositions[2], rowY, { width: 40, align: 'center' });
    doc.text(row.cgst, summaryPositions[3], rowY, { width: 40, align: 'center' });
    doc.text(row.sgst, summaryPositions[4], rowY, { width: 40, align: 'center' });
    doc.text(row.total, summaryPositions[5], rowY, { width: 40, align: 'center' });
  });

  // Move yPos to below the summary table
  yPos += 200;

  // For AMBITICAR AND ASSOCIATES
  doc.font('Helvetica-Bold').fontSize(10).fillColor('black').text(`For ${invoiceData.companyName || 'AMBITICAR AND ASSOCIATES'}`, 50, yPos);

  // Footer with signature
  doc.moveDown(0.5);
  doc.text('Authorised Signatory', 50, doc.y);

  doc.end();
};

// Example usage in a controller:
exports.generateInvoice = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const invoiceData = {
      companyName: req.body.companyName,
      companyAddress: req.body.companyAddress,
      customerName: req.body.customerName,
      customerAddress: req.body.customerAddress,
      gstNumber: req.body.gstNumber,
      mobileNo: req.body.mobileNo,
      invoiceNo: req.body.invoiceNo,
      date: req.body.date,
      items: req.body.items,
      totals: req.body.totals,
      summary: req.body.summary,
      bankDetails: req.body.bankDetails
   };
    
    await generateInvoicePDF(invoiceData, res);
    await connection.commit();

    res.status(201).json({
      message: "Invoice created successfully",
      downloadLink: `/download/detail-invoice/${invoiceData.invoiceNo}`,
      invoiceNo: invoiceData.invoiceNo
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error generating PDF:', error);
    res.status(500).send('Error generating PDF');
  } finally {
    connection.release();
  }
};

exports.newaddInvoice = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { 
      type, 
      customer_or_supplier, 
      invoice_date, 
      discount_amount = 0.00, 
      percentage = "0%", 
      round_off = 0.00, 
      items, // This will be an array of items
      user_id,
      book_id,
      bank_account_id
    } = req.body;

    // Validate required fields
    if (!type || !customer_or_supplier || !invoice_date || !user_id || 
        !Array.isArray(items) || items.length === 0 || !book_id || !bank_account_id) {
      return res.status(400).json({ 
        error: "Missing required fields",
        missing_fields: {
          type: !type,
          customer_or_supplier: !customer_or_supplier,
          invoice_date: !invoice_date,
          user_id: !user_id,
          items: !items || items.length === 0,
          book_id: !book_id,
          bank_account_id: !bank_account_id
        }
      });
    }

    // Fetch user details
    const [userResult] = await connection.query(
      'SELECT name, phone_number, email FROM users WHERE id = ?', 
      [user_id]
    );
    
    if (userResult.length === 0) {
      return res.status(400).json({ error: "User not found" });
    }

    const { phone_number } = userResult[0];

    // Calculate totals
    const total_taxable = items.reduce((sum, item) => sum + parseFloat(item.taxable_amount || 0), 0);
    const total_amount = total_taxable - parseFloat(discount_amount) + parseFloat(round_off);
    const hsn_code = items[0]?.hsn_code || '';

    // Insert invoice
    const [invoiceResult] = await connection.query(
      `INSERT INTO invoices 
        (type, customer_or_supplier, invoice_date, total_taxable, 
         cgst, sgst, igst, total_amount, discount_amount, 
         percentage, round_off, user_id, book_id, bank_account_id, hsn_code)
       VALUES (?, ?, ?, ?, 0, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [type, customer_or_supplier, invoice_date, total_taxable, 
       total_amount, discount_amount, percentage, round_off, 
       user_id, book_id, bank_account_id, hsn_code]
    );

    const invoiceId = invoiceResult.insertId;

    // Insert invoice items
    for (const item of items) {
      await connection.query(
        `INSERT INTO invoice_items 
          (invoice_id, item_name, taxable_amount, remark, user_id, 
           hsn_code, quantity_unit, rate_per_unit, tax_rate)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [invoiceId, item.item_name, item.taxable_amount, item.remark || '', 
         user_id, item.hsn_code, item.quantity_unit || '', item.rate_per_unit || 0.00, 
         item.tax_rate || 0.00]
      );
    }

    // Prepare data for PDF
    const invoiceData = {
      invoiceId,
      type,
      customer_or_supplier,
      invoice_date,
      mobile_number: phone_number,
      bank_name: 'SBI',
      items,
      totals: {
        taxable: total_taxable,
        discount: parseFloat(discount_amount),
        round_off: parseFloat(round_off),
        grand_total: total_amount
      },
      user_id
    };

    console.log('invoiceData:', invoiceData); // Debugging: Check if invoiceData is correctly populated

    // Generate PDF
    const fileName = `detail-invoice_${invoiceId}.pdf`;
    const filePath = path.join(pdfsDir, fileName);
    
    try {
      await generateInvoicePDF(invoiceData, res);
      await connection.commit();

      res.status(201).json({
        message: "Invoice created successfully",
        downloadLink: `/download/detail-invoice/${invoiceId}`,
        invoiceId
      });

    } catch (pdfError) {
      await connection.rollback();
      // Clean up failed PDF file if it exists
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
      throw pdfError;
    }

  } catch (error) {
    await connection.rollback();
    console.error("Error adding invoice:", error);
    res.status(500).json({ 
      error: error.message || "Internal Server Error",
      sqlError: error.sqlMessage,
      code: "INVOICE_CREATION_FAILED"
    });
  } finally {
    connection.release();
  }
};

// Function to get all invoices
exports.newgetInvoices = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ 
        error: "user_id is required",
        code: "USER_ID_REQUIRED"
      });
    }

    const [invoices] = await db.query(
       `SELECT * FROM invoices WHERE user_id = ? ORDER BY invoice_date DESC`,
       [user_id]
    );

    res.status(200).json({ 
      invoices,
      count: invoices.length,
      user_id
    });

  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({ 
      error: error.message,
      code: "INVOICE_FETCH_FAILED"
    });
  } finally {
    connection.release();
  }
};

// Function to get a single invoice by ID
exports.newgetInvoiceById = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { id } = req.params;
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ 
        error: "user_id is required",
        code: "USER_ID_REQUIRED"
      });
    }

    const [invoice] = await db.query(
       `SELECT * FROM invoices WHERE id = ? AND user_id = ?`,
       [id, user_id]
    );

    if (invoice.length === 0) {
      return res.status(404).json({ 
        message: "Invoice not found or not owned by user",
        code: "INVOICE_NOT_FOUND"
      });
    }

    const [items] = await db.query(
       `SELECT * FROM invoice_items WHERE invoice_id = ? AND user_id = ?`,
       [id, user_id]
    );

    res.status(200).json({ 
      invoice: invoice[0], 
      items,
      user_id
    });

  } catch (error) {
    console.error("Error fetching invoice:", error);
    res.status(500).json({ 
      error: error.message,
      code: "INVOICE_FETCH_FAILED"
    });
  } finally {
    connection.release();
  }
};