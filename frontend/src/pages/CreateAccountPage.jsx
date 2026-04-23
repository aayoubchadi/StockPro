import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import PageBackground from '../components/PageBackground';
import { saveSession } from '../lib/authStore';
import { loginRequest, registerGoogleRequest, registerRequest } from '../services/authApi';
import { useLanguage } from '../lib/i18n';

const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/;

function validatePasswordForSignup(password, email) {
  const errors = [];
  const value = String(password || '');
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const emailLocalPart = normalizedEmail.includes('@')
    ? normalizedEmail.split('@')[0]
    : normalizedEmail;

  if (value.length < 12) {
    errors.push('minimum length is 12');
  }

  if (value.length > 72) {
    errors.push('maximum length is 72');
  }

  if (!/[A-Z]/.test(value)) {
    errors.push('must include at least one uppercase letter');
  }

  if (!/[a-z]/.test(value)) {
    errors.push('must include at least one lowercase letter');
  }

  if (!/[0-9]/.test(value)) {
    errors.push('must include at least one digit');
  }

  if (!SPECIAL_CHAR_REGEX.test(value)) {
    errors.push('must include at least one special character');
  }

  if (/\s/.test(value)) {
    errors.push('must not include spaces');
  }

  if (emailLocalPart && value.toLowerCase().includes(emailLocalPart)) {
    errors.push('must not contain the email name');
  }

  return errors;
}

export default function CreateAccountPage() {
  const { t } = useLanguage();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isGoogleReady, setIsGoogleReady] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const googleButtonRef = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const completeAuth = useCallback((data, fallbackEmail, fallbackName) => {
    saveSession({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      tokenType: data.tokenType,
      expiresIn: data.expiresIn,
      refreshExpiresIn: data.refreshExpiresIn,
      user: data.user,
      email: data.user?.email || fallbackEmail,
      fullName: data.user?.fullName || fallbackName || 'Utilisateur',
      role: data.user?.role || 'employee',
      scope: data.user?.scope || 'tenant',
      companyId: data.user?.companyId || null,
    });

    setMessage(t('auth.createAccount.success'));
    setMessageType('success');
    setTimeout(() => {
      const redirectTarget = searchParams.get('redirect');
      navigate(redirectTarget === 'pricing' ? '/#pricing' : '/');
    }, 900);
  }, [navigate, searchParams, t]);

  const handleGoogleCredential = useCallback(async (googleResponse) => {
    if (!googleResponse?.credential) {
      setMessage('Google sign-up failed. Missing credential.');
      setMessageType('error');
      return;
    }

    setIsGoogleSubmitting(true);
    setIsSubmitting(false);
    setMessage('');
    setMessageType('');

    try {
      const data = await registerGoogleRequest({
        idToken: googleResponse.credential,
      });

      completeAuth(data, data?.user?.email || '', data?.user?.fullName || 'Google User');
    } catch (error) {
      setMessage(error.message || 'Google sign-up failed');
      setMessageType('error');
    } finally {
      setIsGoogleSubmitting(false);
    }
  }, [completeAuth]);

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
        text: 'signup_with',
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

      setMessage('Google sign-up script failed to load.');
      setMessageType('error');
    };

    document.head.appendChild(script);

    return () => {
      isActive = false;
    };
  }, [googleClientId, handleGoogleCredential]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setMessageType('');

    const normalizedEmail = email.trim().toLowerCase();

    const passwordErrors = validatePasswordForSignup(password, normalizedEmail);
    if (passwordErrors.length > 0) {
      setMessage(`Password policy: ${passwordErrors.join(', ')}`);
      setMessageType('error');
      return;
    }

    if (password !== confirmPassword) {
      setMessage(t('auth.createAccount.passwordMismatch'));
      setMessageType('error');
      return;
    }

    setIsSubmitting(true);

    try {
      await registerRequest({
        fullName: fullName.trim(),
        email: normalizedEmail,
        password,
        role: 'employee',
      });

      const loginData = await loginRequest({
        email: normalizedEmail,
        password,
      });

      completeAuth(loginData, normalizedEmail, fullName.trim());
    } catch (error) {
      setMessage(error.message || 'Create account failed');
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

            <small className="auth-policy-hint">
              Password must be 12-72 chars with uppercase, lowercase, number, and special character.
            </small>

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

            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : t('auth.createAccount.submit')}
            </button>

            <div className="auth-social-divider" aria-hidden="true">
              <span>or</span>
            </div>

            {googleClientId ? (
              <div className="google-login-wrap" aria-busy={isGoogleSubmitting}>
                <div ref={googleButtonRef} className="google-login-button" />
                {!isGoogleReady && <small>Loading Google sign-up...</small>}
              </div>
            ) : (
              <small className="auth-google-missing">
                Set VITE_GOOGLE_CLIENT_ID to enable Google sign-up.
              </small>
            )}
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
