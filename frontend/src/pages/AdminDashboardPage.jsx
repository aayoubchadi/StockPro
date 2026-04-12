import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import PageBackground from '../components/PageBackground';
import { getSession, isAdminRole } from '../lib/authStore';
import { useLanguage } from '../lib/i18n';

export default function AdminDashboardPage() {
  const { t } = useLanguage();
  const [userName, setUserName] = useState('Admin');
  const [userEmail, setUserEmail] = useState('-');
  const [userRole, setUserRole] = useState('admin');
  const navigate = useNavigate();

  useEffect(() => {
    const session = getSession();
    if (!session) {
      navigate('/login');
      return;
    }

    if (!isAdminRole(session.role)) {
      navigate('/client-dashboard');
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
          <p className="eyebrow">{t('dashboard.admin.eyebrow')}</p>
          <h1>{t('dashboard.common.greeting')} <span>{userName}</span></h1>
          <p>
            {t('dashboard.common.account')}: <strong>{userEmail}</strong> | {t('dashboard.common.role')}: <strong>{userRole}</strong>
          </p>
        </section>

        <section className="dashboard-grid">
          <article className="dashboard-box">
            <h3>{t('dashboard.admin.usersTitle')}</h3>
            <p>{t('dashboard.admin.usersText')}</p>
          </article>
          <article className="dashboard-box">
            <h3>{t('dashboard.admin.productsTitle')}</h3>
            <p>{t('dashboard.admin.productsText')}</p>
          </article>
          <article className="dashboard-box">
            <h3>{t('dashboard.admin.alertsTitle')}</h3>
            <p>{t('dashboard.admin.alertsText')}</p>
          </article>
          <article className="dashboard-box">
            <h3>{t('dashboard.admin.revenueTitle')}</h3>
            <p>{t('dashboard.admin.revenueText')}</p>
          </article>
        </section>
      </main>
    </>
  );
}
