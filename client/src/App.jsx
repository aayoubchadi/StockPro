import { Route, Routes, NavLink } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';

const App = () => {
  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div>
            <strong>Stage</strong>
            <span>FE</span>
          </div>
        </div>
        <nav className="site-nav">
          <a href="#features">Fonctionnalites</a>
          <a href="#integrations">Integrations</a>
          <a href="#testimonials">Temoignages</a>
          <a href="#why">Pourquoi Stage FE</a>
          <a href="/login" className="btn btn-ghost">Connexion</a>
          <NavLink to="/login" className="btn btn-primary">Essai gratuit</NavLink>
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
