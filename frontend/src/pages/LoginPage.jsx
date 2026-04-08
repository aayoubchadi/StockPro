import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import PageBackground from '../components/PageBackground';
import { getAccounts, saveSession, getDashboardPathForRole, ensureSeedAccount } from '../lib/authStore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    ensureSeedAccount();
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const emailLower = email.trim().toLowerCase();
    const accounts = getAccounts();

    if (!accounts[emailLower] || accounts[emailLower].password !== password) {
      setMessage('Identifiants invalides.');
      setMessageType('error');
      return;
    }

    const account = accounts[emailLower];
    const role = account.role || 'client';
    saveSession({
      email: emailLower,
      fullName: account.fullName || 'Utilisateur',
      role,
    });

    setMessage('Connexion reussie. Redirection...');
    setMessageType('success');
    setTimeout(() => {
      navigate(getDashboardPathForRole(role));
    }, 900);
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
          <p className="auth-hint">Test client: client@stockpro.com / client1234</p>
          <p className="auth-hint">Test admin: admin@stockpro.com / admin1234</p>

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

            <button type="submit" className="btn btn-primary">Se connecter</button>
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
