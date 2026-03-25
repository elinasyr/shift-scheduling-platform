import React, { useState } from 'react';
import { Card, Form, Button, Row, Col, Image, Alert } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../services/api';

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
    category: (user?.category as 'doctor' | 'manager' | 'viewer') || 'doctor',
    isNew: user?.isNew || false
  });

  const handleChange = (e: React.ChangeEvent<any>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    try {
      setError('');
      setLoading(true);
      
      // Cast the form data to match the expected types
      const profileData = {
        ...formData,
        specialty: formData.specialty as 'cardiology' | 'thoracic' | 'general',
        rank: formData.rank as 'junior' | 'senior',
        rotationType: formData.rotationType as 'outside' | 'visiting' | 'internal' | 'abroad',
        category: formData.category as 'doctor' | 'manager' | 'viewer'
      };
      
      await api.updateProfile(profileData);
      setMessage('Το προφίλ ενημερώθηκε επιτυχώς!');
      setEditing(false);
      
      // Reload the page to refresh user data
      setTimeout(() => {
        window.location.reload();
      }, 1500);
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
      category: (user?.category as 'doctor' | 'manager' | 'viewer') || 'doctor',
      isNew: user?.isNew || false
    });
    setEditing(false);
    setError('');
    setMessage('');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      await api.uploadProfilePhoto(file);
      setMessage('Η φωτογραφία προφίλ ενημερώθηκε επιτυχώς!');
      
      // Reload to refresh the photo
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setError('Αποτυχία μεταφόρτωσης φωτογραφίας');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Row className="mb-4">
        <Col>
          <h2>Προφίλ</h2>
          <p className="text-muted">Διαχειριστείτε τις πληροφορίες του λογαριασμού σας</p>
        </Col>
      </Row>

      {message && <Alert variant="success">{message}</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}

      <Row>
        <Col xs={12} lg={8}>
          <Card className="dashboard-card">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Προσωπικές Πληροφορίες</h5>
              {!editing ? (
                <Button variant="outline-primary" onClick={() => setEditing(true)}>
                  Επεξεργασία Προφίλ
                </Button>
              ) : (
                <div>
                  <Button variant="outline-secondary" onClick={handleCancel} className="me-2">
                    Ακύρωση
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? 'Αποθήκευση...' : 'Αποθήκευση Αλλαγών'}
                  </Button>
                </div>
              )}
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleSubmit}>
                <Row>
                                    <Col xs={12} sm={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Όνομα</Form.Label>
                      <Form.Control
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={12} sm={6}>
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
                  <Form.Label>Διεύθυνση Email</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={!editing}
                    required
                  />
                </Form.Group>

                {(user?.role === 'doctor' || user?.role === 'manager') && (
                  <>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Χειρουργεία</Form.Label>
                          <Form.Select
                            name="specialty"
                            value={formData.specialty}
                            onChange={handleChange}
                            disabled={!editing}
                          >
                          <option value="καρδιολογία">Καρδιολογία</option>
                          <option value="θωρακική">Θωρακική</option>
                          <option value="γενική">Γενική</option>
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
                            <option value="junior">Μικρός/η</option>
                            <option value="senior">Μεγάλος/η</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Κατηγορία (Επίπεδο Πρόσβασης)</Form.Label>
                          <Form.Select
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            disabled={!editing}
                          >
                            <option value="doctor">Ειδικευόμενος</option>
                            <option value="manager">Διαχειριστής</option>
                            <option value="viewer">Θεατής</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Τύπος Rotation</Form.Label>
                          <Form.Select
                            name="rotationType"
                            value={formData.rotationType}
                            onChange={handleChange}
                            disabled={!editing}
                          >
                            <option value="">Επιλέξτε τύπο rotation...</option>
                            <option value="internal">Κανονικός</option>
                            <option value="visiting">Επισκέπτης από άλλο νοσοκομείο</option>
                            <option value="abroad">Πρακτική στο εξωτερικό</option>
                            <option value="outside">Ειδικευόμενοι εκτός Αττικόν</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>
                    {formData.rank === 'junior' && (
                      <Form.Group className="mb-3">
                        <Form.Check
                          type="checkbox"
                          name="isNew"
                          checked={formData.isNew}
                          onChange={(e) => setFormData(prev => ({ ...prev, isNew: e.target.checked }))}
                          disabled={!editing}
                          label="Είναι Νέος Ειδικευόμενος"
                        />
                      </Form.Group>
                    )}
                  </>
                )}

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Όνομα Χρήστη</Form.Label>
                      <Form.Control
                        type="text"
                        value={user?.username || ''}
                        disabled
                        className="bg-light"
                      />
                      <Form.Text className="text-muted">
                        Το όνομα χρήστη δεν μπορεί να αλλάξει
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Ρόλος</Form.Label>
                      <Form.Control
                        type="text"
                        value={user?.role || ''}
                        disabled
                        className="bg-light"
                      />
                      <Form.Text className="text-muted">
                        Ο ρόλος διαχειρίζεται από τους διαχειριστές
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} lg={4}>
          <Card className="dashboard-card">
            <Card.Header>
              <h5 className="mb-0">Φωτογραφία Προφίλ</h5>
            </Card.Header>
            <Card.Body className="text-center">
              {user?.profilePhoto ? (
                <Image 
                  src={user.profilePhoto} 
                  roundedCircle 
                  width={120} 
                  height={120}
                  className="mb-3"
                />
              ) : (
                <div 
                  className="bg-light rounded-circle d-flex align-items-center justify-content-center mb-3 mx-auto"
                  style={{ width: '120px', height: '120px' }}
                >
                  <span className="text-muted fs-3">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </span>
                </div>
              )}
              
              <Form.Group>
                <Form.Label htmlFor="photoUpload" className="btn btn-outline-primary btn-sm">
                  {loading ? 'Μεταφόρτωση...' : 'Αλλαγή Φωτογραφίας'}
                </Form.Label>
                <Form.Control
                  type="file"
                  id="photoUpload"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  style={{ display: 'none' }}
                  disabled={loading}
                />
              </Form.Group>
              
              <small className="text-muted d-block mt-2">
                Υποστηριζόμενες μορφές: JPG, PNG, GIF<br />
                Μέγιστο μέγεθος: 5MB
              </small>
            </Card.Body>
          </Card>

          <Card className="dashboard-card mt-3">
            <Card.Header>
              <h5 className="mb-0">Πληροφορίες Λογαριασμού</h5>
            </Card.Header>
            <Card.Body>
              <p className="mb-2">
                <strong>Μέλος από:</strong><br />
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('el-GR') : 'Άγνωστο'}
              </p>
              <p className="mb-2">
                <strong>Τελευταία ενημέρωση:</strong><br />
                {user?.updatedAt ? new Date(user.updatedAt).toLocaleDateString('el-GR') : 'Άγνωστο'}
              </p>
              {/* <p className="mb-0">
                <strong>User ID:</strong><br />
                <small className="text-muted">{user?.id}</small>
              </p> */}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Profile;
