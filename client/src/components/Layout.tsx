import React from 'react';
import { Container } from 'react-bootstrap';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppNavbar from './common/AppNavbar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();

  // Don't show navbar on login/signup pages
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  return (
    <div className="min-vh-100">
      {!isAuthPage && user && <AppNavbar />}
      
      <Container fluid className={isAuthPage ? "" : "py-4"} style={{ maxWidth: isAuthPage ? 'none' : '1200px' }}>
        {children}
      </Container>
    </div>
  );
};

export default Layout;
