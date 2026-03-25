import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Modal, Form, Alert, Spinner } from 'react-bootstrap';
import { User, ApprovalData } from '../../types';
import * as api from '../../services/api';
import { RANK_OPTIONS, ROTATION_OPTIONS, SPECIALTY_OPTIONS } from '../../utils/medical';

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
      setError('Αποτυχία φόρτωσης ειδικευομένων σε αναμονή');
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
      
      setMessage(`${selectedDoctor.firstName} ${selectedDoctor.lastName} εγκρίθηκε επιτυχώς!`);
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
      setError(error.response?.data?.error || 'Αποτυχία έγκρισης ειδικευόμενου');
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
        <p className="mt-2">Φόρτωση εγκρίσεων σε αναμονή...</p>
      </div>
    );
  }

  return (
    <>
      <Card className="dashboard-card">
        <Card.Header>
          <h5 className="mb-0">Εγκρίσεις Ειδικευομένων σε Αναμονή</h5>
        </Card.Header>
        <Card.Body>
          {message && <Alert variant="success">{message}</Alert>}
          {error && <Alert variant="danger">{error}</Alert>}

          {pendingDoctors.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted">Δεν υπάρχουν εγκρίσεις σε αναμονή.</p>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <Table striped hover>
                  <thead>
                    <tr>
                      <th>Όνομα</th>
                      <th>Email</th>
                      <th>Όνομα Χρήστη</th>
                      <th>Εγγραφή</th>
                      <th>Ενέργειες</th>
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
                          {doctor.createdAt ? new Date(doctor.createdAt).toLocaleDateString('el-GR') : 'Μ/Δ'}
                        </td>
                        <td>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleApprovalClick(doctor)}
                          >
                            Έγκριση
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
                      <span className="mobile-table-label">Όνομα:  </span>
                      <span className="mobile-table-value">
                        <strong>{doctor.firstName} {doctor.lastName}</strong>
                      </span>
                    </div>
                    <div className="mobile-table-row">
                      <span className="mobile-table-label">Email:</span>
                      <span className="mobile-table-value">{doctor.email}</span>
                    </div>
                    <div className="mobile-table-row">
                      <span className="mobile-table-label">Όνομα Χρήστη:  </span>
                      <span className="mobile-table-value">{doctor.username}</span>
                    </div>
                    <div className="mobile-table-row">
                      <span className="mobile-table-label">Εγγραφή:  </span>
                      <span className="mobile-table-value">
                        {doctor.createdAt ? new Date(doctor.createdAt).toLocaleDateString('el-GR') : 'Μ/Δ'}
                      </span>
                    </div>
                    <div className="mobile-table-row">
                      <span className="mobile-table-label">Ενέργειες:  </span>
                      <span className="mobile-table-value">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleApprovalClick(doctor)}
                        >
                          Έγκριση
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
          <Modal.Title>Έγκριση Ειδικευόμενου</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedDoctor && (
            <>
              <p>
                <strong>Έγκριση:</strong> {selectedDoctor.firstName} {selectedDoctor.lastName}
              </p>
              
              {error && <Alert variant="danger">{error}</Alert>}

              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Ρόλος πρόσβασης</Form.Label>
                  <Form.Select
                    name="role"
                    value={approvalData.role}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="doctor">Ειδικευόμενος</option>
                    <option value="manager">Διαχειριστής</option>
                    <option value="viewer">Θεατής</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Τομέας</Form.Label>
                  <Form.Select
                    name="specialty"
                    value={approvalData.specialty}
                    onChange={handleInputChange}
                    required
                  >
                    {SPECIALTY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Βαθμίδα</Form.Label>
                  <Form.Select
                    name="rank"
                    value={approvalData.rank}
                    onChange={handleInputChange}
                    required
                  >
                    {RANK_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Τύπος Rotation</Form.Label>
                  <Form.Select
                    name="rotationType"
                    value={approvalData.rotationType}
                    onChange={handleInputChange}
                    required
                  >
                    {ROTATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                {approvalData.role === 'doctor' && (
                  <Form.Group className="mb-3">
                    <Form.Check
                      type="checkbox"
                      name="isNew"
                      checked={approvalData.isNew || false}
                      onChange={(e) => setApprovalData(prev => ({ ...prev, isNew: e.target.checked }))}
                      label="Είναι Νέος Ειδικευόμενος"
                    />
                  </Form.Group>
                )}
              </Form>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowApprovalModal(false)}>
            Ακύρωση
          </Button>
          <Button
            variant="primary"
            onClick={handleApproval}
            disabled={submitting}
          >
            {submitting ? 'Έγκριση...' : 'Έγκριση Ειδικευόμενου'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default PendingDoctors;
