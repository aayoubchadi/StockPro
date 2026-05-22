import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import PageBackground from '../components/PageBackground';
import {
  getDashboardPathForRole,
  saveSession,
} from '../lib/authStore';
import { loginRequest } from '../services/authApi';
import { useLanguage } from '../lib/i18n';

export default function LoginPage() {
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const completeLogin = useCallback(
    (data, fallbackEmail) => {
      // If account is deactivated, show inline disabled message
      if (data.user?.isActive === false) {
        setMessage('Your account has been disabled. Please contact your workspace administrator.');
        setMessageType('error');
        return;
      }

      saveSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenType: data.tokenType,
        expiresIn: data.expiresIn,
        refreshExpiresIn: data.refreshExpiresIn,
        user: data.user,
        email: data.user?.email || fallbackEmail,
        fullName: data.user?.fullName || 'Utilisateur',
        role: data.user?.role || 'employee',
        scope: data.user?.scope || 'tenant',
        companyId: data.user?.companyId || null,
        permissions: data.user?.permissions || {},
        effectivePermissions: data.user?.effectivePermissions || {},
        company: data.user?.company || null,
        plan: data.user?.plan || null,
      });

      const role = data.user?.role || 'employee';

      setMessage(t('auth.login.success'));
      setMessageType('success');
      setTimeout(() => {
        navigate(getDashboardPathForRole(role));
      }, 700);
    },
    [navigate, t]
  );

  useEffect(() => {
    const usernameParam = searchParams.get('username');
    if (usernameParam) {
      setUsername(usernameParam);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const normalizedUsername = username.trim().toLowerCase();
    setIsSubmitting(true);
    setMessage('');
    setMessageType('');

    try {
      const data = await loginRequest({
        username: normalizedUsername,
        password,
      });

      completeLogin(data, normalizedUsername);
    } catch (error) {
      const msg = String(error?.message || '').toLowerCase();
      if (msg.includes('disabled')) {
        setMessage('Your account has been disabled. Please contact your workspace administrator.');
        setMessageType('error');
        return;
      }

      if (msg.includes('pending')) {
        setMessage('Your account access request is pending approval.');
        setMessageType('error');
        return;
      }

      setMessage(error.message || t('auth.login.invalidCredentials'));
      setMessageType('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageBackground />
      <Header showNav={false} />
      <main className="section section-shell auth-main">
        <section className="auth-wrap">
          <p className="eyebrow">{t('auth.login.eyebrow')}</p>
          <h1>{t('auth.login.title')}</h1>
          <p>{t('auth.login.subtitle')}</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              {t('auth.login.username')}
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('auth.placeholders.username')}
                required
              />
            </label>

            <label>
              {t('auth.login.password')}
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.placeholders.passwordDots')}
                required
              />
            </label>

            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? t('auth.login.submitting') : t('auth.login.submit')}
            </button>
          </form>

          <p className={`form-message ${messageType}`} aria-live="polite">
            {message}
          </p>

          <div className="auth-links">
            <a href="/forgot-password">{t('auth.login.forgot')}</a>
            <a href="/signup-pricing">{t('auth.login.createAccount')}</a>
          </div>
        </section>
      </main>
    </>
  );
}
