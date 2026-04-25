import { Link } from 'react-router-dom';
import Header from '../components/Header';
import PageBackground from '../components/PageBackground';
import { useLanguage } from '../lib/i18n';

export default function CreateAccountPage() {
  const { t } = useLanguage();

  return (
    <>
      <PageBackground />
      <Header showNav={false} />
      <main className="section section-shell auth-main">
        <section className="auth-wrap">
          <p className="eyebrow">{t('auth.createAccount.eyebrow')}</p>
          <h1>Account onboarding is admin-controlled</h1>
          <p>
            Employee self-signup is disabled. Company admins create employee accounts
            and assign privileges directly from the workspace.
          </p>

          <div className="auth-links" style={{ marginTop: '20px' }}>
            <Link to="/demo-onboarding" className="btn btn-primary">Start free demo</Link>
            <Link to="/company-admin-checkout" className="btn btn-secondary">Create company admin</Link>
          </div>

          <div className="auth-links" style={{ marginTop: '16px' }}>
            <a href="/login">{t('auth.createAccount.hasAccount')}</a>
          </div>
        </section>
      </main>
    </>
  );
}
