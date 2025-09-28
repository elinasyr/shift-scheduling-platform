import React, { useState, useEffect } from 'react';
import { Card, Button, Row, Col, Table, Badge, Modal, Form, Alert } from 'react-bootstrap';
import { Doctor } from '../../types';
import * as api from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';

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
      setError('Failed to load doctors');
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
      setSuccess('Doctor updated successfully!');
      
      // Reload doctors list
      await loadDoctors();
      
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update doctor');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (doctorId: string) => {
    if (!window.confirm('Are you sure you want to delete this doctor? This action cannot be undone.')) {
      return;
    }

    try {
      await api.deleteDoctor(doctorId);
      setSuccess('Doctor deleted successfully!');
      await loadDoctors();
      
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete doctor');
      setTimeout(() => {
        setError('');
      }, 5000);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading doctors..." />;
  }

  return (
    <div>
      <Row className="mb-4">
        <Col>
          <h2>Doctors Management</h2>
          <p className="text-muted">View and manage doctor information</p>
        </Col>
      </Row>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Card className="dashboard-card">
        <Card.Header>
          <h5 className="mb-0">All Doctors ({doctors.length})</h5>
        </Card.Header>
        <Card.Body>
          {doctors.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="d-none d-lg-block">
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Specialty</th>
                      <th>Rank</th>
                      <th>Category</th>
                      <th>Rotation Type</th>
                      <th>Actions</th>
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
                            {doctor.role}
                          </Badge>
                        </td>
                        <td>{doctor.specialty || <span className="text-muted">Not specified</span>}</td>
                        <td>
                          <Badge bg={doctor.rank === 'senior' ? 'warning' : 'info'}>
                            {doctor.rank || 'Not set'}
                          </Badge>
                          {doctor.isNew && <Badge bg="success" className="ms-1">New</Badge>}
                        </td>
                        <td>
                          <Badge bg={doctor.category === 'manager' ? 'primary' : 'secondary'}>
                            {doctor.category || 'Not set'}
                          </Badge>
                        </td>
                        <td>{doctor.rotationType || <span className="text-muted">Not specified</span>}</td>
                        <td>
                          <Button 
                            variant="outline-primary" 
                            size="sm" 
                            onClick={() => handleEdit(doctor)}
                            className="me-2"
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="outline-danger" 
                            size="sm" 
                            onClick={() => handleDelete(doctor.id)}
                          >
                            Delete
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
                          {doctor.role}
                        </Badge>
                      </div>
                      
                      <Row className="mt-3">
                        <Col xs={6}>
                          <small className="text-muted">Specialty:</small>
                          <div>{doctor.specialty || <span className="text-muted">Not specified</span>}</div>
                        </Col>
                        <Col xs={6}>
                          <small className="text-muted">Rank:</small>
                          <div>
                            <Badge bg={doctor.rank === 'senior' ? 'warning' : 'info'}>
                              {doctor.rank || 'Not set'}
                            </Badge>
                            {doctor.isNew && <Badge bg="success" className="ms-1">New</Badge>}
                          </div>
                        </Col>
                      </Row>
                      <Row className="mt-2">
                        <Col xs={6}>
                          <small className="text-muted">Category:</small>
                          <div>
                            <Badge bg={doctor.category === 'manager' ? 'primary' : 'secondary'}>
                              {doctor.category || 'Not set'}
                            </Badge>
                          </div>
                        </Col>
                        <Col xs={6}>
                          <small className="text-muted">Rotation Type:</small>
                          <div>{doctor.rotationType || <span className="text-muted">Not specified</span>}</div>
                        </Col>
                      </Row>
                      
                      <div className="d-flex gap-2 mt-3">
                        <Button 
                          variant="outline-primary" 
                          size="sm" 
                          onClick={() => handleEdit(doctor)}
                          className="flex-grow-1"
                        >
                          Edit
                        </Button>
                        <Button 
                          variant="outline-danger" 
                          size="sm" 
                          onClick={() => handleDelete(doctor.id)}
                          className="flex-grow-1"
                        >
                          Delete
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <Alert variant="info">
              No doctors found in the system.
            </Alert>
          )}
        </Card.Body>
      </Card>

      {/* Edit Doctor Modal */}
      <Modal show={showModal} onHide={handleClose} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            Edit information: {editingDoctor?.firstName} {editingDoctor?.lastName}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}
          
          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>First Name</Form.Label>
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
                  <Form.Label>Last Name</Form.Label>
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
                  <Form.Label>Role</Form.Label>
                  <Form.Select 
                    name="role" 
                    value={formData.role} 
                    onChange={handleChange}
                    required
                  >
                    <option value="doctor">Doctor</option>
                    <option value="manager">Manager & Doctor</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Specialty</Form.Label>
                  <Form.Select 
                    name="specialty" 
                    value={formData.specialty} 
                    onChange={handleChange}
                    required
                  >
                    <option value="cardiology">Cardiology</option>
                    <option value="thoracic">Thoracic</option>
                    <option value="general">General</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Rank (Seniority Level)</Form.Label>
                  <Form.Select 
                    name="rank" 
                    value={formData.rank} 
                    onChange={handleChange}
                    required
                  >
                    <option value="junior">Junior</option>
                    <option value="senior">Senior</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Category (Access Level)</Form.Label>
                  <Form.Select 
                    name="category" 
                    value={formData.category} 
                    onChange={handleChange}
                    required
                  >
                    <option value="doctor">Doctor</option>
                    <option value="manager">Manager</option>
                    <option value="viewer">Viewer</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Rotation Type</Form.Label>
              <Form.Select 
                name="rotationType" 
                value={formData.rotationType} 
                onChange={handleChange}
                required
              >
                <option value="internal">Regular</option>
                <option value="visiting">Visiting from other hospital</option>
                <option value="abroad">Internship abroad</option>
                <option value="outside">Doctors outside of Attikon</option>
              </Form.Select>
            </Form.Group>

            {formData.rank === 'junior' && (
              <Form.Group className="mb-3">
                <Form.Check
                  type="checkbox"
                  name="isNew"
                  checked={formData.isNew}
                  onChange={(e) => setFormData(prev => ({ ...prev, isNew: e.target.checked }))}
                  label="Is New Doctor"
                />
              </Form.Group>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Summary Cards */}
      <Row className="mt-4">
        <Col md={3}>
          <Card className="dashboard-card text-center">
            <Card.Body>
              <h3 className="text-primary">{doctors.length}</h3>
              <small className="text-muted">Total Doctors</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="dashboard-card text-center">
            <Card.Body>
              <h3 className="text-success">
                {doctors.filter(d => d.role === 'manager').length}
              </h3>
              <small className="text-muted">Managers</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="dashboard-card text-center">
            <Card.Body>
              <h3 className="text-info">
                {doctors.filter(d => d.specialty).length}
              </h3>
              <small className="text-muted">With Specialties</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="dashboard-card text-center">
            <Card.Body>
              <h3 className="text-warning">
                {new Set(doctors.map(d => d.specialty).filter(Boolean)).size}
              </h3>
              <small className="text-muted">Unique Specialties</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DoctorsList;
