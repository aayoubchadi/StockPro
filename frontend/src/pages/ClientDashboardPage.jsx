import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import PageBackground from '../components/PageBackground';
import { getSession } from '../lib/authStore';

export default function ClientDashboardPage() {
  const [userName, setUserName] = useState('Client');
  const [userEmail, setUserEmail] = useState('-');
  const [userRole, setUserRole] = useState('client');
  const navigate = useNavigate();

  useEffect(() => {
    const session = getSession();
    if (!session) {
      navigate('/login');
      return;
    }

    if (session.role !== 'client') {
      navigate(session.role === 'admin' ? '/admin-dashboard' : '/login');
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
          <p className="eyebrow">Client dashboard</p>
          <h1>Bonjour <span>{userName}</span></h1>
          <p>Compte: <strong>{userEmail}</strong> | Role: <strong>{userRole}</strong></p>
        </section>

        <section className="dashboard-grid">
          <article className="dashboard-box">
            <h3>Mes commandes</h3>
            <p>12 commandes en cours</p>
          </article>
          <article className="dashboard-box">
            <h3>Livraisons</h3>
            <p>3 livraisons aujourd'hui</p>
          </article>
          <article className="dashboard-box">
            <h3>Tickets SAV</h3>
            <p>2 tickets ouverts</p>
          </article>
        </section>
      </main>
    </>
  );
}
