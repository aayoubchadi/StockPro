import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Minus,
  Package,
  Plus,
  Search,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import Header from '../components/Header';
import PageBackground from '../components/PageBackground';
import { getSession } from '../lib/authStore';
import { cn } from '../lib/utils';
import {
  createCompanyProduct,
  getCompanyProducts,
  moveCompanyProductStock,
  updateCompanyProduct,
} from '../services/companyApi';

export default function InventoryPage() {
  const [session] = useState(() => getSession());
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pendingDeltas, setPendingDeltas] = useState({});
  const [productForm, setProductForm] = useState({
    sku: '',
    name: '',
    description: '',
    unitPrice: '0',
    quantityInStock: '0',
    lowStockThreshold: '5',
  });
  const accessToken = session?.accessToken;

  const getProductStatus = (product) => {
    const quantity = Number(product.quantityInStock || 0);
    const lowThreshold = Number(product.lowStockThreshold || 0);

    if (quantity <= 0) {
      return 'out-of-stock';
    }

    if (quantity <= lowThreshold) {
      return 'low-stock';
    }

    return 'in-stock';
  };

  const loadProducts = async () => {
    if (!accessToken) {
      return;
    }

    setIsLoading(true);
    try {
      const data = await getCompanyProducts({ accessToken });
      setProducts(data?.products || []);
      setMessage('');
      setMessageType('');
    } catch (error) {
      setMessage(error.message || 'Unable to load products.');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [accessToken]);

  const handleCreateProduct = async (event) => {
    event.preventDefault();
    if (!accessToken) {
      return;
    }

    setIsSubmitting(true);
    try {
      await createCompanyProduct({
        accessToken,
        sku: productForm.sku,
        name: productForm.name,
        description: productForm.description,
        unitPrice: Number(productForm.unitPrice),
        quantityInStock: Number(productForm.quantityInStock),
        lowStockThreshold: Number(productForm.lowStockThreshold),
      });

      setProductForm({
        sku: '',
        name: '',
        description: '',
        unitPrice: '0',
        quantityInStock: '0',
        lowStockThreshold: '5',
      });
      setShowAddForm(false);
      setMessage('Product created successfully.');
      setMessageType('success');
      await loadProducts();
    } catch (error) {
      setMessage(error.message || 'Unable to create product.');
      setMessageType('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickToggleActive = async (product) => {
    if (!accessToken) {
      return;
    }

    try {
      await updateCompanyProduct({
        accessToken,
        productId: product.id,
        updates: {
          isActive: !product.isActive,
        },
      });
      await loadProducts();
    } catch (error) {
      setMessage(error.message || 'Unable to update product.');
      setMessageType('error');
    }
  };

  const handleQuickStockDelta = (product, delta) => {
    if (delta === 0) {
      return;
    }

    setPendingDeltas((current) => {
      const existingDelta = Number(current[product.id] || 0);
      const currentQuantity = Number(product.quantityInStock || 0);
      const nextQuantity = Math.max(0, currentQuantity + existingDelta + delta);
      const nextDelta = nextQuantity - currentQuantity;

      return {
        ...current,
        [product.id]: nextDelta,
      };
    });
  };

  const handleConfirmStockDelta = async (product) => {
    const delta = Number(pendingDeltas[product.id] || 0);
    if (!accessToken || delta === 0) {
      return;
    }

    try {
      await moveCompanyProductStock({
        accessToken,
        productId: product.id,
        movementType: delta > 0 ? 'in' : 'out',
        quantity: Math.abs(Number(delta)),
        note: 'Confirmed stock update from inventory page',
      });

      const updatedQuantity = Math.max(0, Number(product.quantityInStock || 0) + delta);
      setProducts((currentProducts) => currentProducts.map((item) => {
        if (item.id !== product.id) {
          return item;
        }

        return {
          ...item,
          quantityInStock: updatedQuantity,
        };
      }));

      setPendingDeltas((current) => {
        const next = { ...current };
        delete next[product.id];
        return next;
      });

      setMessage('Stock movement recorded.');
      setMessageType('success');
    } catch (error) {
      setMessage(error.message || 'Unable to register movement.');
      setMessageType('error');
    }
  };

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return products.filter((product) => {
      const status = getProductStatus(product);
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      const matchesSearch =
        query.length === 0 ||
        String(product.name || '').toLowerCase().includes(query) ||
        String(product.sku || '').toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [products, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const summary = {
      total: products.length,
      inStock: 0,
      lowStock: 0,
      outOfStock: 0,
      totalValue: 0,
    };

    products.forEach((product) => {
      const status = getProductStatus(product);
      const qty = Number(product.quantityInStock || 0);
      const price = Number(product.unitPrice || 0);

      if (status === 'in-stock') summary.inStock += 1;
      if (status === 'low-stock') summary.lowStock += 1;
      if (status === 'out-of-stock') summary.outOfStock += 1;
      summary.totalValue += qty * price;
    });

    return summary;
  }, [products]);

  const formatCurrency = (value) => {
    return Number(value || 0).toLocaleString('en-US', {
      style: 'currency',
      currency: 'MAD',
      minimumFractionDigits: 2,
    });
  };

  const getStatusDotClass = (status) => {
    if (status === 'in-stock') return 'bg-green';
    if (status === 'low-stock') return 'bg-yellow';
    return 'bg-red';
  };

  return (
    <>
      <PageBackground />
      <Header isDashboard={true} />
      <main className="section section-shell dashboard-page">
        <section className="dashboard-head">
          <p className="eyebrow">Inventory</p>
          <h1>Manage product catalog and stock levels</h1>
          <div className="mt-4">
            <button
              type="button"
              className="btn btn-primary inline-flex items-center gap-2"
              onClick={() => setShowAddForm((current) => !current)}
            >
              <Plus size={16} />
              {showAddForm ? 'Close Add Item' : 'Add Item'}
            </button>
          </div>
        </section>

        {message ? <p className={`form-message ${messageType}`}>{message}</p> : null}
        {isLoading ? <p className="dashboard-state">Loading products...</p> : null}

        {!isLoading ? (
          <section className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Total Items</span>
                  <Package size={14} />
                </div>
                <p className="mt-3 text-3xl font-semibold text-slate-900">{stats.total}</p>
                <p className="mt-1 text-xs text-slate-500">Unique products</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>In Stock</span>
                  <TrendingUp size={14} className="text-emerald-500" />
                </div>
                <p className="mt-3 text-3xl font-semibold text-slate-900">{stats.inStock}</p>
                <p className="mt-1 text-xs text-slate-500">Available items</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Low Stock</span>
                  <AlertCircle size={14} className="text-amber-500" />
                </div>
                <p className="mt-3 text-3xl font-semibold text-slate-900">{stats.lowStock}</p>
                <p className="mt-1 text-xs text-slate-500">Need restock</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Out of Stock</span>
                  <TrendingDown size={14} className="text-rose-500" />
                </div>
                <p className="mt-3 text-3xl font-semibold text-slate-900">{stats.outOfStock}</p>
                <p className="mt-1 text-xs text-slate-500">Unavailable</p>
              </div>
            </div>

            {showAddForm ? (
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900 mb-4">Add Item</h3>
                <form className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3" onSubmit={handleCreateProduct}>
                  <label className="text-sm text-slate-700">SKU
                    <input
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                      value={productForm.sku}
                      onChange={(event) => setProductForm((current) => ({ ...current, sku: event.target.value }))}
                      required
                    />
                  </label>
                  <label className="text-sm text-slate-700">Name
                    <input
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                      value={productForm.name}
                      onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))}
                      required
                    />
                  </label>
                  <label className="text-sm text-slate-700">Description
                    <input
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                      value={productForm.description}
                      onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))}
                    />
                  </label>
                  <label className="text-sm text-slate-700">Unit price
                    <input
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                      type="number"
                      min="0"
                      step="0.01"
                      value={productForm.unitPrice}
                      onChange={(event) => setProductForm((current) => ({ ...current, unitPrice: event.target.value }))}
                      required
                    />
                  </label>
                  <label className="text-sm text-slate-700">Quantity in stock
                    <input
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                      type="number"
                      min="0"
                      step="1"
                      value={productForm.quantityInStock}
                      onChange={(event) => setProductForm((current) => ({ ...current, quantityInStock: event.target.value }))}
                      required
                    />
                  </label>
                  <label className="text-sm text-slate-700">Low stock threshold
                    <input
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                      type="number"
                      min="0"
                      step="1"
                      value={productForm.lowStockThreshold}
                      onChange={(event) => setProductForm((current) => ({ ...current, lowStockThreshold: event.target.value }))}
                      required
                    />
                  </label>
                  <div className="md:col-span-2 xl:col-span-3">
                    <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : 'Create item'}
                    </button>
                  </div>
                </form>
              </article>
            ) : null}

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">Inventory Management</h3>

              <div className="mt-4 flex flex-col md:flex-row gap-2">
                <select
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="all">All</option>
                  <option value="in-stock">In stock</option>
                  <option value="low-stock">Low stock</option>
                  <option value="out-of-stock">Out of stock</option>
                </select>

                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm"
                    placeholder="Search by name or SKU..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {filteredProducts.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                    No items found matching your criteria.
                  </div>
                ) : (
                  filteredProducts.map((product) => {
                    const pendingDelta = Number(pendingDeltas[product.id] || 0);
                    const quantity = Math.max(0, Number(product.quantityInStock || 0) + pendingDelta);
                    const lowThreshold = Number(product.lowStockThreshold || 0);
                    const unitPrice = Number(product.unitPrice || 0);
                    const status = getProductStatus({ ...product, quantityInStock: quantity });
                    const denominator = Math.max(quantity, lowThreshold * 4, 1);
                    const stockPercent = Math.min(100, (quantity / denominator) * 100);
                    const stockBarClass =
                      status === 'in-stock'
                        ? 'bg-green'
                        : status === 'low-stock'
                          ? 'bg-yellow'
                          : '';

                    return (
                      <div key={product.id} className="rounded-xl border border-slate-200 p-4">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h4 className="text-base font-semibold text-slate-900">{product.name}</h4>
                                <p className="text-xs text-slate-500">SKU: {product.sku || 'N/A'}</p>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs capitalize text-slate-700">
                                  <span className={cn('h-2.5 w-2.5 rounded-full ring-1 ring-black/5', getStatusDotClass(status))} />
                                  {status.replace(/-/g, ' ')}
                                </span>
                                <button className="btn btn-ghost" type="button" onClick={() => handleQuickToggleActive(product)}>
                                  {product.isActive ? 'Deactivate' : 'Activate'}
                                </button>
                              </div>
                            </div>

                            <div className="mt-2">
                              <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                                <span>Stock Level</span>
                                <span className="font-semibold text-slate-700">{quantity} / {denominator}</span>
                              </div>
                              {status !== 'out-of-stock' ? (
                                <div className="h-2 w-full rounded-full bg-slate-100">
                                  <div className={cn('h-2 rounded-full transition-all', stockBarClass)} style={{ width: `${stockPercent}%` }} />
                                </div>
                              ) : (
                                <div className="h-2" />
                              )}
                              <p className="mt-1 text-xs text-slate-500">Min: {lowThreshold}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 lg:flex-col lg:items-end">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                                onClick={() => handleQuickStockDelta(product, -1)}
                                disabled={quantity <= 0}
                              >
                                <Minus size={14} />
                              </button>
                              <div className="w-12 text-center text-sm font-semibold text-slate-800">{quantity}</div>
                              <button
                                type="button"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50"
                                onClick={() => handleQuickStockDelta(product, 1)}
                              >
                                <Plus size={14} />
                              </button>
                              {pendingDelta !== 0 ? (
                                <button
                                  type="button"
                                  className="btn btn-primary h-8 px-3 text-xs"
                                  onClick={() => handleConfirmStockDelta(product)}
                                >
                                  Confirm
                                </button>
                              ) : null}
                            </div>
                            <p className="text-sm font-semibold text-slate-900">{formatCurrency(quantity * unitPrice)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-5 border-t border-slate-200 pt-4 flex items-center justify-between">
                <span className="text-base font-semibold text-slate-800">Total Inventory Value</span>
                <span className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalValue)}</span>
              </div>
            </article>
          </section>
        ) : null}
      </main>
    </>
  );
}
