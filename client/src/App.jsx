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
          <NavLink to="/" end>Accueil</NavLink>
          <NavLink to="/login">Connexion</NavLink>
          <a href="#contact" className="btn btn-ghost">Contact</a>
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
