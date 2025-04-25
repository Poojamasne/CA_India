const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const db = require('../config/database');

class InventoryController {
    static async generateInventoryReport(req, res) {
        try {
            // Fetch all inventory items with related invoice data
            const [items] = await db.query(`
                SELECT 
                    i.id,
                    inv.invoice_number AS 'Invoice No',
                    inv.invoice_date AS 'Date',
                    inv.customer_or_supplier AS 'Party',
                    inv.gst_number AS 'GSTN',
                    ii.item_name AS 'Item',
                    ii.hsn_code AS 'HSN Code',
                    ii.quantity_unit AS 'Quantity',
                    ii.tax_rate AS 'Tax Rate',
                    ii.taxable_amount AS 'Taxable',
                    (ii.taxable_amount * ii.tax_rate / 100) AS 'IGST',
                    (ii.taxable_amount * ii.tax_rate / 100) AS 'CGST',
                    (ii.taxable_amount * ii.tax_rate / 100) AS 'SGST',
                    (ii.taxable_amount * (1 + ii.tax_rate / 100)) AS 'Total'
                FROM 
                    items i
                LEFT JOIN 
                    invoice_items ii ON i.id = ii.item_id
                LEFT JOIN 
                    invoices inv ON ii.invoice_id = inv.id
                ORDER BY 
                    inv.invoice_date DESC
            `);

            // Create PDF document
            const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });

            // Set response headers
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=Inventory-Report-All-Items.pdf');

            // Pipe PDF to response
            doc.pipe(res);

            // Add title and metadata
            this.addDocumentHeader(doc);

            // Create and render table
            this.renderInventoryTable(doc, items);

            // Finalize PDF
            doc.end();
        } catch (error) {
            console.error('Error generating inventory report:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate inventory report',
                error: error.message
            });
        }
    }

    static addDocumentHeader(doc) {
        // Logo (if available)
        const logoPath = path.join(__dirname, '..', 'uploads', 'logo.jpeg');
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 50, 30, { width: 80 });
        }

        // Title
        doc.fontSize(18).text('INVENTORY REPORT - ALL ITEMS', {
            align: 'center',
            underline: true,
            paragraphGap: 10
        });

        // Generation info
        doc.fontSize(10).fillColor('#555555').text(`Generated on: ${new Date().toLocaleString()}`, {
            align: 'right'
        });

        doc.moveDown(2);
    }

    static renderInventoryTable(doc, items) {
        // Table configuration
        const columns = [
            { header: 'Invoice No', key: 'Invoice No', width: 80 },
            { header: 'Date', key: 'Date', width: 70 },
            { header: 'Party', key: 'Party', width: 100 },
            { header: 'GSTN', key: 'GSTN', width: 90 },
            { header: 'Item', key: 'Item', width: 100 },
            { header: 'HSN Code', key: 'HSN Code', width: 70 },
            { header: 'Quantity', key: 'Quantity', width: 60 },
            { header: 'Tax Rate', key: 'Tax Rate', width: 50 },
            { header: 'Taxable', key: 'Taxable', width: 70 },
            { header: 'IGST', key: 'IGST', width: 60 },
            { header: 'CGST', key: 'CGST', width: 60 },
            { header: 'SGST', key: 'SGST', width: 60 },
            { header: 'Total', key: 'Total', width: 70 }
        ];

        // Table position
        const startX = 30;
        const startY = 120;
        const rowHeight = 25;
        const headerHeight = 30;

        // Draw table headers
        doc.font('Helvetica-Bold').fontSize(10);
        let x = startX;

        columns.forEach(column => {
            doc.text(column.header, x, startY, {
                width: column.width,
                align: 'center'
            });
            x += column.width;
        });

        // Draw header underline
        doc.moveTo(startX, startY + headerHeight)
           .lineTo(x, startY + headerHeight)
           .stroke();

        // Draw table rows
        doc.font('Helvetica').fontSize(9);
        let y = startY + headerHeight;

        items.forEach((item, index) => {
            // Alternate row background
            if (index % 2 === 0) {
                doc.rect(startX, y, x - startX, rowHeight)
                   .fill('#f8f8f8');
            }

            // Draw cell content
            let cellX = startX;

            columns.forEach(column => {
                let value = item[column.key];

                // Format values based on column
                if (column.key === 'Date' && value) {
                    value = new Date(value).toLocaleDateString();
                } else if (['Taxable', 'IGST', 'CGST', 'SGST', 'Total'].includes(column.key)) {
                    value = parseFloat(value || 0).toFixed(2);
                } else if (column.key === 'Tax Rate') {
                    value = `${parseFloat(value || 0).toFixed(2)}%`;
                }

                doc.text(value || '-', cellX + 5, y + 5, {
                    width: column.width - 10,
                    align: ['Invoice No', 'Date', 'Quantity'].includes(column.key) ? 'center' : 'left'
                });

                cellX += column.width;
            });

            // Draw row divider
            doc.moveTo(startX, y + rowHeight)
               .lineTo(x, y + rowHeight)
               .stroke();

            y += rowHeight;

            // Add new page if needed
            if (y > doc.page.height - 50) {
                doc.addPage({ size: 'A4', layout: 'landscape' });
                y = 50;
            }
        });
    }
}

module.exports = InventoryController;