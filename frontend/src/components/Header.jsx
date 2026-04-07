import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getSession, clearSession } from '../lib/authStore';

export default function Header({ showNav = true, isDashboard = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const session = getSession();

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  return (
    <header className="site-header">
      <Link to="/" className="brand">
        <span className="brand-mark">S</span>
        <span className="brand-text">StockPilot</span>
      </Link>

      {showNav && !isDashboard && (
        <nav className="nav-links">
          <a href="#product">Product</a>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
        </nav>
      )}

      <div className="header-actions">
        {isDashboard ? (
          <>
            <Link to="/" className="btn btn-ghost">Accueil</Link>
            <button onClick={handleLogout} className="btn btn-secondary" type="button">
              Deconnexion
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-ghost">Connexion</Link>
            <a href="#pricing" className="btn btn-secondary">Start Trial</a>
          </>
        )}
      </div>
    </header>
  );
}
