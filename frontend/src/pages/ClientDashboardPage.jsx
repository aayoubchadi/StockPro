import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import PageBackground from '../components/PageBackground';
import { getSession, isAdminRole } from '../lib/authStore';
import { useLanguage } from '../lib/i18n';
import { getDashboardOverview } from '../services/platformApi';

function formatDate(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
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
  const userEmail = session?.email || session?.user?.email || '-';
  const userRole = session?.role || session?.user?.role || 'employee';
  const metrics = overview?.metrics || {};

  return (
    <>
      <PageBackground />
      <Header isDashboard={true} />
      <main className="section section-shell dashboard-page">
        <section className="dashboard-head">
          <p className="eyebrow">{t('dashboard.client.eyebrow')}</p>
          <h1>{t('dashboard.common.greeting')} <span>{userName}</span></h1>
          <p>
            {t('dashboard.common.account')}: <strong>{userEmail}</strong> | {t('dashboard.common.role')}: <strong>{userRole}</strong>
          </p>
          {overview?.company ? (
            <p>
              Company: <strong>{overview.company.name}</strong> ({overview.company.slug})
            </p>
          ) : null}
        </section>

        {isLoading ? <p className="dashboard-state">Loading dashboard metrics...</p> : null}
        {!isLoading && errorMessage ? <p className="form-message error">{errorMessage}</p> : null}

        {!isLoading && !errorMessage && overview ? (
          <>
            <section className="dashboard-grid dashboard-grid-client">
              <article className="dashboard-box"><h3>Stock units</h3><p>{metrics.stockUnits || 0}</p></article>
              <article className="dashboard-box"><h3>Low stock products</h3><p>{metrics.lowStockProducts || 0}</p></article>
              <article className="dashboard-box"><h3>Inbound (30d)</h3><p>{metrics.movementIn30d || 0}</p></article>
              <article className="dashboard-box"><h3>Outbound (30d)</h3><p>{metrics.movementOut30d || 0}</p></article>
            </section>

            <section className="dashboard-grid dashboard-grid-split">
              <article className="dashboard-box dashboard-list-box">
                <h3>Top inventory by value</h3>
                <ul className="dashboard-list">
                  {(overview.topProducts || []).map((product) => (
                    <li key={product.id}>
                      <strong>{product.name} ({product.sku})</strong>
                      <span>{product.quantityInStock} units in stock</span>
                    </li>
                  ))}
                </ul>
              </article>

              <article className="dashboard-box dashboard-list-box">
                <h3>Recent movements</h3>
                <ul className="dashboard-list">
                  {(overview.recentMovements || []).map((movement) => (
                    <li key={movement.id}>
                      <strong>{movement.productName} • {movement.movementType}</strong>
                      <span>{movement.quantity} units • {formatDate(movement.createdAt)} • by {movement.movedByName}</span>
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
