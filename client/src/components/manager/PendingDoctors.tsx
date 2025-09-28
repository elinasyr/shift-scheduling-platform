import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Badge, Modal, Form, Alert, Spinner } from 'react-bootstrap';
import { User, ApprovalData } from '../../types';
import * as api from '../../services/api';

const PendingDoctors: React.FC = () => {
  const [pendingDoctors, setPendingDoctors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<User | null>(null);
  const [approvalData, setApprovalData] = useState<ApprovalData>({
    role: 'doctor',
    specialty: 'general',
    rank: 'junior',
    rotationType: 'internal',
    isNew: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadPendingDoctors();
  }, []);

  const loadPendingDoctors = async () => {
    try {
      setLoading(true);
      const doctors = await api.getPendingDoctors();
      setPendingDoctors(doctors);
    } catch (error) {
      console.error('Failed to load pending doctors:', error);
      setError('Failed to load pending doctors');
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalClick = (doctor: User) => {
    setSelectedDoctor(doctor);
    setShowApprovalModal(true);
    setMessage('');
    setError('');
  };

  const handleApproval = async () => {
    if (!selectedDoctor) return;

    try {
      setSubmitting(true);
      setError('');
      await api.approveDoctor(selectedDoctor.id, approvalData);
      
      setMessage(`${selectedDoctor.firstName} ${selectedDoctor.lastName} has been approved successfully!`);
      setShowApprovalModal(false);
      
      // Reload pending doctors
      await loadPendingDoctors();
      
      // Reset form
      setApprovalData({
        role: 'doctor',
        specialty: 'general',
        rank: 'junior',
        rotationType: 'internal',
        isNew: false
      });
      
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to approve doctor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<any>) => {
    const { name, value } = e.target;
    setApprovalData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" />
        <p className="mt-2">Loading pending approvals...</p>
      </div>
    );
  }

  return (
    <>
      <Card className="dashboard-card">
        <Card.Header>
          <h5 className="mb-0">Pending Doctor Approvals</h5>
        </Card.Header>
        <Card.Body>
          {message && <Alert variant="success">{message}</Alert>}
          {error && <Alert variant="danger">{error}</Alert>}

          {pendingDoctors.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted">No pending approvals.</p>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <Table striped hover>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Username</th>
                      <th>Registered</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingDoctors.map((doctor) => (
                      <tr key={doctor.id}>
                        <td>
                          <strong>{doctor.firstName} {doctor.lastName}</strong>
                        </td>
                        <td>{doctor.email}</td>
                        <td>{doctor.username}</td>
                        <td>
                          {doctor.createdAt ? new Date(doctor.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleApprovalClick(doctor)}
                          >
                            Approve
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              {/* Mobile card view for small screens */}
              <div className="mobile-card-table">
                {pendingDoctors.map((doctor) => (
                  <div key={doctor.id} className="mobile-table-card">
                    <div className="mobile-table-row">
                      <span className="mobile-table-label">Name:</span>
                      <span className="mobile-table-value">
                        <strong>{doctor.firstName} {doctor.lastName}</strong>
                      </span>
                    </div>
                    <div className="mobile-table-row">
                      <span className="mobile-table-label">Email:</span>
                      <span className="mobile-table-value">{doctor.email}</span>
                    </div>
                    <div className="mobile-table-row">
                      <span className="mobile-table-label">Username:</span>
                      <span className="mobile-table-value">{doctor.username}</span>
                    </div>
                    <div className="mobile-table-row">
                      <span className="mobile-table-label">Registered:</span>
                      <span className="mobile-table-value">
                        {doctor.createdAt ? new Date(doctor.createdAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div className="mobile-table-row">
                      <span className="mobile-table-label">Actions:</span>
                      <span className="mobile-table-value">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleApprovalClick(doctor)}
                        >
                          Approve
                        </Button>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card.Body>
      </Card>

      {/* Approval Modal */}
      <Modal show={showApprovalModal} onHide={() => setShowApprovalModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Approve Doctor</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedDoctor && (
            <>
              <p>
                <strong>Approving:</strong> {selectedDoctor.firstName} {selectedDoctor.lastName}
              </p>
              
              {error && <Alert variant="danger">{error}</Alert>}

              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Category</Form.Label>
                  <Form.Select
                    name="role"
                    value={approvalData.role}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="doctor">Junior</option>
                    <option value="manager">Senior</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Specialty</Form.Label>
                  <Form.Select
                    name="specialty"
                    value={approvalData.specialty}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="general">General</option>
                    <option value="cardiology">Cardiology</option>
                    <option value="thoracic">Thoracic</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Rotation Type</Form.Label>
                  <Form.Select
                    name="rotationType"
                    value={approvalData.rotationType}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="internal">Regular</option>
                    <option value="visiting">Visiting from other hospital</option>
                    <option value="abroad">Internship abroad</option>
                    <option value="outside">Doctors outside of Attikon</option>
                  </Form.Select>
                </Form.Group>

                {approvalData.role === 'doctor' && (
                  <Form.Group className="mb-3">
                    <Form.Check
                      type="checkbox"
                      name="isNew"
                      checked={approvalData.isNew || false}
                      onChange={(e) => setApprovalData(prev => ({ ...prev, isNew: e.target.checked }))}
                      label="Is New Doctor"
                    />
                  </Form.Group>
                )}
              </Form>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowApprovalModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleApproval}
            disabled={submitting}
          >
            {submitting ? 'Approving...' : 'Approve Doctor'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default PendingDoctors;