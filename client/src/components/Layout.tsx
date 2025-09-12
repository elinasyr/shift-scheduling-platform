import React from 'react';
import { Navbar, Nav, Container, Dropdown, Image } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getNavItems = () => {
    if (!user) return [];

    const baseItems = [
      { path: '/', label: 'Calendar', roles: ['doctor', 'manager', 'viewer'] },
    ];

    // Add different items based on role
    if (user.role === 'doctor' || user.role === 'manager') {
      baseItems.push(
        { path: '/dashboard', label: 'Dashboard', roles: ['doctor', 'manager'] },
        { path: '/profile', label: 'Profile', roles: ['doctor', 'manager'] },
        { path: '/schedule', label: 'Schedule', roles: ['doctor', 'manager'] }
      );
    }

    if (user.role === 'manager') {
      baseItems.push(
        { path: '/doctors', label: 'Doctors', roles: ['manager'] },
        { path: '/manager', label: 'Manager Dashboard', roles: ['manager'] }
      );
    }

    if (user.role === 'viewer') {
      baseItems.push(
        { path: '/profile', label: 'Profile', roles: ['viewer'] },
        { path: '/schedule', label: 'Schedule', roles: ['viewer'] }
      );
    }

    return baseItems.filter(item => 
      item.roles.includes(user.role)
    );
  };

  // Don't show navbar on login/signup pages
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  return (
    <div className="min-vh-100">
      {!isAuthPage && user && (
        <Navbar bg="white" expand="lg" className="shadow-sm">
          <Container>
            <Navbar.Brand as={Link} to="/" className="d-flex align-items-center">
              <img 
                src="/logo.jpg" 
                alt="Hospital Logo" 
                className="me-2"
                style={{height: '80px', width: '260px'}}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </Navbar.Brand>
            
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse id="basic-navbar-nav">
              <Nav className="me-auto">
                {getNavItems().map((item) => (
                  <Nav.Link key={item.path} as={Link} to={item.path}>
                    {item.label}
                  </Nav.Link>
                ))}
              </Nav>
              
              <Nav>
                <Dropdown align="end">
                  <Dropdown.Toggle variant="outline-primary" className="d-flex align-items-center">
                    {user.profilePhoto && (
                      <Image 
                        src={user.profilePhoto} 
                        roundedCircle 
                        width={30} 
                        height={30} 
                        className="me-2"
                      />
                    )}
                    {user.firstName} {user.lastName}
                  </Dropdown.Toggle>
                  
                  <Dropdown.Menu>
                    <Dropdown.ItemText>
                      <small className="text-muted">
                        Role: {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        {user.specialty && <><br />Specialty: {user.specialty.charAt(0).toUpperCase() + user.specialty.slice(1)}</>}
                      </small>
                    </Dropdown.ItemText>
                    <Dropdown.Divider />
                    <Dropdown.Item as={Link} to="/profile">
                      Edit Profile
                    </Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item onClick={handleLogout} className="text-danger">
                      Logout
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </Nav>
            </Navbar.Collapse>
          </Container>
        </Navbar>
      )}
      
      <Container className={isAuthPage ? "" : "py-4"}>
        {children}
      </Container>
    </div>
  );
};

export default Layout;
