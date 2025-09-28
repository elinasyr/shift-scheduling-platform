import React from 'react';
import { Card, Row, Col, Badge, Alert } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  const getWelcomeMessage = () => {
    switch (user?.role) {
      case 'doctor':
        return 'Welcome to your scheduling dashboard. Use the calendar to set your availability.';
      case 'manager':
        return 'Welcome to the management dashboard. You can manage schedules and doctors from here.';
      case 'viewer':
        return 'Welcome! You can view the finalized schedules when they become available.';
      default:
        return 'Welcome to the scheduling system.';
    }
  };

  const getQuickActions = () => {
    const actions = [];
    
    if (user?.role === 'doctor' || user?.role === 'manager') {
      actions.push(
        { title: 'Set Availability', description: 'Update your availability for shifts', link: '/' },
        { title: 'View Profile', description: 'Update your profile information', link: '/profile' },
        { title: 'View Schedule', description: 'Check the current schedule', link: '/schedule' }
      );
    }

    if (user?.role === 'manager') {
      actions.push(
        { title: 'Manage Doctors', description: 'View and edit doctor information', link: '/doctors' },
        { title: 'Manager Dashboard', description: 'Generate and manage schedules', link: '/manager' }
      );
    }

    if (user?.role === 'viewer') {
      actions.push(
        { title: 'View Schedule', description: 'View the finalized schedule', link: '/schedule' }
      );
    }

    return actions;
  };

  return (
    <div>
      <Row className="mb-4">
        <Col>
          <h2>Dashboard</h2>
          <p className="text-muted">
            Welcome back, {user?.firstName} {user?.lastName}
          </p>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col>
          <Alert variant="info">
            <div className="d-flex align-items-center">
              <div className="me-3">
                <Badge bg="primary" className="p-2">
                  {user?.role?.toUpperCase()}
                </Badge>
              </div>
              <div>
                <strong>Your Role: {user?.role}</strong>
                <br />
                {getWelcomeMessage()}
              </div>
            </div>
          </Alert>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col>
          <h4>Quick Actions</h4>
        </Col>
      </Row>

      <Row>
        {getQuickActions().map((action, index) => (
          <Col md={6} lg={4} key={index} className="mb-3">
            <Card className="dashboard-card h-100" style={{ cursor: 'pointer' }}>
              <Card.Body>
                <Card.Title className="h5">{action.title}</Card.Title>
                <Card.Text className="text-muted">
                  {action.description}
                </Card.Text>
                <a href={action.link} className="btn btn-outline-primary btn-sm">
                  Go to {action.title}
                </a>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {user?.specialty && (
        <Row className="mt-4">
          <Col>
            <Card className="dashboard-card">
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <h6>Your Information</h6>
                    <p className="mb-1"><strong>Specialty:</strong> {user.specialty || 'Not specified'}</p>
                    {user.rotationType && <p className="mb-1"><strong>Rotation Type:</strong> {user.rotationType}</p>}
                    {user.category && <p className="mb-1"><strong>Category:</strong> {user.category}</p>}
                    {user.isNew && <p className="mb-1"><Badge bg="success">New Doctor</Badge></p>}
                    <p className="mb-1"><strong>Email:</strong> {user.email}</p>
                  </Col>
                  <Col md={6}>
                    <h6>Quick Stats</h6>
                    <p className="mb-1">Role: <Badge bg="secondary">{user.role}</Badge></p>
                    <p className="mb-1">
                      Account Created: {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default Dashboard;
