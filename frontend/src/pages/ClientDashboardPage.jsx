import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import PageBackground from '../components/PageBackground';
import { getSession, isAdminRole } from '../lib/authStore';
import { useLanguage } from '../lib/i18n';

export default function ClientDashboardPage() {
  const { t } = useLanguage();
  const [userName, setUserName] = useState('Client');
  const [userEmail, setUserEmail] = useState('-');
  const [userRole, setUserRole] = useState('client');
  const navigate = useNavigate();

  useEffect(() => {
    const session = getSession();
    if (!session) {
      navigate('/login');
      return;
    }

    if (isAdminRole(session.role)) {
      navigate('/admin-dashboard');
      return;
    }

    setUserName(session.fullName);
    setUserEmail(session.email);
    setUserRole(session.role);
  }, [navigate]);

  return (
    <>
      <PageBackground />
      <Header isDashboard={true} />
      <main className="section section-shell">
        <section className="dashboard-head">
          <p className="eyebrow">{t('dashboard.client.eyebrow')}</p>
          <h1>{t('dashboard.common.greeting')} <span>{userName}</span></h1>
          <p>
            {t('dashboard.common.account')}: <strong>{userEmail}</strong> | {t('dashboard.common.role')}: <strong>{userRole}</strong>
          </p>
        </section>

        <section className="dashboard-grid">
          <article className="dashboard-box">
            <h3>{t('dashboard.client.ordersTitle')}</h3>
            <p>{t('dashboard.client.ordersText')}</p>
          </article>
          <article className="dashboard-box">
            <h3>{t('dashboard.client.deliveriesTitle')}</h3>
            <p>{t('dashboard.client.deliveriesText')}</p>
          </article>
          <article className="dashboard-box">
            <h3>{t('dashboard.client.ticketsTitle')}</h3>
            <p>{t('dashboard.client.ticketsText')}</p>
          </article>
        </section>
      </main>
    </>
  );
}
