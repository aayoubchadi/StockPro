import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import Login from './pages/Login.jsx';

const LandingRedirect = () => {
  useEffect(() => {
    window.location.replace('/saas-landing/index.html');
  }, []);

  return null;
};

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingRedirect />} />
      <Route path="/login" element={<Login />} />
    </Routes>
  );
};

export default App;
