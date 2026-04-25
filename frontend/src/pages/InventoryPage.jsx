import { useEffect, useState } from 'react';
import Header from '../components/Header';
import PageBackground from '../components/PageBackground';
import { getSession } from '../lib/authStore';
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
  const [productForm, setProductForm] = useState({
    sku: '',
    name: '',
    description: '',
    unitPrice: '0',
    quantityInStock: '0',
    lowStockThreshold: '5',
  });
  const [movementForm, setMovementForm] = useState({
    productId: '',
    movementType: 'in',
    quantity: '1',
    note: '',
    adjustmentMode: 'increase',
  });

  const accessToken = session?.accessToken;

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

  const handleStockMovement = async (event) => {
    event.preventDefault();

    if (!accessToken || !movementForm.productId) {
      return;
    }

    try {
      await moveCompanyProductStock({
        accessToken,
        productId: movementForm.productId,
        movementType: movementForm.movementType,
        quantity: Number(movementForm.quantity),
        note: movementForm.note,
        adjustmentMode: movementForm.adjustmentMode,
      });

      setMovementForm((current) => ({
        ...current,
        quantity: '1',
        note: '',
      }));

      setMessage('Stock movement recorded.');
      setMessageType('success');
      await loadProducts();
    } catch (error) {
      setMessage(error.message || 'Unable to register movement.');
      setMessageType('error');
    }
  };

  return (
    <>
      <PageBackground />
      <Header isDashboard={true} />
      <main className="section section-shell dashboard-page">
        <section className="dashboard-head">
          <p className="eyebrow">Inventory</p>
          <h1>Manage product catalog and stock levels</h1>
        </section>

        {message ? <p className={`form-message ${messageType}`}>{message}</p> : null}
        {isLoading ? <p className="dashboard-state">Loading products...</p> : null}

        {!isLoading ? (
          <section className="dashboard-grid dashboard-grid-split">
            <article className="dashboard-box dashboard-list-box">
              <h3>Create product</h3>
              <form className="checkout-form" onSubmit={handleCreateProduct}>
                <label>SKU
                  <input value={productForm.sku} onChange={(event) => setProductForm((current) => ({ ...current, sku: event.target.value }))} required />
                </label>
                <label>Name
                  <input value={productForm.name} onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))} required />
                </label>
                <label>Description
                  <input value={productForm.description} onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))} />
                </label>
                <label>Unit price
                  <input type="number" min="0" step="0.01" value={productForm.unitPrice} onChange={(event) => setProductForm((current) => ({ ...current, unitPrice: event.target.value }))} required />
                </label>
                <label>Quantity in stock
                  <input type="number" min="0" step="1" value={productForm.quantityInStock} onChange={(event) => setProductForm((current) => ({ ...current, quantityInStock: event.target.value }))} required />
                </label>
                <label>Low stock threshold
                  <input type="number" min="0" step="1" value={productForm.lowStockThreshold} onChange={(event) => setProductForm((current) => ({ ...current, lowStockThreshold: event.target.value }))} required />
                </label>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Create product'}
                </button>
              </form>
            </article>

            <article className="dashboard-box dashboard-list-box">
              <h3>Stock movement</h3>
              <form className="checkout-form" onSubmit={handleStockMovement}>
                <label>Product
                  <select
                    value={movementForm.productId}
                    onChange={(event) => setMovementForm((current) => ({ ...current, productId: event.target.value }))}
                    required
                  >
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>{product.name} ({product.sku})</option>
                    ))}
                  </select>
                </label>
                <label>Movement type
                  <select
                    value={movementForm.movementType}
                    onChange={(event) => setMovementForm((current) => ({ ...current, movementType: event.target.value }))}
                  >
                    <option value="in">In</option>
                    <option value="out">Out</option>
                    <option value="adjustment">Adjustment</option>
                  </select>
                </label>
                {movementForm.movementType === 'adjustment' ? (
                  <label>Adjustment mode
                    <select
                      value={movementForm.adjustmentMode}
                      onChange={(event) => setMovementForm((current) => ({ ...current, adjustmentMode: event.target.value }))}
                    >
                      <option value="increase">Increase</option>
                      <option value="decrease">Decrease</option>
                    </select>
                  </label>
                ) : null}
                <label>Quantity
                  <input type="number" min="1" step="1" value={movementForm.quantity} onChange={(event) => setMovementForm((current) => ({ ...current, quantity: event.target.value }))} required />
                </label>
                <label>Note
                  <input value={movementForm.note} onChange={(event) => setMovementForm((current) => ({ ...current, note: event.target.value }))} />
                </label>
                <button type="submit" className="btn btn-secondary">Apply movement</button>
              </form>

              <h3 style={{ marginTop: '24px' }}>Products</h3>
              <ul className="dashboard-list">
                {products.map((product) => (
                  <li key={product.id}>
                    <strong>{product.name} ({product.sku})</strong>
                    <span>{product.quantityInStock} in stock | threshold {product.lowStockThreshold} | {product.isActive ? 'Active' : 'Inactive'}</span>
                    <button className="btn btn-ghost" type="button" onClick={() => handleQuickToggleActive(product)}>
                      {product.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </li>
                ))}
              </ul>
            </article>
          </section>
        ) : null}
      </main>
    </>
  );
}
