import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import PageBackground from '../components/PageBackground';
import { getAccounts, saveAccounts, ensureSeedAccount } from '../lib/authStore';
import { useLanguage } from '../lib/i18n';

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    ensureSeedAccount();

    if (newPassword.length < 6) {
      setMessage(t('auth.forgotPassword.passwordMin'));
      setMessageType('error');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setMessage(t('auth.forgotPassword.passwordMismatch'));
      setMessageType('error');
      return;
    }

    const accounts = getAccounts();
    const emailLower = email.trim().toLowerCase();

    if (!accounts[emailLower]) {
      setMessage(t('auth.forgotPassword.noAccount'));
      setMessageType('error');
      return;
    }

    accounts[emailLower].password = newPassword;
    saveAccounts(accounts);
    setMessage(t('auth.forgotPassword.success'));
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
          <p className="eyebrow">{t('auth.forgotPassword.eyebrow')}</p>
          <h1>{t('auth.forgotPassword.title')}</h1>
          <p className="auth-hint">{t('auth.forgotPassword.hint')}</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              {t('auth.forgotPassword.email')}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.placeholders.email')}
                required
              />
            </label>

            <label>
              {t('auth.forgotPassword.newPassword')}
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('auth.placeholders.passwordMin')}
                required
              />
            </label>

            <label>
              {t('auth.forgotPassword.confirmPassword')}
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder={t('auth.placeholders.retypePassword')}
                required
              />
            </label>

            <button type="submit" className="btn btn-primary">{t('auth.forgotPassword.submit')}</button>
          </form>

          <p className={`form-message ${messageType}`} aria-live="polite">
            {message}
          </p>

          <div className="auth-links">
            <a href="/login">{t('auth.forgotPassword.backToLogin')}</a>
            <a href="/create-account">{t('auth.forgotPassword.createAccount')}</a>
          </div>
        </section>
      </main>
    </>
  );
}
