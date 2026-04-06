import { useState } from 'react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="login-page section-large">
      <div className="login-grid">
        <div className="login-side">
          <div className="login-side-content">
            <p className="eyebrow">Connexion securisee</p>
            <h2>Pilotez ventes, stocks et achats depuis un seul espace</h2>
            <p>
              Retrouvez toutes vos operations commerciales en temps reel avec
              une interface claire et rapide.
            </p>
            <div className="metrics-row">
              <div>
                <strong>1 000+</strong>
                <span>TPE et PME accompagnees</span>
              </div>
              <div>
                <strong>Temps reel</strong>
                <span>Synchronisation des stocks</span>
              </div>
            </div>
          </div>
        </div>

        <div className="login-panel">
          <div className="panel-header">
            <span>Bienvenue</span>
            <p>Connectez-vous a votre espace StockPilot.</p>
          </div>

          <form className="login-form" onSubmit={(e) => e.preventDefault()}>
            <label>
              Adresse email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="exemple@entreprise.com"
              />
            </label>
            <label>
              Mot de passe
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
              />
            </label>
            <button type="submit" className="btn btn-primary login-submit">
              Se connecter
            </button>
          </form>

          <div className="login-footer">
            <a href="#">Mot de passe oublié ?</a>
            <a href="#">Creer un compte</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
