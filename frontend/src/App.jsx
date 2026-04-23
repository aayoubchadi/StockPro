import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import CreateAccountPage from './pages/CreateAccountPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ClientDashboardPage from './pages/ClientDashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AudienceDetailPage from './pages/AudienceDetailPage';
import WhoWeArePage from './pages/WhoWeArePage';
import ContactUsPage from './pages/ContactUsPage';
import { LanguageProvider } from './lib/i18n';
import './index.css';

function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('stockpro-theme');
    const initialTheme =
      savedTheme === 'light' || savedTheme === 'dark'
        ? savedTheme
        : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  return (
    <LanguageProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/create-account" element={<CreateAccountPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/who-we-are" element={<WhoWeArePage />} />
          <Route path="/contact-us" element={<ContactUsPage />} />
          <Route path="/who-is-it-for/:audienceSlug" element={<AudienceDetailPage />} />
          <Route path="/client-dashboard" element={<ClientDashboardPage />} />
          <Route path="/admin-dashboard" element={<AdminDashboardPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </LanguageProvider>
  );
}

export default App;
