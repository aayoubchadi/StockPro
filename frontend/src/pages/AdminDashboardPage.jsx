import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import PageBackground from '../components/PageBackground';
import { getSession, isAdminRole } from '../lib/authStore';

export default function AdminDashboardPage() {
  const [userName, setUserName] = useState('Admin');
  const [userEmail, setUserEmail] = useState('-');
  const [userRole, setUserRole] = useState('admin');
  const navigate = useNavigate();

  useEffect(() => {
    const session = getSession();
    if (!session) {
      navigate('/login');
      return;
    }

    if (!isAdminRole(session.role)) {
      navigate('/client-dashboard');
      return;
    }

    setUserName(session.fullName);
    setUserEmail(session.email);
    setUserRole(session.role);
  }, [navigate]);

  return (
    <>
      <PageBackground />
      <Header isDashboard={true} />
      <main className="section section-shell">
        <section className="dashboard-head">
          <p className="eyebrow">Admin dashboard</p>
          <h1>Bonjour <span>{userName}</span></h1>
          <p>Compte: <strong>{userEmail}</strong> | Role: <strong>{userRole}</strong></p>
        </section>

        <section className="dashboard-grid">
          <article className="dashboard-box">
            <h3>Utilisateurs</h3>
            <p>154 comptes actifs</p>
          </article>
          <article className="dashboard-box">
            <h3>Produits</h3>
            <p>1 284 references en stock</p>
          </article>
          <article className="dashboard-box">
            <h3>Alertes critiques</h3>
            <p>7 produits sous seuil</p>
          </article>
          <article className="dashboard-box">
            <h3>Revenus mensuels</h3>
            <p>82 400 EUR ce mois</p>
          </article>
        </section>
      </main>
    </>
  );
}
