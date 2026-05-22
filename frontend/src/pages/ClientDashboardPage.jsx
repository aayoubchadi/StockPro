import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import PageBackground from '../components/PageBackground';
import { getSession, isAdminRole } from '../lib/authStore';
import { useLanguage } from '../lib/i18n';
import { getDashboardOverview } from '../services/platformApi';
import StockProDashboardStats from '../components/StockProDashboardStats';

function formatDate(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
}

function formatDisplayRole(role) {
  const normalizedRole = String(role || '').toLowerCase();
  return normalizedRole === 'employee' ? 'employee' : 'admin';
}

function toProductMapEntry(product) {
  return {
    id: product?.id,
    sku: product?.sku || '-',
    name: product?.name || 'Unknown product',
    salesCount: Number(product?.salesCount || 0),
    quantityInStock: Number(product?.quantityInStock || 0),
  };
}

export default function ClientDashboardPage() {
  const { t } = useLanguage();
  const [session, setSession] = useState(null);
  const [overview, setOverview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const activeSession = getSession();

    if (!activeSession) {
      navigate('/login');
      return;
    }

    if (isAdminRole(activeSession.role)) {
      navigate('/admin-dashboard');
      return;
    }

    setSession(activeSession);

    let isActive = true;

    const loadOverview = async () => {
      setIsLoading(true);

      try {
        const dashboardOverview = await getDashboardOverview({
          accessToken: activeSession.accessToken,
        });

        if (!isActive) {
          return;
        }

        setOverview(dashboardOverview);
        setErrorMessage('');
      } catch (error) {
        if (!isActive) {
          return;
        }

        setErrorMessage(error.message || 'Unable to load dashboard data.');
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadOverview();

    return () => {
      isActive = false;
    };
  }, [navigate]);

  const userName = session?.fullName || session?.user?.fullName || 'Employee';
  const userRole = formatDisplayRole(session?.role || session?.user?.role || 'employee');
  const metrics = overview?.metrics || {};
  const bestSellingProducts = Array.isArray(overview?.bestSellingProducts)
    ? overview.bestSellingProducts.map(toProductMapEntry)
    : [];
  const worstSellingProducts = Array.isArray(overview?.worstSellingProducts)
    ? overview.worstSellingProducts.map(toProductMapEntry)
    : [];
  const lowStockProducts = Array.isArray(overview?.lowStockProducts)
    ? overview.lowStockProducts
    : [];

  return (
    <>
      <PageBackground />
      <Header isDashboard={true} />
      <main className="section section-shell dashboard-page">
        <section className="dashboard-head">
          <p className="eyebrow">{t('dashboard.client.eyebrow')}</p>
          <h1>{t('dashboard.common.greeting')} <span>{userName}</span></h1>
          <p>
            {t('dashboard.common.role')}: <strong>{userRole}</strong>
          </p>
          {overview?.company ? (
            <p>
              Company: <strong>{overview.company.name}</strong>
            </p>
          ) : null}
        </section>

        {isLoading ? <p className="dashboard-state">Loading dashboard metrics...</p> : null}
        {!isLoading && errorMessage ? <p className="form-message error">{errorMessage}</p> : null}

        {!isLoading && !errorMessage && overview ? (
          <>
            <section className="dashboard-grid dashboard-grid-client">
              <article className="dashboard-box"><h3>Low stock products</h3><p>{metrics.lowStockProducts || 0}</p></article>
              <article className="dashboard-box"><h3>Total products</h3><p>{metrics.totalProducts || 0}</p></article>
            </section>

            <section className="dashboard-grid dashboard-grid-split">
              <article className="dashboard-box dashboard-list-box">
                <h3>Best Selling Products</h3>
                <ul className="dashboard-list">
                  {bestSellingProducts.map((product) => (
                    <li key={product.id}>
                      <strong>{product.name} ({product.sku})</strong>
                      <span>{product.salesCount || 0} units sold</span>
                    </li>
                  ))}
                </ul>
              </article>

              <article className="dashboard-box dashboard-list-box">
                <h3>Worst Selling Products</h3>
                <ul className="dashboard-list">
                  {worstSellingProducts.map((product) => (
                    <li key={product.id}>
                      <strong>{product.name} ({product.sku})</strong>
                      <span>{product.salesCount || 0} units sold • Low demand</span>
                    </li>
                  ))}
                </ul>
              </article>
            </section>

            <section className="dashboard-grid">
              <article className="dashboard-box dashboard-list-box">
                <h3>Products Needing Reorder (Low Stock)</h3>
                <ul className="dashboard-list">
                  {lowStockProducts.map((product) => (
                    <li key={product.id} style={{ cursor: 'pointer' }} onClick={() => navigate('/inventory')}>
                      <strong>{product.name} ({product.sku})</strong>
                      <span>{product.quantityInStock || 0} units in stock • Reorder needed</span>
                    </li>
                  ))}
                </ul>
              </article>
            </section>
          </>
        ) : null}
      </main>
    </>
  );
}
