import { Route, Routes } from 'react-router-dom';
import HomePage from '../pages/public/HomePage.jsx';
import LoginPage from '../pages/auth/LoginPage.jsx';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
    </Routes>
  );
};

export default AppRoutes;