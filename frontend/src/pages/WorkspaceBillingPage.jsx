import { useEffect, useState } from 'react';
import Header from '../components/Header';
import PageBackground from '../components/PageBackground';
import { getSession } from '../lib/authStore';
import { getCompanyContext } from '../services/companyApi';

function formatCurrency(amountCents, currencyCode = 'EUR') {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format((Number(amountCents || 0) || 0) / 100);
}

export default function WorkspaceBillingPage() {
  const [session] = useState(() => getSession());
  const [context, setContext] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');

  const accessToken = session?.accessToken;

  useEffect(() => {
    const loadContext = async () => {
      if (!accessToken) {
        return;
      }

      setIsLoading(true);
      try {
        const data = await getCompanyContext({ accessToken });
        setContext(data);
        setMessage('');
      } catch (error) {
        setMessage(error.message || 'Unable to load billing workspace.');
      } finally {
        setIsLoading(false);
      }
    };

    loadContext();
  }, [accessToken]);

  return (
    <>
      <PageBackground />
      <Header isDashboard={true} />
      <main className="section section-shell dashboard-page">
        <section className="dashboard-head">
          <p className="eyebrow">Billing</p>
          <h1>Subscription and plan capacity</h1>
        </section>

        {isLoading ? <p className="dashboard-state">Loading billing data...</p> : null}
        {!isLoading && message ? <p className="form-message error">{message}</p> : null}

        {!isLoading && context ? (
          <section className="dashboard-grid dashboard-grid-admin">
            <article className="dashboard-box">
              <h3>Plan</h3>
              <p>{context.plan?.name || '-'}</p>
            </article>
            <article className="dashboard-box">
              <h3>Monthly price</h3>
              <p>{formatCurrency(context.plan?.monthlyPriceCents, context.plan?.currencyCode)}</p>
            </article>
            <article className="dashboard-box">
              <h3>Employee capacity</h3>
              <p>{context.capacity?.activeEmployees || 0} / {context.capacity?.maxEmployees || 0}</p>
            </article>
            <article className="dashboard-box">
              <h3>Export access</h3>
              <p>{context.plan?.canExportReports ? 'Enabled' : 'Not included'}</p>
            </article>
          </section>
        ) : null}
      </main>
    </>
  );
}
