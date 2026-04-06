import { useState } from 'react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="login-page section-large">
      <div className="login-grid">
        <div className="login-panel">
          <div className="panel-header">
            <span>Connexion</span>
            <p>Accédez à votre tableau de bord de gestion commerciale.</p>
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
          </div>
        </div>

        <div className="login-side">
          <div className="login-side-content">
            <p className="eyebrow">Solution professionnelle</p>
            <h2>Transformez votre pilotage commercial</h2>
            <p>
              Connectez-vous rapidement pour suivre vos stocks, commandes et
              fournisseurs depuis un seul espace.
            </p>
            <div className="metrics-row">
              <div>
                <strong>Temps gagné</strong>
                <span>+50% d'efficacité</span>
              </div>
              <div>
                <strong>Visibilité</strong>
                <span>Stock en temps réel</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
