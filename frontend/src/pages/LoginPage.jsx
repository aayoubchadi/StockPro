import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import PageBackground from '../components/PageBackground';
import {
  getDashboardPathForRole,
  saveSession,
} from '../lib/authStore';
import { loginRequest } from '../services/authApi';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

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

      saveSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenType: data.tokenType,
        expiresIn: data.expiresIn,
        refreshExpiresIn: data.refreshExpiresIn,
        user: data.user,
        email: data.user?.email || normalizedEmail,
        fullName: data.user?.fullName || 'Utilisateur',
        role: data.user?.role || 'employee',
        scope: data.user?.scope || 'tenant',
        companyId: data.user?.companyId || null,
      });

      const role = data.user?.role || 'employee';

      setMessage('Connexion reussie. Redirection...');
      setMessageType('success');
      setTimeout(() => {
        navigate(getDashboardPathForRole(role));
      }, 700);
    } catch (error) {
      setMessage(error.message || 'Identifiants invalides.');
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
          <p className="eyebrow">Connexion</p>
          <h1>Bienvenue sur StockPro</h1>
          <p>Connectez-vous pour piloter vos stocks, commandes et fournisseurs.</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@entreprise.com"
                required
              />
            </label>

            <label>
              Mot de passe
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </label>

            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <p className={`form-message ${messageType}`} aria-live="polite">
            {message}
          </p>

          <div className="auth-links">
            <a href="/forgot-password">Mot de passe oublie ?</a>
            <a href="/create-account">Creer un compte</a>
          </div>
        </section>
      </main>
    </>
  );
}
