import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import PageBackground from '../components/PageBackground';
import { getAccounts, saveAccounts, ensureSeedAccount } from '../lib/authStore';

export default function ForgotPasswordPage() {
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
      setMessage('Le mot de passe doit contenir au moins 6 caracteres.');
      setMessageType('error');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setMessage('Les mots de passe ne correspondent pas.');
      setMessageType('error');
      return;
    }

    const accounts = getAccounts();
    const emailLower = email.trim().toLowerCase();
    
    if (!accounts[emailLower]) {
      setMessage('Aucun compte trouve avec cet email.');
      setMessageType('error');
      return;
    }

    accounts[emailLower].password = newPassword;
    saveAccounts(accounts);
    setMessage('Mot de passe mis a jour. Redirection...');
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
          <p className="eyebrow">Recuperation</p>
          <h1>Mot de passe oublie</h1>
          <p className="auth-hint">Version basique: reinitialisation locale via email.</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              Email du compte
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@entreprise.com"
                required
              />
            </label>

            <label>
              Nouveau mot de passe
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="6 caracteres minimum"
                required
              />
            </label>

            <label>
              Confirmer nouveau mot de passe
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Retapez le mot de passe"
                required
              />
            </label>

            <button type="submit" className="btn btn-primary">Reinitialiser</button>
          </form>

          <p className={`form-message ${messageType}`} aria-live="polite">
            {message}
          </p>

          <div className="auth-links">
            <a href="/login">Retour connexion</a>
            <a href="/create-account">Creer un compte</a>
          </div>
        </section>
      </main>
    </>
  );
}
