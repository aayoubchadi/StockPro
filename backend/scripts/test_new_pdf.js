import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Helper functions (copied from purchaseReceiptRoutes.js)
function formatMoney(value, currencyCode = 'USD') {
    const safeCurrency = String(currencyCode || 'USD').toUpperCase();
    const amount = Number.isFinite(value) ? value : 0;
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: safeCurrency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    } catch {
        return `${amount.toFixed(2)} ${safeCurrency}`;
    }
}

function formatDate(value) {
    return new Intl.DateTimeFormat('en-GB', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
    }).format(value);
}

function renderLineItems(doc, items, currency, startY) {
    const pageWidth = 595; // A4 width in points
    const margin = 50;
    const contentWidth = pageWidth - 2 * margin;
    
    // Column widths
    const colWidth = {
        description: contentWidth * 0.4,
        quantity: contentWidth * 0.15,
        unitPrice: contentWidth * 0.2,
        amount: contentWidth * 0.25,
    };
    
    let x = margin;
    let y = startY;
    const rowHeight = 20;
    const headerBgColor = '#9ca3af'; // Gray-400
    const headerTextColor = '#ffffff';
    const alternateRowBg = '#f3f4f6';
    
    // Header row
    doc.rect(margin, y, contentWidth, rowHeight).fill(headerBgColor);
    
    doc.fontSize(11).font('Helvetica-Bold').fillColor(headerTextColor);
    doc.text('Item Description', x, y + 4, { width: colWidth.description });
    doc.text('Quantity', x + colWidth.description, y + 4, { width: colWidth.quantity, align: 'right' });
    doc.text('Unit Price', x + colWidth.description + colWidth.quantity, y + 4, { width: colWidth.unitPrice, align: 'right' });
    doc.text('Amount', x + colWidth.description + colWidth.quantity + colWidth.unitPrice, y + 4, { width: colWidth.amount, align: 'right' });
    
    y += rowHeight;
    
    // Line items
    let itemCount = 0;
    for (const item of items) {
        if (y > doc.page.height - 120) {
            doc.addPage();
            y = margin;
        }
        
        // Alternate row background
        if (itemCount % 2 === 1) {
            doc.rect(margin, y, contentWidth, rowHeight).fill(alternateRowBg);
        }
        
        doc.fontSize(10).font('Helvetica').fillColor('#111827');
        doc.text(item.name || 'Unknown', x, y + 4, { width: colWidth.description });
        doc.text(String(item.quantity), x + colWidth.description, y + 4, { width: colWidth.quantity, align: 'right' });
        doc.text(formatMoney(item.unitPrice, currency), x + colWidth.description + colWidth.quantity, y + 4, { width: colWidth.unitPrice, align: 'right' });
        doc.text(formatMoney(item.lineTotal, currency), x + colWidth.description + colWidth.quantity + colWidth.unitPrice, y + 4, { width: colWidth.amount, align: 'right' });
        
        y += rowHeight;
        itemCount += 1;
    }
    
    // Border line
    doc.moveTo(margin, y).lineTo(pageWidth - margin, y).stroke('#cccccc');
    
    return y;
}

// Create test receipt PDF
const doc = new PDFDocument({ margin: 50, size: 'A4' });
const outputPath = path.join(__dirname, 'test_receipt_new_layout.pdf');
const stream = fs.createWriteStream(outputPath);

doc.pipe(stream);

const pageWidth = 595;
const margin = 50;
const contentWidth = pageWidth - 2 * margin;
const headerBgColor = '#9ca3af';
let currentY = 50;

// ===== HEADER SECTION =====
doc.rect(margin, currentY, contentWidth, 50).fill(headerBgColor);
doc.fontSize(22).font('Helvetica-Bold').fillColor('#ffffff');
doc.text('PURCHASE RECEIPT', margin + 15, currentY + 10, { width: contentWidth - 30 });
currentY += 60;

// ===== TOP INFO SECTION =====
doc.fontSize(10).font('Helvetica-Bold').fillColor('#111827');
doc.text('Acme Logistics', margin, currentY);
doc.fontSize(9).font('Helvetica').fillColor('#6b7280');
doc.text('Received by: Acme Logistics', margin, currentY + 16);

doc.fontSize(9).font('Helvetica').fillColor('#111827');
doc.text('Receipt #: PDF-NEW-LAYOUT-TEST', margin + 310, currentY, { align: 'right' });
doc.text('Date: 19-May-2026', margin + 310, currentY + 16, { align: 'right' });

currentY += 50;

// ===== PURCHASE FROM / PURCHASED BY SECTION =====
const leftColX = margin;
const rightColX = margin + 280;
const boxHeight = 80;

doc.rect(leftColX, currentY, 230, boxHeight).stroke('#cccccc');
doc.rect(rightColX, currentY, 230, boxHeight).stroke('#cccccc');

doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827');
doc.text('Purchase From:', leftColX + 8, currentY + 6);
doc.fontSize(9).font('Helvetica').fillColor('#111827');
doc.text('Acme Logistics', leftColX + 8, currentY + 22);
doc.fontSize(8).fillColor('#6b7280');
doc.text('(Your Company)', leftColX + 8, currentY + 36);

doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827');
doc.text('Purchased By:', rightColX + 8, currentY + 6);
doc.fontSize(9).font('Helvetica').fillColor('#111827');
doc.text('John Smith', rightColX + 8, currentY + 22);
doc.fontSize(8).fillColor('#6b7280').text('ABC Corporation', rightColX + 8, currentY + 36);
doc.text('john@abc.com', rightColX + 8, currentY + 48);

currentY += boxHeight + 20;

// ===== ITEMS TABLE =====
const items = [
    { name: 'Office Chair', quantity: 2, unitPrice: 150, lineTotal: 300 },
    { name: 'Desk Lamp', quantity: 3, unitPrice: 45, lineTotal: 135 },
    { name: 'Keyboard', quantity: 1, unitPrice: 89, lineTotal: 89 },
];

const tableStartY = renderLineItems(doc, items, 'USD', currentY);
currentY = tableStartY + 20;

// ===== TOTALS SECTION =====
const totalColX = margin + contentWidth - 200;

doc.fontSize(10).font('Helvetica').fillColor('#111827');
doc.text('Subtotal:', totalColX, currentY, { width: 80, align: 'right' });
doc.text('$524.00', totalColX + 90, currentY, { width: 100, align: 'right' });

currentY += 25;

// Total box
doc.rect(totalColX - 5, currentY - 5, 105, 25).fill(headerBgColor);
doc.fontSize(12).font('Helvetica-Bold').fillColor('#ffffff');
doc.text('Total:', totalColX, currentY + 2, { width: 80, align: 'right' });
doc.text('$524.00', totalColX + 90, currentY + 2, { width: 100, align: 'right' });

doc.end();

doc.on('finish', () => {
    console.log(`Test PDF created: ${outputPath}`);
});
