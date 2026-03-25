import React, { useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Image, Row } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../services/api';
import {
  RANK_OPTIONS,
  ROTATION_OPTIONS,
  SPECIALTY_OPTIONS,
  getCategoryLabel,
  getRankLabel,
  getRoleLabel,
  getRotationLabel,
  getSpecialtyLabel
} from '../utils/medical';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    specialty: (user?.specialty as 'cardiology' | 'thoracic' | 'general') || 'general',
    rank: (user?.rank as 'junior' | 'senior') || 'junior',
    rotationType: (user?.rotationType as 'outside' | 'visiting' | 'internal' | 'abroad') || 'internal',
    isNew: user?.isNew || false
  });

  const handleChange = (e: React.ChangeEvent<any>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      return;
    }

    try {
      setError('');
      setMessage('');
      setLoading(true);

      await api.updateProfile(formData);
      setMessage('Το προφίλ ενημερώθηκε επιτυχώς.');
      setEditing(false);

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Αποτυχία ενημέρωσης προφίλ');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      specialty: (user?.specialty as 'cardiology' | 'thoracic' | 'general') || 'general',
      rank: (user?.rank as 'junior' | 'senior') || 'junior',
      rotationType: (user?.rotationType as 'outside' | 'visiting' | 'internal' | 'abroad') || 'internal',
      isNew: user?.isNew || false
    });
    setEditing(false);
    setError('');
    setMessage('');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="page-shell">
      <section className="hero-panel">
        <div>
          <span className="eyebrow">Ο λογαριασμός μου</span>
          <h1 className="page-title">Προφίλ</h1>
          <p className="page-subtitle">
            Κρατήστε ενημερωμένα τα στοιχεία που χρησιμοποιούνται στο πρόγραμμα και στη διαθεσιμότητά σας.
          </p>
        </div>
        <div className="hero-actions">
          <Badge bg="light" text="dark" className="status-badge">
            {getRoleLabel(user.role)}
          </Badge>
          <Badge bg={user.isApproved ? 'success' : 'warning'} className="status-badge">
            {user.isApproved ? 'Εγκεκριμένος λογαριασμός' : 'Σε αναμονή έγκρισης'}
          </Badge>
        </div>
      </section>

      {message && <Alert variant="success">{message}</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}

      <Row className="g-4">
        <Col xs={12} xl={8}>
          <Card className="dashboard-card">
            <Card.Header className="section-header">
              <div>
                <h5 className="mb-1">Στοιχεία χρήστη</h5>
                <small className="text-muted">Μόνο τα απαραίτητα στοιχεία για το καθημερινό πρόγραμμα.</small>
              </div>
              {!editing ? (
                <Button variant="primary" onClick={() => setEditing(true)}>
                  Επεξεργασία
                </Button>
              ) : (
                <div className="d-flex gap-2">
                  <Button variant="outline-secondary" onClick={handleCancel}>
                    Ακύρωση
                  </Button>
                  <Button variant="primary" onClick={handleSubmit} disabled={loading}>
                    {loading ? 'Αποθήκευση...' : 'Αποθήκευση'}
                  </Button>
                </div>
              )}
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleSubmit}>
                <Row>
                  <Col sm={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Όνομα</Form.Label>
                      <Form.Control
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        disabled={!editing}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col sm={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Επώνυμο</Form.Label>
                      <Form.Control
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        disabled={!editing}
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
                    value={formData.email}
                    onChange={handleChange}
                    disabled={!editing}
                    required
                  />
                </Form.Group>

                {(user.role === 'doctor' || user.role === 'manager') && (
                  <>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Τομέας</Form.Label>
                          <Form.Select
                            name="specialty"
                            value={formData.specialty}
                            onChange={handleChange}
                            disabled={!editing}
                          >
                            {SPECIALTY_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Βαθμίδα</Form.Label>
                          <Form.Select
                            name="rank"
                            value={formData.rank}
                            onChange={handleChange}
                            disabled={!editing}
                          >
                            {RANK_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Τύπος rotation</Form.Label>
                          <Form.Select
                            name="rotationType"
                            value={formData.rotationType}
                            onChange={handleChange}
                            disabled={!editing}
                          >
                            {ROTATION_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <div className="summary-metric h-100">
                          <span className="summary-label">Πρόσβαση</span>
                          <strong>{getCategoryLabel(user.category)}</strong>
                          <small className="text-muted">Η διαχείριση πρόσβασης γίνεται μόνο από manager.</small>
                        </div>
                      </Col>
                    </Row>

                    {formData.rank === 'junior' && (
                      <Form.Group className="mb-3">
                        <Form.Check
                          type="checkbox"
                          name="isNew"
                          checked={formData.isNew}
                          onChange={(e) => setFormData((prev) => ({ ...prev, isNew: e.target.checked }))}
                          disabled={!editing}
                          label="Νέος ειδικευόμενος"
                        />
                      </Form.Group>
                    )}
                  </>
                )}
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} xl={4}>
          <Card className="dashboard-card mb-4">
            <Card.Body className="text-center">
              {user.profilePhoto ? (
                <Image src={user.profilePhoto} roundedCircle width={112} height={112} className="mb-3" />
              ) : (
                <div className="profile-avatar-large mx-auto mb-3">
                  {user.firstName?.[0]}
                  {user.lastName?.[0]}
                </div>
              )}
              <h5 className="mb-1">
                {user.firstName} {user.lastName}
              </h5>
              <p className="text-muted mb-3">@{user.username}</p>
              <Alert variant="secondary" className="text-start mb-0">
                Η μεταφόρτωση φωτογραφίας δεν είναι ακόμη διαθέσιμη. Μέχρι τότε εμφανίζονται τα αρχικά σας.
              </Alert>
            </Card.Body>
          </Card>

          <Card className="dashboard-card">
            <Card.Header className="section-header">
              <div>
                <h5 className="mb-1">Γρήγορη σύνοψη</h5>
                <small className="text-muted">Τα βασικά στοιχεία που βλέπει η ομάδα.</small>
              </div>
            </Card.Header>
            <Card.Body className="d-grid gap-3">
              <div className="summary-metric">
                <span className="summary-label">Τομέας</span>
                <strong>{getSpecialtyLabel(user.specialty)}</strong>
              </div>
              <div className="summary-metric">
                <span className="summary-label">Rotation</span>
                <strong>{getRotationLabel(user.rotationType)}</strong>
              </div>
              <div className="summary-metric">
                <span className="summary-label">Βαθμίδα</span>
                <strong>{getRankLabel(user.rank)}</strong>
              </div>
              <div className="summary-metric">
                <span className="summary-label">Μέλος από</span>
                <strong>{new Date(user.createdAt).toLocaleDateString('el-GR')}</strong>
              </div>
              <div className="summary-metric">
                <span className="summary-label">Τελευταία ενημέρωση</span>
                <strong>{new Date(user.updatedAt).toLocaleDateString('el-GR')}</strong>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Profile;
