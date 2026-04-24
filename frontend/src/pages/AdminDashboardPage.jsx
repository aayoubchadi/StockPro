import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import PageBackground from '../components/PageBackground';
import { getSession, isAdminRole } from '../lib/authStore';
import { useLanguage } from '../lib/i18n';
import { getDashboardOverview } from '../services/platformApi';

function formatCurrency(amount, currencyCode = 'EUR') {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format((Number(amount) || 0) / 100);
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
}

export default function AdminDashboardPage() {
  const { t } = useLanguage();
  const [session, setSession] = useState(null);
  const [overview, setOverview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const userDisplayName = useMemo(() => session?.fullName || session?.user?.fullName || 'Admin', [session]);
  const userEmail = useMemo(() => session?.email || session?.user?.email || '-', [session]);
  const userRole = useMemo(() => session?.role || session?.user?.role || 'company_admin', [session]);

  useEffect(() => {
    const activeSession = getSession();

    if (!activeSession) {
      navigate('/login');
      return;
    }

    if (!isAdminRole(activeSession.role)) {
      navigate('/client-dashboard');
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

        setErrorMessage(error.message || 'Unable to load dashboard metrics.');
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

  const isPlatformScope = overview?.scope === 'platform';
  const tenantMetrics = overview?.metrics || {};
  const platformMetrics = overview?.metrics || {};

  return (
    <>
      <PageBackground />
      <Header isDashboard={true} />
      <main className="section section-shell dashboard-page">
        <section className="dashboard-head">
          <p className="eyebrow">{t('dashboard.admin.eyebrow')}</p>
          <h1>{t('dashboard.common.greeting')} <span>{userDisplayName}</span></h1>
          <p>
            {t('dashboard.common.account')}: <strong>{userEmail}</strong> | {t('dashboard.common.role')}: <strong>{userRole}</strong>
          </p>
          {overview?.scope === 'tenant' && overview?.company ? (
            <p>
              Company: <strong>{overview.company.name}</strong> ({overview.company.slug})
            </p>
          ) : null}
        </section>

        {isLoading ? <p className="dashboard-state">Loading dashboard metrics...</p> : null}
        {!isLoading && errorMessage ? <p className="form-message error">{errorMessage}</p> : null}

        {!isLoading && !errorMessage && overview ? (
          <>
            {isPlatformScope ? (
              <>
                <section className="dashboard-grid dashboard-grid-admin">
                  <article className="dashboard-box"><h3>Total companies</h3><p>{platformMetrics.totalCompanies || 0}</p></article>
                  <article className="dashboard-box"><h3>Active companies</h3><p>{platformMetrics.activeCompanies || 0}</p></article>
                  <article className="dashboard-box"><h3>Active users</h3><p>{platformMetrics.activeUsers || 0}</p></article>
                  <article className="dashboard-box"><h3>MRR</h3><p>{formatCurrency(platformMetrics.monthlyRecurringRevenueCents || 0, 'EUR')}</p></article>
                </section>

                <section className="dashboard-grid dashboard-grid-split">
                  <article className="dashboard-box dashboard-list-box">
                    <h3>Recently created companies</h3>
                    <ul className="dashboard-list">
                      {(overview.recentCompanies || []).map((company) => (
                        <li key={company.id}>
                          <strong>{company.name}</strong>
                          <span>{company.plan?.name} • {company.activeEmployees} active employees • {formatDate(company.createdAt)}</span>
                        </li>
                      ))}
                    </ul>
                  </article>

                  <article className="dashboard-box dashboard-list-box">
                    <h3>Plan distribution</h3>
                    <ul className="dashboard-list">
                      {(overview.planDistribution || []).map((plan) => (
                        <li key={plan.code}>
                          <strong>{plan.name}</strong>
                          <span>{plan.companiesCount} companies • {formatCurrency(plan.monthlyRevenueCents || 0, 'EUR')} MRR</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                </section>
              </>
            ) : (
              <>
                <section className="dashboard-grid dashboard-grid-admin">
                  <article className="dashboard-box"><h3>Active employees</h3><p>{tenantMetrics.activeEmployees || 0} / {overview.plan?.maxEmployees || 0}</p></article>
                  <article className="dashboard-box"><h3>Capacity used</h3><p>{tenantMetrics.employeeCapacityUsedPercent || 0}%</p></article>
                  <article className="dashboard-box"><h3>Active products</h3><p>{tenantMetrics.activeProducts || 0}</p></article>
                  <article className="dashboard-box"><h3>Stock value</h3><p>{new Intl.NumberFormat(undefined, { style: 'currency', currency: overview.plan?.currencyCode || 'EUR', maximumFractionDigits: 0 }).format(tenantMetrics.stockValue || 0)}</p></article>
                </section>

                <section className="dashboard-grid dashboard-grid-split">
                  <article className="dashboard-box dashboard-list-box">
                    <h3>Low stock alerts</h3>
                    <ul className="dashboard-list">
                      {(overview.lowStockProducts || []).map((product) => (
                        <li key={product.id}>
                          <strong>{product.name} ({product.sku})</strong>
                          <span>{product.quantityInStock} in stock • threshold {product.lowStockThreshold}</span>
                        </li>
                      ))}
                    </ul>
                  </article>

                  <article className="dashboard-box dashboard-list-box">
                    <h3>Recent stock movements</h3>
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
            )}
          </>
        ) : null}
      </main>
    </>
  );
}
