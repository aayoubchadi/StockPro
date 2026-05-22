import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

import PDFDocument from 'pdfkit';
const { default: db } = await import('../src/lib/db.js');
import fs from 'fs';
import path from 'path';

function formatMoney(value, currencyCode) {
  const safeCurrency = String(currencyCode || 'MAD').toUpperCase();
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
  const columnX = { sku: 50, name: 120, qty: 340, unit: 390, total: 470 };
  const rowHeight = 18;
  let y = startY;

  doc.fontSize(10).fillColor('#111827').text('SKU', columnX.sku, y);
  doc.text('Product', columnX.name, y);
  doc.text('Qty', columnX.qty, y, { width: 40, align: 'right' });
  doc.text('Unit', columnX.unit, y, { width: 60, align: 'right' });
  doc.text('Total', columnX.total, y, { width: 70, align: 'right' });

  y += rowHeight;
  doc.moveTo(50, y - 4).lineTo(545, y - 4).strokeColor('#e5e7eb').stroke();

  for (const item of items) {
    if (y > doc.page.height - 80) {
      doc.addPage();
      y = 50;
    }
    doc.fontSize(10).fillColor('#111827').text(item.sku || 'N/A', columnX.sku, y);
    doc.text(item.name || 'Unknown', columnX.name, y, { width: 200 });
    doc.text(String(item.quantity), columnX.qty, y, { width: 40, align: 'right' });
    doc.text(formatMoney(item.unit_price || item.unitPrice, currency), columnX.unit, y, { width: 60, align: 'right' });
    doc.text(formatMoney(item.line_total || item.lineTotal, currency), columnX.total, y, { width: 70, align: 'right' });
    y += rowHeight;
  }
  return y;
}

async function generate(receiptId) {
  const { rows } = await db.query('SELECT * FROM purchase_receipts WHERE id = $1', [receiptId]);
  if (!rows.length) {
    console.error('Receipt not found', receiptId);
    process.exit(2);
  }
  const receipt = rows[0];
  const { rows: items } = await db.query('SELECT ri.*, p.sku, p.name FROM purchase_receipt_items ri JOIN products p ON ri.product_id = p.id WHERE ri.receipt_id = $1', [receiptId]);

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const outDir = path.join(process.cwd(), 'backend', 'tmp');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const safeDate = new Date(receipt.receipt_date).toISOString().slice(0, 10);
  const fileBase = receipt.reference_number || `PR-${safeDate}`;
  const outPath = path.join(outDir, `${fileBase}-${receiptId}.pdf`);
  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  doc.fontSize(20).fillColor('#111827').text('Purchase Receipt', { align: 'left' });
  doc.moveDown(0.6);
  doc.fontSize(10).fillColor('#6b7280').text(`Reference: ${receipt.reference_number || 'Auto-generated'}`);
  doc.text(`Date: ${formatDate(new Date(receipt.receipt_date))}`);
  doc.moveDown(0.8);
  doc.fontSize(12).fillColor('#111827').text('Company');
  doc.fontSize(10).fillColor('#6b7280');
  doc.text(receipt.company_id || 'Company');
  doc.moveDown(0.8);
  doc.fontSize(12).fillColor('#111827').text('Buyer');
  doc.fontSize(10).fillColor('#6b7280');
  doc.text(receipt.buyer_name);
  if (receipt.buyer_company) doc.text(receipt.buyer_company);

  const tableEndY = renderLineItems(doc, items, 'EUR', doc.y);
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#111827');
  doc.text(`Subtotal: ${formatMoney(receipt.subtotal, 'EUR')}`, 370, tableEndY + 10, { align: 'right', width: 175 });
  doc.text(`Total: ${formatMoney(receipt.total, 'EUR')}`, 370, tableEndY + 26, { align: 'right', width: 175 });
  doc.end();

  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
  console.log('Generated PDF at', outPath);
}

const receiptId = process.argv[2] || 'af8660d3-351d-4730-a1de-94b459948377';
generate(receiptId).then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(2); });
