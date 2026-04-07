import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import PageBackground from '../components/PageBackground';
import { getAccounts, saveAccounts, ensureSeedAccount } from '../lib/authStore';

export default function CreateAccountPage() {
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
      setMessage('Le mot de passe doit contenir au moins 6 caracteres.');
      setMessageType('error');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Les mots de passe ne correspondent pas.');
      setMessageType('error');
      return;
    }

    const accounts = getAccounts();
    const emailLower = email.trim().toLowerCase();
    
    if (accounts[emailLower]) {
      setMessage('Cet email existe deja.');
      setMessageType('error');
      return;
    }

    accounts[emailLower] = { fullName, password, role: 'client' };
    saveAccounts(accounts);
    setMessage('Compte cree avec succes. Redirection...');
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
          <p className="eyebrow">Inscription</p>
          <h1>Creer votre compte</h1>
          <p>Commencez en quelques secondes.</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              Nom complet
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Votre nom"
                required
              />
            </label>

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
                placeholder="6 caracteres minimum"
                required
              />
            </label>

            <label>
              Confirmer mot de passe
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Retapez le mot de passe"
                required
              />
            </label>

            <button type="submit" className="btn btn-primary">Creer mon compte</button>
          </form>

          <p className={`form-message ${messageType}`} aria-live="polite">
            {message}
          </p>

          <div className="auth-links">
            <a href="/login">J'ai deja un compte</a>
            <a href="/forgot-password">Mot de passe oublie ?</a>
          </div>
        </section>
      </main>
    </>
  );
}
