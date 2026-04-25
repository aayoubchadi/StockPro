import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import CreateAccountPage from './pages/CreateAccountPage';
import CompanyAdminCheckoutPage from './pages/CompanyAdminCheckoutPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ClientDashboardPage from './pages/ClientDashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AudienceDetailPage from './pages/AudienceDetailPage';
import WhoWeArePage from './pages/WhoWeArePage';
import ContactUsPage from './pages/ContactUsPage';
import TeamAccessPage from './pages/TeamAccessPage';
import InventoryPage from './pages/InventoryPage';
import DataExchangePage from './pages/DataExchangePage';
import WorkspaceBillingPage from './pages/WorkspaceBillingPage';
import DemoOnboardingPage from './pages/DemoOnboardingPage';
import RequireWorkspaceAccess from './components/RequireWorkspaceAccess';
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
          <Route path="/company-admin-checkout" element={<CompanyAdminCheckoutPage />} />
          <Route path="/demo-onboarding" element={<DemoOnboardingPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/who-we-are" element={<WhoWeArePage />} />
          <Route path="/contact-us" element={<ContactUsPage />} />
          <Route path="/who-is-it-for/:audienceSlug" element={<AudienceDetailPage />} />
          <Route
            path="/client-dashboard"
            element={(
              <RequireWorkspaceAccess>
                <ClientDashboardPage />
              </RequireWorkspaceAccess>
            )}
          />
          <Route
            path="/admin-dashboard"
            element={(
              <RequireWorkspaceAccess>
                <AdminDashboardPage />
              </RequireWorkspaceAccess>
            )}
          />
          <Route
            path="/team-access"
            element={(
              <RequireWorkspaceAccess requiredPermissions={['employees.view']}>
                <TeamAccessPage />
              </RequireWorkspaceAccess>
            )}
          />
          <Route
            path="/inventory"
            element={(
              <RequireWorkspaceAccess requiredPermissions={['inventory.view']}>
                <InventoryPage />
              </RequireWorkspaceAccess>
            )}
          />
          <Route
            path="/data-exchange"
            element={(
              <RequireWorkspaceAccess requiredAnyPermissions={['data.import', 'data.export']}>
                <DataExchangePage />
              </RequireWorkspaceAccess>
            )}
          />
          <Route
            path="/workspace-billing"
            element={(
              <RequireWorkspaceAccess requireAdmin={true}>
                <WorkspaceBillingPage />
              </RequireWorkspaceAccess>
            )}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </LanguageProvider>
  );
}

export default App;
