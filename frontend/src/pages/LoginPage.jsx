import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import PageBackground from '../components/PageBackground';
import {
  getDashboardPathForRole,
  saveSession,
} from '../lib/authStore';
import { googleLoginRequest, loginRequest } from '../services/authApi';
import { useLanguage } from '../lib/i18n';

export default function LoginPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isGoogleReady, setIsGoogleReady] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const googleButtonRef = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const completeLogin = useCallback(
    (data, fallbackEmail) => {
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

  const handleGoogleCredential = useCallback(
    async (googleResponse) => {
      if (!googleResponse?.credential) {
        setMessage('Google login failed. Missing credential.');
        setMessageType('error');
        return;
      }

      setIsGoogleSubmitting(true);
      setIsSubmitting(false);
      setMessage('');
      setMessageType('');

      try {
        const data = await googleLoginRequest({
          idToken: googleResponse.credential,
        });

        completeLogin(data, data?.user?.email || '');
      } catch (error) {
        setMessage(error.message || 'Google login failed');
        setMessageType('error');
      } finally {
        setIsGoogleSubmitting(false);
      }
    },
    [completeLogin]
  );

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) {
      return undefined;
    }

    let isActive = true;

    const initializeGoogle = () => {
      if (!window.google?.accounts?.id || !googleButtonRef.current || !isActive) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredential,
      });

      googleButtonRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: 'standard',
        theme: 'outline',
        text: 'signin_with',
        shape: 'pill',
        size: 'large',
        width: Math.max(220, Math.round(googleButtonRef.current.clientWidth || 320)),
      });

      setIsGoogleReady(true);
    };

    if (window.google?.accounts?.id) {
      initializeGoogle();
      return () => {
        isActive = false;
      };
    }

    const existingScript = document.getElementById('google-identity-services');

    if (existingScript) {
      existingScript.addEventListener('load', initializeGoogle, { once: true });
      return () => {
        isActive = false;
      };
    }

    const script = document.createElement('script');
    script.id = 'google-identity-services';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogle;
    script.onerror = () => {
      if (!isActive) {
        return;
      }

      setMessage('Google sign-in script failed to load.');
      setMessageType('error');
    };

    document.head.appendChild(script);

    return () => {
      isActive = false;
    };
  }, [googleClientId, handleGoogleCredential]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    setIsSubmitting(true);
    setMessage('');
    setMessageType('');

    try {
      const data = await loginRequest({
        email: normalizedEmail,
        password,
      });

      completeLogin(data, normalizedEmail);
    } catch (error) {
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
              {t('auth.login.email')}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.placeholders.email')}
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

            <div className="auth-social-divider" aria-hidden="true">
              <span>or</span>
            </div>

            {googleClientId ? (
              <div className="google-login-wrap" aria-busy={isGoogleSubmitting}>
                <div ref={googleButtonRef} className="google-login-button" />
                {!isGoogleReady && <small>Loading Google sign-in...</small>}
              </div>
            ) : (
              <small className="auth-google-missing">
                Set VITE_GOOGLE_CLIENT_ID to enable Google sign-in.
              </small>
            )}
          </form>

          <p className={`form-message ${messageType}`} aria-live="polite">
            {message}
          </p>

          <div className="auth-links">
            <a href="/forgot-password">{t('auth.login.forgot')}</a>
            <a href="/create-account">{t('auth.login.createAccount')}</a>
          </div>
        </section>
      </main>
    </>
  );
}
