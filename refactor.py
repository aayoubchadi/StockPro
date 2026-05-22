import os

base_dir = os.path.dirname(os.path.abspath(__file__))
routes_path = os.path.join(base_dir, 'backend', 'src', 'routes', 'purchaseReceiptRoutes.js')

new_routes = """import { Router } from 'express';
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
    const safeCurrency = String(currencyCode || 'EUR').toUpperCase();
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
        doc.text(formatMoney(item.unitPrice || item.unit_price, currency), columnX.unit, y, { width: 60, align: 'right' });
        doc.text(formatMoney(item.lineTotal || item.line_total, currency), columnX.total, y, { width: 70, align: 'right' });
        y += rowHeight;
    }
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
            query += f" AND (buyer_name ILIKE ${paramCount} OR reference_number ILIKE ${paramCount})";
            params.push(f"%{search}%");
        }

        if (date) {
            paramCount += 1;
            query += f" AND DATE(receipt_date) = ${paramCount}";
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

        const currency = request.tenant.plan?.currencyCode || 'EUR';
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

        doc.fontSize(20).fillColor('#111827').text('Purchase Receipt', { align: 'left' });
        doc.moveDown(0.6);
        doc.fontSize(10).fillColor('#6b7280').text(`Reference: ${receipt.reference_number || 'Auto-generated'}`);
        doc.text(`Date: ${formatDate(new Date(receipt.receipt_date))}`);
        
        doc.moveDown(0.8);
        doc.fontSize(12).fillColor('#111827').text('Company');
        doc.fontSize(10).fillColor('#6b7280');
        doc.text(companyName);

        doc.moveDown(0.8);
        doc.fontSize(12).fillColor('#111827').text('Buyer');
        doc.fontSize(10).fillColor('#6b7280');
        doc.text(receipt.buyer_name);
        if (receipt.buyer_company) doc.text(receipt.buyer_company);

        doc.moveDown(1.2);
        const tableEndY = renderLineItems(doc, items, currency, doc.y);
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#111827');
        doc.text(`Subtotal: ${formatMoney(receipt.subtotal, currency)}`, 370, tableEndY + 10, { align: 'right', width: 175 });
        doc.text(`Total: ${formatMoney(receipt.total, currency)}`, 370, tableEndY + 26, { align: 'right', width: 175 });
        doc.end();
    } catch (err) {
        next(err);
    }
});

router.post('/', async (request, response, next) => {
    const client = await db.pool.connect();
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

        const productIds = list(set([item['productId'] for item in parsedItems])); # This isn't JS... wait, JS inside Python!
        // wait, I will just output the JS properly.
"""

# Let me re-write new_routes correctly since I had python array comp inside js string
new_routes = new_routes.replace("const productIds = list(set([item['productId'] for item in parsedItems])); # This isn't JS... wait, JS inside Python!", "")
new_routes += """
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
"""

with open(routes_path, 'w', encoding='utf-8') as f:
    f.write(new_routes)

# Duplicate the frontend file
old_page_path = os.path.join(base_dir, 'frontend', 'src', 'pages', 'PurchaseReceiptsPage.jsx')
new_page_path = os.path.join(base_dir, 'frontend', 'src', 'pages', 'CreatePurchaseReceiptPage.jsx')

with open(old_page_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Make it a create page
content = content.replace("PurchaseReceiptsPage", "CreatePurchaseReceiptPage")
content = content.replace("Generate receipt PDF", "Create Receipt")
content = content.replace("generateReceiptPdf", "createReceipt")

# Fix the response parsing to expect JSON instead of blob
import re
content = re.sub(r"const blob = await response\.blob\(\);[\s\S]*?return { blob, fileName };", "const data = await response.json(); return data;", content)
content = re.sub(r"const \{ blob, fileName \} = await createReceipt\(\{ accessToken, payload \}\);[\s\S]*?a\.click\(\);", 
"""await createReceipt({ accessToken, payload });
            setMessageType('success');
            setMessage('Receipt created successfully!');
            setTimeout(() => { window.location.href = '/dashboard/purchase-receipts'; }, 1000);""", content)

with open(new_page_path, 'w', encoding='utf-8') as f:
    f.write(content)

# create list page
list_page_content = """import { useEffect, useState } from 'react';
import { Plus, Download, Search } from 'lucide-react';
import Header from '../components/Header';
import PageBackground from '../components/PageBackground';
import { getSession } from '../lib/authStore';
import { Link } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export default function PurchaseReceiptsPage() {
    const [session] = useState(() => getSession());
    const [receipts, setReceipts] = useState([]);
    const [search, setSearch] = useState('');
    const [dateFilter, setDateFilter] = useState('');

    useEffect(() => {
        if (!session?.accessToken) return;
        let url = `${API_BASE_URL}/api/v1/purchase-receipts?`;
        if (search) url += `search=${search}&`;
        if (dateFilter) url += `date=${dateFilter}`;

        fetch(url, {
            headers: { Authorization: `Bearer ${session.accessToken}` }
        })
        .then(res => res.json())
        .then(data => setReceipts(data.receipts || []))
        .catch(console.error);
    }, [session, search, dateFilter]);

    const handleDownload = async (id, ref) => {
        const res = await fetch(`${API_BASE_URL}/api/v1/purchase-receipts/${id}/pdf`, {
            headers: { Authorization: `Bearer ${session.accessToken}` }
        });
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${ref || 'receipt-'+id}.pdf`;
        a.click();
    };

    return (
        <PageBackground>
            <div className="flex flex-col min-h-screen">
                <Header />
                <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold text-gray-900">Purchase Receipts</h1>
                        <Link to="/dashboard/purchase-receipts/new" className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                            <Plus className="w-5 h-5 mr-2" /> Create Receipt
                        </Link>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-sm flex gap-4 mb-6">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Search Buyer or Ref</label>
                            <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" placeholder="Search..." />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buyer</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {receipts.map(r => (
                                    <tr key={r.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(r.receipt_date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.reference_number || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.buyer_name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.total}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => handleDownload(r.id, r.reference_number)} className="text-indigo-600 hover:text-indigo-900">
                                                <Download className="w-5 h-5 inline" /> Download
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {receipts.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-4 text-center text-gray-500">No receipts found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </main>
            </div>
        </PageBackground>
    );
}
"""
with open(old_page_path, 'w', encoding='utf-8') as f:
    f.write(list_page_content)

# Update AppRoutes
routes_app_path = os.path.join(base_dir, 'frontend', 'src', 'routes', 'AppRoutes.jsx')
with open(routes_app_path, 'r', encoding='utf-8') as f:
    app_routes_content = f.read()

if 'CreatePurchaseReceiptPage' not in app_routes_content:
    app_routes_content = app_routes_content.replace(
        "import PurchaseReceiptsPage from '../pages/PurchaseReceiptsPage';",
        "import PurchaseReceiptsPage from '../pages/PurchaseReceiptsPage';\nimport CreatePurchaseReceiptPage from '../pages/CreatePurchaseReceiptPage';"
    )
    app_routes_content = app_routes_content.replace(
        '<Route path="purchase-receipts" element={<PurchaseReceiptsPage />} />',
        '<Route path="purchase-receipts" element={<PurchaseReceiptsPage />} />\n                        <Route path="purchase-receipts/new" element={<CreatePurchaseReceiptPage />} />'
    )
    with open(routes_app_path, 'w', encoding='utf-8') as f:
        f.write(app_routes_content)
