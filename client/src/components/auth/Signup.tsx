import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert, Row, Col } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Logo from '../common/Logo';

const Signup: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<any>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.firstName || !formData.lastName || !formData.email || 
        !formData.password || !formData.confirmPassword) {
      setError('Παρακαλώ συμπληρώστε όλα τα απαιτούμενα πεδία');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Οι κωδικοί δεν ταιριάζουν');
      return;
    }

    if (formData.password.length < 6) {
      setError('Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες');
      return;
    }

    try {
      setError('');
      setIsLoading(true);
      await signup(formData);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Αποτυχία δημιουργίας λογαριασμού');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <Container>
        <Row className="justify-content-center">
          <Col xs={17} sm={10} md={15} lg={10} xl={6}>
            <Card className="auth-card">
              <div className="auth-logo">
                <Logo />
                <h2 className="mt-3 text-center">Δημιουργία Λογαριασμού</h2>
                <p className="text-muted text-center">Εγγραφείτε στο σύστημα προγραμματισμού εφημεριών</p>
              </div>

              {error && <Alert variant="danger">{error}</Alert>}

              <Form onSubmit={handleSubmit}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Όνομα</Form.Label>
                      <Form.Control
                        type="text"
                        name="firstName"
                        placeholder="Εισάγετε το όνομά σας"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Επώνυμο</Form.Label>
                      <Form.Control
                        type="text"
                        name="lastName"
                        placeholder="Εισάγετε το επώνυμό σας"
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    placeholder="Εισάγετε το email σας"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Κωδικός</Form.Label>
                      <Form.Control
                        type="password"
                        name="password"
                        placeholder="Δημιουργήστε κωδικό"
                        value={formData.password}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Επιβεβαίωση Κωδικού</Form.Label>
                      <Form.Control
                        type="password"
                        name="confirmPassword"
                        placeholder="Επιβεβαιώστε τον κωδικό"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Alert variant="info" className="mb-3">
                  <strong>Σημείωση:</strong> Ο λογαριασμός σας θα χρειαστεί έγκριση από έναν διαχειριστή πριν αποκτήσετε πλήρη πρόσβαση. 
                  Αρχικά θα έχετε δικαιώματα προβολής μέχρι να εγκριθείτε.
                </Alert>

                <Button 
                  type="submit" 
                  className="w-100 mb-3" 
                  disabled={isLoading}
                >
                  {isLoading ? 'Δημιουργία Λογαριασμού...' : 'Δημιουργία Λογαριασμού'}
                </Button>
              </Form>

              <div className="text-center">
                <p className="mb-0">
                  Έχετε ήδη λογαριασμό;{' '}
                  <Link to="/login" className="text-decoration-none">
                    Συνδεθείτε εδώ
                  </Link>
                </p>
              </div>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Signup;
