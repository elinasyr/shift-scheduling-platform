import React, { useState, useEffect } from 'react';
import { Card, Button, Row, Col, Table, Badge, Modal, Form, Alert } from 'react-bootstrap';
import { Doctor } from '../../types';
import * as api from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import {
  CATEGORY_OPTIONS,
  RANK_OPTIONS,
  ROTATION_OPTIONS,
  SPECIALTY_OPTIONS,
  getCategoryLabel,
  getRankLabel,
  getRotationLabel,
  getRoleLabel,
  getSpecialtyLabel
} from '../../utils/medical';

const DoctorsList: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
      specialty: 'general' as 'cardiology' | 'thoracic' | 'general',
    rank: 'junior' as 'junior' | 'senior',
    rotationType: 'internal' as 'outside' | 'visiting' | 'internal' | 'abroad',
    category: 'doctor' as 'doctor' | 'manager' | 'viewer',
    isNew: false,
    role: 'doctor' as 'doctor' | 'manager'
  });

  useEffect(() => {
    loadDoctors();
  }, []);

  const loadDoctors = async () => {
    try {
      setLoading(true);
      const doctorsData = await api.getAllDoctors();
      setDoctors(doctorsData);
    } catch (error) {
      console.error('Failed to load doctors:', error);
      setError('Αποτυχία φόρτωσης ειδικευομένων');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setFormData({
      firstName: doctor.firstName,
      lastName: doctor.lastName,
      email: doctor.email,
      specialty: (doctor.specialty as 'cardiology' | 'thoracic' | 'general') || 'general',
      rank: (doctor.rank as 'junior' | 'senior') || 'junior',
      rotationType: (doctor.rotationType as 'outside' | 'visiting' | 'internal' | 'abroad') || 'internal',
      category: (doctor.category as 'doctor' | 'manager' | 'viewer') || 'doctor',
      isNew: doctor.isNew || false,
      role: doctor.role as 'doctor' | 'manager'
    });
    setShowModal(true);
    setError('');
    setSuccess('');
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingDoctor(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      specialty: 'general',
      rank: 'junior',
      rotationType: 'internal',
      category: 'doctor',
      isNew: false,
      role: 'doctor'
    });
    setError('');
    setSuccess('');
  };

  const handleChange = (e: React.ChangeEvent<any>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoctor) return;

    try {
      setError('');
      setSaving(true);
      
      await api.updateDoctor(editingDoctor.id, formData);
      setSuccess('Ο ειδικευόμενος ενημερώθηκε επιτυχώς!');
      
      // Reload doctors list
      await loadDoctors();
      
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Αποτυχία ενημέρωσης ειδικευόμενου');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (doctorId: string) => {
    if (!window.confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτόν τον ειδικευόμενο; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.')) {
      return;
    }

    try {
      await api.deleteDoctor(doctorId);
      setSuccess('Ο ειδικευόμενος διαγράφηκε επιτυχώς!');
      await loadDoctors();
      
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Αποτυχία διαγραφής ειδικευόμενου');
      setTimeout(() => {
        setError('');
      }, 5000);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Φόρτωση ειδικευομένων..." />;
  }

  return (
    <div className='box-around'>
      <Row className="mb-4">
        <Col>
          <h2>Διαχείριση Ειδικευομένων</h2>
          <p className="text-muted">Προβολή και διαχείριση πληροφοριών ειδικευομένων</p>
        </Col>
      </Row>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Card className="dashboard-card">
        <Card.Header>
          <h5 className="mb-0">Όλοι οι Ειδικευόμενοι ({doctors.length})</h5>
        </Card.Header>
        <Card.Body>
          {doctors.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="d-none d-lg-block">
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Όνομα</th>
                      <th>Email</th>
                      <th>Ρόλος</th>
                      <th>Χειρουργεία</th>
                      <th>Βαθμίδα</th>
                      <th>Κατηγορία</th>
                      <th>Τύπος Rotation</th>
                      <th>Ενέργειες</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctors.map((doctor) => (
                      <tr key={doctor.id}>
                        <td>
                          <div className="d-flex align-items-center">
                            {doctor.profilePhoto ? (
                              <img 
                                src={doctor.profilePhoto} 
                                alt="Profile"
                                className="rounded-circle me-2"
                                width={32}
                                height={32}
                              />
                            ) : (
                              <div 
                                className="bg-secondary rounded-circle d-flex align-items-center justify-content-center me-2"
                                style={{ width: '32px', height: '32px', fontSize: '12px' }}
                              >
                                {doctor.firstName[0]}{doctor.lastName[0]}
                              </div>
                            )}
                            <div>
                              <strong>{doctor.firstName} {doctor.lastName}</strong>
                              <br />
                              <small className="text-muted">{doctor.username}</small>
                            </div>
                          </div>
                        </td>
                        <td>{doctor.email}</td>
                        <td>
                          <Badge bg={doctor.role === 'manager' ? 'primary' : 'secondary'}>
                            {getRoleLabel(doctor.role)}
                          </Badge>
                        </td>
                        <td>{getSpecialtyLabel(doctor.specialty)}</td>
                        <td>
                          <Badge bg={doctor.rank === 'senior' ? 'warning' : 'info'}>
                            {getRankLabel(doctor.rank)}
                          </Badge>
                          {doctor.isNew && <Badge bg="success" className="ms-1">Νέος</Badge>}
                        </td>
                        <td>
                          <Badge bg={doctor.category === 'manager' ? 'primary' : 'secondary'}>
                            {getCategoryLabel(doctor.category)}
                          </Badge>
                        </td>
                        <td>{getRotationLabel(doctor.rotationType)}</td>
                        <td>
                          <Button 
                            variant="outline-primary" 
                            size="sm" 
                            onClick={() => handleEdit(doctor)}
                            className="me-2"
                          >
                            Επεξεργασία
                          </Button>
                          <Button 
                            variant="outline-danger" 
                            size="sm" 
                            onClick={() => handleDelete(doctor.id)}
                          >
                            Διαγραφή
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="d-lg-none">
                {doctors.map((doctor) => (
                  <Card key={doctor.id} className="doctor-list-item mb-3">
                    <Card.Body>
                      <div className="d-flex align-items-start justify-content-between">
                        <div className="d-flex align-items-center flex-grow-1">
                          {doctor.profilePhoto ? (
                            <img 
                              src={doctor.profilePhoto} 
                              alt="Profile"
                              className="rounded-circle me-3"
                              width={40}
                              height={40}
                            />
                          ) : (
                            <div 
                              className="bg-secondary rounded-circle d-flex align-items-center justify-content-center me-3"
                              style={{ width: '40px', height: '40px', fontSize: '14px' }}
                            >
                              {doctor.firstName[0]}{doctor.lastName[0]}
                            </div>
                          )}
                          <div className="flex-grow-1">
                            <h6 className="mb-1">{doctor.firstName} {doctor.lastName}</h6>
                            <small className="text-muted d-block">{doctor.username}</small>
                            <small className="text-muted">{doctor.email}</small>
                          </div>
                        </div>
                        <Badge bg={doctor.role === 'manager' ? 'primary' : 'secondary'} className="ms-2">
                          {getRoleLabel(doctor.role)}
                        </Badge>
                      </div>
                      
                      <Row className="mt-3">
                        <Col xs={6}>
                          <small className="text-muted">Τύπος χειρουργείων:</small>
                          <div>{getSpecialtyLabel(doctor.specialty)}</div>
                        </Col>
                        <Col xs={6}>
                          <small className="text-muted">Βαθμίδα:</small>
                          <div>
                            <Badge bg={doctor.rank === 'senior' ? 'warning' : 'info'}>
                              {getRankLabel(doctor.rank)}
                            </Badge>
                            {doctor.isNew && <Badge bg="success" className="ms-1">Νέος</Badge>}
                          </div>
                        </Col>
                      </Row>
                      <Row className="mt-2">
                        <Col xs={6}>
                          <small className="text-muted">Κατηγορία:</small>
                          <div>
                            <Badge bg={doctor.category === 'manager' ? 'primary' : 'secondary'}>
                              {getCategoryLabel(doctor.category)}
                            </Badge>
                          </div>
                        </Col>
                        <Col xs={6}>
                          <small className="text-muted">Τύπος Rotation:</small>
                          <div>{getRotationLabel(doctor.rotationType)}</div>
                        </Col>
                      </Row>
                      
                      <div className="d-flex gap-2 mt-3">
                        <Button 
                          variant="outline-primary" 
                          size="sm" 
                          onClick={() => handleEdit(doctor)}
                          className="flex-grow-1"
                        >
                          Επεξεργασία
                        </Button>
                        <Button 
                          variant="outline-danger" 
                          size="sm" 
                          onClick={() => handleDelete(doctor.id)}
                          className="flex-grow-1"
                        >
                          Διαγραφή
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <Alert variant="info">
              Δεν βρέθηκαν ειδικευόμενοι στο σύστημα.
            </Alert>
          )}
        </Card.Body>
      </Card>

      {/* Edit Doctor Modal */}
      <Modal show={showModal} onHide={handleClose} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            Επεξεργασία πληροφοριών: {editingDoctor?.firstName} {editingDoctor?.lastName}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}
          
          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
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
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Επώνυμο</Form.Label>
                  <Form.Control
                    type="text"
                    name="lastName"
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
                value={formData.email}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Ρόλος</Form.Label>
                  <Form.Select 
                    name="role" 
                    value={formData.role} 
                    onChange={handleChange}
                    required
                  >
                    <option value="doctor">Ειδικευόμενος</option>
                    <option value="manager">Διαχειριστής</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Τομέας</Form.Label>
                  <Form.Select 
                    name="specialty" 
                    value={formData.specialty} 
                    onChange={handleChange}
                    required
                  >
                    {SPECIALTY_OPTIONS.map((option) => (
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
                  <Form.Label>Βαθμίδα (Επίπεδο Αρχαιότητας)</Form.Label>
                  <Form.Select 
                    name="rank" 
                    value={formData.rank} 
                    onChange={handleChange}
                    required
                  >
                    {RANK_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Κατηγορία (Επίπεδο Πρόσβασης)</Form.Label>
                  <Form.Select 
                    name="category" 
                    value={formData.category} 
                    onChange={handleChange}
                    required
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Τύπος Rotation</Form.Label>
              <Form.Select 
                name="rotationType" 
                value={formData.rotationType} 
                onChange={handleChange}
                required
              >
                {ROTATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            {formData.rank === 'junior' && (
              <Form.Group className="mb-3">
                <Form.Check
                  type="checkbox"
                  name="isNew"
                  checked={formData.isNew}
                  onChange={(e) => setFormData(prev => ({ ...prev, isNew: e.target.checked }))}
                  label="Είναι Νέος Ειδικευόμενος"
                />
              </Form.Group>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Ακύρωση
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? 'Αποθήκευση...' : 'Αποθήκευση Αλλαγών'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Summary Cards */}
      <Row className="mt-4">
        <Col md={3}>
          <Card className="dashboard-card text-center">
            <Card.Body>
              <h3 className="text-primary">{doctors.length}</h3>
              <small className="text-muted">Σύνολο Ειδικευομένων</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="dashboard-card text-center">
            <Card.Body>
              <h3 className="text-success">
                {doctors.filter(d => d.role === 'manager').length}
              </h3>
              <small className="text-muted">Διαχειριστές</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="dashboard-card text-center">
            <Card.Body>
              <h3 className="text-info">
                {doctors.filter(d => d.specialty).length}
              </h3>
              <small className="text-muted">Με Ειδικότητες</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="dashboard-card text-center">
            <Card.Body>
              <h3 className="text-warning">
                {new Set(doctors.map(d => d.specialty).filter(Boolean)).size}
              </h3>
              <small className="text-muted">Μοναδικές Ειδικότητες</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DoctorsList;
