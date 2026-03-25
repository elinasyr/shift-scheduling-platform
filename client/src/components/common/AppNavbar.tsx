import React from 'react';
import { Navbar, Nav, Container, Dropdown, Image } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Logo from './Logo';
import { getRoleLabel, getSpecialtyLabel } from '../../utils/medical';

const AppNavbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getNavItems = () => {
    if (!user) return [];

    const baseItems = [
      { path: '/', label: 'Ημερολόγιο', roles: ['doctor', 'manager', 'viewer'] },
    ];

    // Add different items based on role
    if (user.role === 'doctor' || user.role === 'manager') {
      baseItems.push(
        { path: '/schedule', label: 'Πρόγραμμα Εφημεριών', roles: ['doctor', 'manager'] }
      );
    }

    if (user.role === 'manager') {
      baseItems.push(
        { path: '/doctors', label: 'Ειδικευόμενοι', roles: ['manager'] },
        { path: '/manager', label: 'Διαχείριση', roles: ['manager'] }
      );
    }

    if (user.role === 'viewer') {
      baseItems.push(
        { path: '/schedule', label: 'Πρόγραμμα Εφημεριών', roles: ['viewer'] }
      );
    }

    return baseItems.filter(item => 
      item.roles.includes(user.role)
    );
  };

  if (!user) return null;

  return (
    <Navbar expand="lg" className="shadow-sm app-navbar">
      <Container>
        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center">
          <Logo />
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
              <Dropdown.Toggle 
                variant="outline-primary" 
                className="d-flex align-items-center"
                style={{ 
                  borderColor: 'black', 
                  color: 'black' 
                }}
              >
                {user.profilePhoto && (
                  <Image 
                    src={user.profilePhoto} 
                    roundedCircle 
                    width={30} 
                    height={30} 
                    className="me-2"
                  />
                )}
                <span className="d-none d-sm-inline">{user.firstName} {user.lastName}</span>
                <span className="d-sm-none">{user.firstName}</span>
              </Dropdown.Toggle>
              
              <Dropdown.Menu>
                <Dropdown.ItemText>
                  <small className="text-muted">
                    Ρόλος: {getRoleLabel(user.role)}
                    {user.specialty && (
                      <>
                        <br />
                        Τομέας: {getSpecialtyLabel(user.specialty)}
                      </>
                    )}
                  </small>
                </Dropdown.ItemText>
                <Dropdown.Divider />
                <Dropdown.Item as={Link} to="/profile">
                  Επεξεργασία Προφίλ
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={handleLogout} className="text-danger">
                  Αποσύνδεση
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default AppNavbar;
