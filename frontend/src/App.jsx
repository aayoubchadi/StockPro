import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { ensureSeedAccount } from './lib/authStore';
import { initLenisScroll } from './lib/gsapAnimations';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import CreateAccountPage from './pages/CreateAccountPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ClientDashboardPage from './pages/ClientDashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import './index.css';

function App() {
  useEffect(() => {
    ensureSeedAccount();
    initLenisScroll();

    // Add scroll event listener to refresh ScrollTrigger
    const handleScroll = () => {
      ScrollTrigger.update();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/create-account" element={<CreateAccountPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/client-dashboard" element={<ClientDashboardPage />} />
        <Route path="/admin-dashboard" element={<AdminDashboardPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
