import React from 'react';
import { Card, Row, Col, Badge, Alert } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  const getWelcomeMessage = () => {
    switch (user?.role) {
      case 'doctor':
        return 'Καλώς ήρθατε στον πίνακα εφημεριών σας. Χρησιμοποιήστε το ημερολόγιο για να ορίσετε τη διαθεσιμότητά σας.';
      case 'manager':
        return 'Καλώς ήρθατε στον πίνακα διαχείρισης. Μπορείτε να διαχειριστείτε τα προγράμματα εφημεριών και τους ειδικευόμενους από εδώ.';
      case 'viewer':
        return 'Καλώς ήρθατε! Μπορείτε να δείτε τα οριστικοποιημένα προγράμματα εφημεριών όταν γίνουν διαθέσιμα.';
      default:
        return 'Καλώς ήρθατε στο σύστημα διαχείρισης εφημεριών.';
    }
  };

  const getQuickActions = () => {
    const actions = [];
    
    if (user?.role === 'doctor' || user?.role === 'manager') {
      actions.push(
        { title: 'Ορισμός Διαθεσιμότητας', description: 'Ενημερώστε τη διαθεσιμότητά σας για εφημερίες', link: '/' },
        { title: 'Προβολή Προφίλ', description: 'Ενημερώστε τις πληροφορίες του προφίλ σας', link: '/profile' },
        { title: 'Προβολή Προγράμματος', description: 'Ελέγξτε το τρέχον πρόγραμμα εφημεριών', link: '/schedule' }
      );
    }

    if (user?.role === 'manager') {
      actions.push(
        { title: 'Διαχείριση Ειδικευομένων', description: 'Προβολή και επεξεργασία πληροφοριών ειδικευομένων', link: '/doctors' },
        { title: 'Πίνακας Διαχείρισης', description: 'Δημιουργία και διαχείριση προγραμμάτων εφημεριών', link: '/manager' }
      );
    }

    if (user?.role === 'viewer') {
      actions.push(
        { title: 'Προβολή Προγράμματος', description: 'Δείτε το οριστικοποιημένο πρόγραμμα εφημεριών', link: '/schedule' }
      );
    }

    return actions;
  };

  return (
    <div>
      <Row className="mb-4">
        <Col>
          <h2>Πίνακας Ελέγχου</h2>
          <p className="text-muted">
            Καλώς ήρθατε, {user?.firstName} {user?.lastName}
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
                <strong>Ο Ρόλος σας: {user?.role}</strong>
                <br />
                {getWelcomeMessage()}
              </div>
            </div>
          </Alert>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col>
          <h4>Γρήγορες Ενέργειες</h4>
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
                  Μετάβαση σε {action.title}
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
                    <h6>Οι Πληροφορίες σας</h6>
                    <p className="mb-1"><strong>Τύπος Χειρουργείων:</strong> {user.specialty || 'Δεν έχει οριστεί'}</p>
                    {user.rotationType && <p className="mb-1"><strong>Τύπος Rotation:</strong> {user.rotationType}</p>}
                    {user.category && <p className="mb-1"><strong>Κατηγορία:</strong> {user.category}</p>}
                    {user.isNew && <p className="mb-1"><Badge bg="success">Νέος Ειδικευόμενος</Badge></p>}
                    <p className="mb-1"><strong>Email:</strong> {user.email}</p>
                  </Col>
                  <Col md={6}>
                    <h6>Γρήγορα Στατιστικά</h6>
                    <p className="mb-1">Ρόλος: <Badge bg="secondary">{user.role}</Badge></p>
                    <p className="mb-1">
                      Λογαριασμός Δημιουργήθηκε: {new Date(user.createdAt).toLocaleDateString('el-GR')}
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
