import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import PageBackground from '../components/PageBackground';
import { getAccounts, saveAccounts, ensureSeedAccount } from '../lib/authStore';
import { useLanguage } from '../lib/i18n';

export default function CreateAccountPage() {
  const { t } = useLanguage();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    ensureSeedAccount();

    if (password.length < 6) {
      setMessage(t('auth.createAccount.passwordMin'));
      setMessageType('error');
      return;
    }

    if (password !== confirmPassword) {
      setMessage(t('auth.createAccount.passwordMismatch'));
      setMessageType('error');
      return;
    }

    const accounts = getAccounts();
    const emailLower = email.trim().toLowerCase();

    if (accounts[emailLower]) {
      setMessage(t('auth.createAccount.emailExists'));
      setMessageType('error');
      return;
    }

    accounts[emailLower] = { fullName, password, role: 'client' };
    saveAccounts(accounts);
    setMessage(t('auth.createAccount.success'));
    setMessageType('success');
    setTimeout(() => {
      navigate(`/login?email=${encodeURIComponent(emailLower)}`);
    }, 900);
  };

  return (
    <>
      <PageBackground />
      <Header showNav={false} />
      <main className="section section-shell auth-main">
        <section className="auth-wrap">
          <p className="eyebrow">{t('auth.createAccount.eyebrow')}</p>
          <h1>{t('auth.createAccount.title')}</h1>
          <p>{t('auth.createAccount.subtitle')}</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              {t('auth.createAccount.fullName')}
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t('auth.placeholders.fullName')}
                required
              />
            </label>

            <label>
              {t('auth.createAccount.email')}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.placeholders.email')}
                required
              />
            </label>

            <label>
              {t('auth.createAccount.password')}
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.placeholders.passwordMin')}
                required
              />
            </label>

            <label>
              {t('auth.createAccount.confirmPassword')}
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('auth.placeholders.retypePassword')}
                required
              />
            </label>

            <button type="submit" className="btn btn-primary">{t('auth.createAccount.submit')}</button>
          </form>

          <p className={`form-message ${messageType}`} aria-live="polite">
            {message}
          </p>

          <div className="auth-links">
            <a href="/login">{t('auth.createAccount.hasAccount')}</a>
            <a href="/forgot-password">{t('auth.createAccount.forgot')}</a>
          </div>
        </section>
      </main>
    </>
  );
}
