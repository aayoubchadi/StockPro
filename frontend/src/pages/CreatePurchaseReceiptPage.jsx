import { useEffect, useMemo, useState } from 'react';
import { FileText, Plus, Trash2 } from 'lucide-react';
import Header from '../components/Header';
import PageBackground from '../components/PageBackground';
import { getSession } from '../lib/authStore';
import { cn } from '../lib/utils';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function buildAuthHeaders(accessToken) {
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
    };
}

function todayIsoDate() {
    return new Date().toISOString().slice(0, 10);
}

function normalizeReceiptProduct(product) {
    const id = String(product?.id || '').trim();
    const rawUnitPrice = product?.unitPrice ?? product?.unit_price ?? 0;
    const unitPrice = Number(rawUnitPrice);

    if (!id) {
        return null;
    }

    return {
        id,
        sku: String(product?.sku || '').trim(),
        name: String(product?.name || '').trim(),
        unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
    };
}

async function fetchReceiptProducts({ accessToken }) {
    const response = await fetch(`${API_BASE_URL}/api/v1/purchase-receipts/products`, {
        headers: buildAuthHeaders(accessToken),
    });

    if (!response.ok) {
        let payload = null;
        try {
            payload = await response.json();
        } catch {
            payload = null;
        }
        throw new Error(payload?.error?.message || 'Unable to load products');
    }

    return response.json();
}

async function createReceipt({ accessToken, payload }) {
    const response = await fetch(`${API_BASE_URL}/api/v1/purchase-receipts`, {
        method: 'POST',
        headers: buildAuthHeaders(accessToken),
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        let errorPayload = null;
        try {
            errorPayload = await response.json();
        } catch {
            errorPayload = null;
        }
        throw new Error(errorPayload?.error?.message || 'Unable to generate receipt');
    }

    const data = await response.json(); return data;
}

export default function CreatePurchaseReceiptPage() {
    const [session] = useState(() => getSession());
    const [products, setProducts] = useState([]);
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [form, setForm] = useState({
        buyerName: '',
        buyerCompany: '',
        buyerEmail: '',
        buyerPhone: '',
        receiptDate: todayIsoDate(),
        referenceNumber: '',
        notes: '',
    });
    const [productDraft, setProductDraft] = useState({
        productId: '',
        quantity: '1',
        unitPrice: '',
    });

    const accessToken = session?.accessToken;

    useEffect(() => {
        if (!accessToken) {
            setIsLoading(false);
            return;
        }

        let isActive = true;

        const loadProducts = async () => {
            setIsLoading(true);
            try {
                const data = await fetchReceiptProducts({ accessToken });
                if (isActive) {
                    const productRows = Array.isArray(data?.products)
                        ? data.products
                        : Array.isArray(data?.data?.products)
                            ? data.data.products
                            : [];
                    setProducts(productRows.map(normalizeReceiptProduct).filter(Boolean));
                    setMessage('');
                    setMessageType('');
                }
            } catch (error) {
                if (isActive) {
                    setMessage(error.message || 'Unable to load products');
                    setMessageType('error');
                }
            } finally {
                if (isActive) {
                    setIsLoading(false);
                }
            }
        };

        loadProducts();

        return () => {
            isActive = false;
        };
    }, [accessToken]);

    const selectedProduct = useMemo(
        () => products.find((product) => product.id === productDraft.productId),
        [products, productDraft.productId]
    );

    const totals = useMemo(() => {
        const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
        return {
            subtotal,
        };
    }, [items]);

    const handleProductChange = (event) => {
        const productId = event.target.value;
        const product = products.find((item) => item.id === productId);

        setProductDraft((current) => ({
            ...current,
            productId,
            unitPrice: product ? String(product.unitPrice) : current.unitPrice,
        }));
    };

    const handleAddItem = () => {
        if (!selectedProduct) {
            setMessage('Select a product to add');
            setMessageType('error');
            return;
        }

        const quantity = Number(productDraft.quantity);
        const hasDraftUnitPrice = String(productDraft.unitPrice).trim().length > 0;
        const unitPrice = hasDraftUnitPrice
            ? Number(productDraft.unitPrice)
            : Number(selectedProduct.unitPrice || 0);

        if (!Number.isFinite(quantity) || quantity <= 0) {
            setMessage('Quantity must be greater than zero');
            setMessageType('error');
            return;
        }

        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
            setMessage('Unit price must be a valid number');
            setMessageType('error');
            return;
        }

        const lineTotal = unitPrice * quantity;
        const nextItem = {
            id: `${selectedProduct.id}-${Date.now()}`,
            productId: selectedProduct.id,
            name: selectedProduct.name,
            sku: selectedProduct.sku,
            quantity,
            unitPrice,
            lineTotal,
        };

        setItems((current) => [...current, nextItem]);
        setProductDraft({
            productId: '',
            quantity: '1',
            unitPrice: '',
        });
        setMessage('');
        setMessageType('');
    };

    const updateItem = (itemId, updates) => {
        setItems((current) =>
            current.map((item) => {
                if (item.id !== itemId) {
                    return item;
                }

                const nextQuantity = Number(updates.quantity ?? item.quantity);
                const nextUnitPrice = Number(updates.unitPrice ?? item.unitPrice);
                const quantity = Number.isFinite(nextQuantity) ? nextQuantity : item.quantity;
                const unitPrice = Number.isFinite(nextUnitPrice) ? nextUnitPrice : item.unitPrice;
                const lineTotal = quantity * unitPrice;

                return {
                    ...item,
                    quantity,
                    unitPrice,
                    lineTotal,
                };
            })
        );
    };

    const removeItem = (itemId) => {
        setItems((current) => current.filter((item) => item.id !== itemId));
    };

    const handleGenerateReceipt = async (event) => {
        event.preventDefault();

        if (!accessToken) {
            return;
        }

        if (!form.buyerName.trim()) {
            setMessage('Buyer name is required');
            setMessageType('error');
            return;
        }

        if (items.length === 0) {
            setMessage('Add at least one product');
            setMessageType('error');
            return;
        }

        setIsGenerating(true);

        try {
            const payload = {
                buyerName: form.buyerName.trim(),
                buyerCompany: form.buyerCompany.trim(),
                buyerEmail: form.buyerEmail.trim(),
                buyerPhone: form.buyerPhone.trim(),
                receiptDate: form.receiptDate || undefined,
                referenceNumber: form.referenceNumber.trim(),
                notes: form.notes.trim(),
                items: items.map((item) => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                })),
            };

            await createReceipt({ accessToken, payload });

            setMessage('Receipt created successfully!');
            setMessageType('success');
            
            setTimeout(() => {
                window.location.href = '/purchase-receipts';
            }, 1000);
        } catch (error) {
            setMessage(error.message || 'Unable to generate receipt');
            setMessageType('error');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <>
            <PageBackground />
            <Header isDashboard={true} />
            <main className="section section-shell dashboard-page">
                <section className="dashboard-head">
                    <p className="eyebrow">Purchasing</p>
                    <h1>Create purchase receipts and export PDFs</h1>
                    <p className="max-w-2xl">
                        Select the products received, add buyer details, and generate a printable receipt.
                    </p>
                </section>

                {message ? <p className={cn('form-message', messageType)}>{message}</p> : null}
                {isLoading ? <p className="dashboard-state">Loading products...</p> : null}

                {!isLoading ? (
                    <form className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]" onSubmit={handleGenerateReceipt}>
                        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-slate-500">Step 1</p>
                                    <h2 className="mt-1 text-lg font-semibold text-slate-900">Select products</h2>
                                </div>
                                <FileText className="text-slate-400" size={22} />
                            </div>

                            <div className="mt-6 grid gap-4 md:grid-cols-[2fr_1fr_1fr_auto]">
                                <label className="grid gap-2 text-sm text-slate-600">
                                    Product
                                    <select
                                        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                                        value={productDraft.productId}
                                        onChange={handleProductChange}
                                    >
                                        <option value="">Select a product</option>
                                        {products.map((product) => (
                                            <option key={product.id} value={product.id}>
                                                {product.name || 'Unnamed product'}{product.sku ? ` (${product.sku})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="grid gap-2 text-sm text-slate-600">
                                    Quantity
                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
                                        value={productDraft.quantity}
                                        onChange={(event) =>
                                            setProductDraft((current) => ({
                                                ...current,
                                                quantity: event.target.value,
                                            }))
                                        }
                                    />
                                </label>
                                <label className="grid gap-2 text-sm text-slate-600">
                                    Unit price
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
                                        value={productDraft.unitPrice}
                                        onChange={(event) =>
                                            setProductDraft((current) => ({
                                                ...current,
                                                unitPrice: event.target.value,
                                            }))
                                        }
                                    />
                                </label>
                                <button
                                    type="button"
                                    className="btn btn-primary mt-7 h-11"
                                    onClick={handleAddItem}
                                >
                                    <Plus size={16} />
                                </button>
                            </div>

                            <div className="mt-6 space-y-3">
                                {items.length === 0 ? (
                                    <p className="text-sm text-slate-500">No items added yet.</p>
                                ) : (
                                    items.map((item) => (
                                        <div
                                            key={item.id}
                                            className="grid items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[2fr_1fr_1fr_auto]"
                                        >
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                                                <p className="text-xs text-slate-500">{item.sku}</p>
                                            </div>
                                            <input
                                                type="number"
                                                min="1"
                                                step="1"
                                                className="h-10 rounded-lg border border-slate-200 bg-white px-2 text-sm"
                                                value={item.quantity}
                                                onChange={(event) =>
                                                    updateItem(item.id, { quantity: event.target.value })
                                                }
                                            />
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                className="h-10 rounded-lg border border-slate-200 bg-white px-2 text-sm"
                                                value={item.unitPrice}
                                                onChange={(event) =>
                                                    updateItem(item.id, { unitPrice: event.target.value })
                                                }
                                            />
                                            <button
                                                type="button"
                                                className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:text-slate-900"
                                                onClick={() => removeItem(item.id)}
                                                aria-label="Remove item"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>

                        <section className="space-y-6">
                            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                <p className="text-xs uppercase tracking-wide text-slate-500">Step 2</p>
                                <h2 className="mt-1 text-lg font-semibold text-slate-900">Buyer details</h2>

                                <div className="mt-5 grid gap-4">
                                    <label className="grid gap-2 text-sm text-slate-600">
                                        Buyer name
                                        <input
                                            className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
                                            value={form.buyerName}
                                            onChange={(event) =>
                                                setForm((current) => ({ ...current, buyerName: event.target.value }))
                                            }
                                            required
                                        />
                                    </label>
                                    <label className="grid gap-2 text-sm text-slate-600">
                                        Buyer company (optional)
                                        <input
                                            className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
                                            value={form.buyerCompany}
                                            onChange={(event) =>
                                                setForm((current) => ({ ...current, buyerCompany: event.target.value }))
                                            }
                                        />
                                    </label>
                                    <label className="grid gap-2 text-sm text-slate-600">
                                        Buyer email (optional)
                                        <input
                                            type="email"
                                            className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
                                            value={form.buyerEmail}
                                            onChange={(event) =>
                                                setForm((current) => ({ ...current, buyerEmail: event.target.value }))
                                            }
                                        />
                                    </label>
                                    <label className="grid gap-2 text-sm text-slate-600">
                                        Buyer phone (optional)
                                        <input
                                            className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
                                            value={form.buyerPhone}
                                            onChange={(event) =>
                                                setForm((current) => ({ ...current, buyerPhone: event.target.value }))
                                            }
                                        />
                                    </label>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                <h2 className="text-lg font-semibold text-slate-900">Receipt details</h2>
                                <div className="mt-5 grid gap-4">
                                    <label className="grid gap-2 text-sm text-slate-600">
                                        Receipt date
                                        <input
                                            type="date"
                                            className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
                                            value={form.receiptDate}
                                            onChange={(event) =>
                                                setForm((current) => ({ ...current, receiptDate: event.target.value }))
                                            }
                                        />
                                    </label>
                                    <label className="grid gap-2 text-sm text-slate-600">
                                        Reference number (optional)
                                        <input
                                            className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
                                            value={form.referenceNumber}
                                            onChange={(event) =>
                                                setForm((current) => ({ ...current, referenceNumber: event.target.value }))
                                            }
                                        />
                                    </label>
                                    <label className="grid gap-2 text-sm text-slate-600">
                                        Notes (optional)
                                        <textarea
                                            className="min-h-[96px] rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                            value={form.notes}
                                            onChange={(event) =>
                                                setForm((current) => ({ ...current, notes: event.target.value }))
                                            }
                                        />
                                    </label>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                <div className="flex items-center justify-between text-sm text-slate-600">
                                    <span>Subtotal</span>
                                    <span>{totals.subtotal.toFixed(2)}</span>
                                </div>
                                <button
                                    type="submit"
                                    className="btn btn-primary mt-4 w-full"
                                    disabled={isGenerating}
                                >
                                    {isGenerating ? 'Generating...' : 'Create Receipt'}
                                </button>
                            </div>
                        </section>
                    </form>
                ) : null}
            </main>
        </>
    );
}
