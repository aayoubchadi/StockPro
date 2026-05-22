import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { requireAuth } from '../middleware/requireAuth.js';
import {
    requireTenantAccess,
    requireTenantPermission,
} from '../middleware/requireTenantAccess.js';
import db from '../lib/db.js';
import { HttpError } from '../lib/httpError.js';

const router = Router();

function normalizeValue(value) {
    return String(value || '').trim();
}

function toNumber(value, fallback = NaN) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        String(value || '')
    );
}

function parseReceiptDate(input) {
    if (!input) {
        return new Date();
    }
    const parsed = new Date(input);
    if (Number.isNaN(parsed.getTime())) {
        throw new HttpError(400, 'RECEIPT_VALIDATION_ERROR', 'Invalid receipt date');
    }
    return parsed;
}

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
        doc.text(formatMoney(item.unitPrice || item.unit_price, currency), x + colWidth.description + colWidth.quantity, y + 4, { width: colWidth.unitPrice, align: 'right' });
        doc.text(formatMoney(item.lineTotal || item.line_total, currency), x + colWidth.description + colWidth.quantity + colWidth.unitPrice, y + 4, { width: colWidth.amount, align: 'right' });
        
        y += rowHeight;
        itemCount += 1;
    }
    
    // Border line
    doc.moveTo(margin, y).lineTo(pageWidth - margin, y).stroke('#cccccc');
    
    return y;
}

router.use(requireAuth);
router.use(requireTenantAccess);
router.use(requireTenantPermission('receipts.create'));

router.get('/products', async (request, response, next) => {
    try {
        const { rows } = await db.query(
            "SELECT id, sku, name, unit_price FROM products WHERE company_id = $1 ORDER BY name ASC",
            [request.tenant.companyId]
        );
        response.json({ products: rows });
    } catch (error) {
        next(error);
    }
});

router.get('/', async (request, response, next) => {
    try {
        const { search, date } = request.query;
        let query = "SELECT id, buyer_name, buyer_company, reference_number, receipt_date, subtotal, total FROM purchase_receipts WHERE company_id = $1";
        const params = [request.tenant.companyId];
        let paramCount = 1;

        if (search) {
            paramCount += 1;
            query += ` AND (buyer_name ILIKE $${paramCount} OR reference_number ILIKE $${paramCount})`;
            params.push(`%${search}%`);
        }

        if (date) {
            paramCount += 1;
            query += ` AND DATE(receipt_date) = $${paramCount}`;
            params.push(date);
        }

        query += " ORDER BY receipt_date DESC";
        const { rows } = await db.query(query, params);
        response.json({ receipts: rows });
    } catch (err) {
        next(err);
    }
});

router.get('/:id/pdf', async (request, response, next) => {
    try {
        const { id } = request.params;
        const { rows } = await db.query('SELECT * FROM purchase_receipts WHERE id = $1 AND company_id = $2', [id, request.tenant.companyId]);
        if (!rows.length) throw new HttpError(404, 'NOT_FOUND', 'Receipt not found');
        const receipt = rows[0];

        const { rows: items } = await db.query('SELECT ri.*, p.sku, p.name FROM purchase_receipt_items ri JOIN products p ON ri.product_id = p.id WHERE ri.receipt_id = $1', [id]);

        const currency = request.tenant.plan?.currencyCode || 'MAD';
        const companyName = request.tenant.company?.name || 'Company';
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const chunks = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('error', next);
        doc.on('end', () => {
            const buffer = Buffer.concat(chunks);
            const safeDate = new Date(receipt.receipt_date).toISOString().slice(0, 10);
            const fileBase = receipt.reference_number || `PR-${safeDate}`;
            response.setHeader('Content-Type', 'application/pdf');
            response.setHeader('Content-Disposition', `attachment; filename="${fileBase}.pdf"`);
            response.send(buffer);
        });

        const pageWidth = 595; // A4 width in points
        const margin = 50;
        const contentWidth = pageWidth - 2 * margin;
        const headerBgColor = '#9ca3af'; // Gray matching template
        let currentY = 50;
        
        // ===== HEADER SECTION (Brown/Gold bar) =====
        doc.rect(margin, currentY, contentWidth, 50).fill(headerBgColor);
        doc.fontSize(22).font('Helvetica-Bold').fillColor('#ffffff');
        doc.text('PURCHASE RECEIPT', margin + 15, currentY + 10, { width: contentWidth - 30 });
        currentY += 60;
        
        // ===== TOP INFO SECTION =====
        // Left side: Company info
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#111827');
        doc.text(companyName, margin, currentY);
        doc.fontSize(9).font('Helvetica').fillColor('#6b7280');
        doc.text('Received by: ' + companyName, margin, currentY + 16);
        
        // Right side: Receipt details
        doc.fontSize(9).font('Helvetica').fillColor('#111827');
        doc.text(`Receipt #: ${receipt.reference_number || 'Auto'}`, margin + 310, currentY, { align: 'right' });
        doc.text(`Date: ${formatDate(new Date(receipt.receipt_date))}`, margin + 310, currentY + 16, { align: 'right' });
        
        currentY += 50;
        
        // ===== PURCHASE FROM / SHIP TO SECTION =====
        const leftColX = margin;
        const rightColX = margin + 280;
        const boxHeight = 80;
        
        // Border boxes
        doc.rect(leftColX, currentY, 230, boxHeight).stroke('#cccccc');
        doc.rect(rightColX, currentY, 230, boxHeight).stroke('#cccccc');
        
        // Left box: Purchase From
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827');
        doc.text('Purchase From:', leftColX + 8, currentY + 6);
        doc.fontSize(9).font('Helvetica').fillColor('#111827');
        doc.text(companyName, leftColX + 8, currentY + 22);
        doc.fontSize(8).fillColor('#6b7280');
        doc.text('(Your Company)', leftColX + 8, currentY + 36);
        
        // Right box: Purchased By
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827');
        doc.text('Purchased By:', rightColX + 8, currentY + 6);
        doc.fontSize(9).font('Helvetica').fillColor('#111827');
        doc.text(receipt.buyer_name, rightColX + 8, currentY + 22);
        if (receipt.buyer_company) {
            doc.fontSize(8).fillColor('#6b7280').text(receipt.buyer_company, rightColX + 8, currentY + 36);
        }
        if (receipt.buyer_email) {
            doc.fontSize(8).fillColor('#6b7280').text(receipt.buyer_email, rightColX + 8, currentY + 48);
        }
        if (receipt.buyer_phone) {
            doc.fontSize(8).fillColor('#6b7280').text(receipt.buyer_phone, rightColX + 8, currentY + 60);
        }
        
        currentY += boxHeight + 20;
        
        // ===== ITEMS TABLE =====
        const tableStartY = renderLineItems(doc, items, currency, currentY);
        currentY = tableStartY + 20;
        
        // ===== TOTALS SECTION =====
        const totalColX = margin + contentWidth - 200;
        
        doc.fontSize(10).font('Helvetica').fillColor('#111827');
        doc.text('Subtotal:', totalColX, currentY, { width: 80, align: 'right' });
        doc.text(formatMoney(receipt.subtotal, currency), totalColX + 90, currentY, { width: 100, align: 'right' });
        
        if (receipt.notes) {
            doc.fontSize(8).fillColor('#6b7280');
            doc.text('Notes: ' + receipt.notes, margin, currentY + 20, { width: contentWidth - 200 });
        }
        
        currentY += 25;
        
        // Total box
        doc.rect(totalColX - 5, currentY - 5, 105, 25).fill(headerBgColor);
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#ffffff');
        doc.text('Total:', totalColX, currentY + 2, { width: 80, align: 'right' });
        doc.text(formatMoney(receipt.total, currency), totalColX + 90, currentY + 2, { width: 100, align: 'right' });
        
        doc.end();
    } catch (err) {
        next(err);
    }
});

router.post('/', async (request, response, next) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        const buyerName = normalizeValue(request.body.buyerName);
        const buyerCompany = normalizeValue(request.body.buyerCompany);
        const buyerEmail = normalizeValue(request.body.buyerEmail);
        const buyerPhone = normalizeValue(request.body.buyerPhone);
        const referenceNumber = normalizeValue(request.body.referenceNumber);
        const notes = normalizeValue(request.body.notes);
        const receiptDate = parseReceiptDate(request.body.receiptDate);
        const items = Array.isArray(request.body.items) ? request.body.items : [];

        if (!buyerName) throw new HttpError(400, 'RECEIPT_VALIDATION_ERROR', 'buyerName is required');
        if (items.length === 0) throw new HttpError(400, 'RECEIPT_VALIDATION_ERROR', 'At least one item is required');

        const parsedItems = items.map((item) => ({
            productId: normalizeValue(item.productId),
            quantity: toNumber(item.quantity, NaN),
            unitPrice: toNumber(item.unitPrice, NaN),
        }));

        const invalidItem = parsedItems.find(
            (item) => !item.productId || !isUuid(item.productId) || !Number.isFinite(item.quantity) || item.quantity <= 0
        );

        if (invalidItem) throw new HttpError(400, 'RECEIPT_VALIDATION_ERROR', 'Invalid items');

        
        // wait, I will just output the JS properly.

        const productIds = Array.from(new Set(parsedItems.map((item) => item.productId)));
        const { rows } = await client.query(
            "SELECT id, sku, name, unit_price FROM products WHERE company_id = $1 AND id = ANY($2::uuid[])",
            [request.tenant.companyId, productIds]
        );

        if (rows.length !== productIds.length) throw new HttpError(400, 'RECEIPT_VALIDATION_ERROR', 'One or more products were not found');

        const productMap = new Map(rows.map((row) => [row.id, row]));
        const receiptItems = parsedItems.map((item) => {
            const product = productMap.get(item.productId);
            const unitPrice = Number.isFinite(item.unitPrice) ? item.unitPrice : Number(product.unit_price || 0);
            return {
                productId: item.productId,
                quantity: item.quantity,
                unitPrice,
                lineTotal: unitPrice * item.quantity,
            };
        });

        const subtotal = receiptItems.reduce((sum, item) => sum + item.lineTotal, 0);

        const { rows: rInsert } = await client.query(
            "INSERT INTO purchase_receipts (company_id, created_by, buyer_name, buyer_company, buyer_email, buyer_phone, reference_number, receipt_date, notes, subtotal, total) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id",
            [request.tenant.companyId, request.user.id, buyerName, buyerCompany, buyerEmail, buyerPhone, referenceNumber, receiptDate, notes, subtotal, subtotal]
        );
        const receiptId = rInsert[0].id;

        for (const item of receiptItems) {
            await client.query(
                "INSERT INTO purchase_receipt_items (receipt_id, product_id, quantity, unit_price, line_total) VALUES ($1, $2, $3, $4, $5)",
                [receiptId, item.productId, item.quantity, item.unitPrice, item.lineTotal]
            );
        }

        await client.query('COMMIT');
        response.json({ message: 'Receipt created successfully', id: receiptId });
    } catch (error) {
        await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
});

export default router;
