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
    specialty: '',
    rank: '',
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
      specialty: doctor.specialty || '',
      rank: doctor.rank || '',
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
      specialty: '',
      rank: '',
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
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Specialty</th>
                  <th>Rank</th>
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
                    <td>{doctor.rank || <span className="text-muted">Not specified</span>}</td>
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
            Edit Doctor: {editingDoctor?.firstName} {editingDoctor?.lastName}
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
                  <Form.Control
                    type="text"
                    name="specialty"
                    value={formData.specialty}
                    onChange={handleChange}
                    placeholder="e.g., Cardiology, Surgery"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Rank</Form.Label>
              <Form.Control
                type="text"
                name="rank"
                value={formData.rank}
                onChange={handleChange}
                placeholder="e.g., Resident, Attending, Chief"
              />
            </Form.Group>
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
