import React, { useState, useEffect } from 'react';
import { Card, Button, Row, Col, Alert, Table, Badge, Modal, Form } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { Schedule, Doctor, DayAvailability, GenerateScheduleRequest } from '../../types';
import * as api from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';

const ManagerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [allAvailability, setAllAvailability] = useState<{ [doctorId: string]: DayAvailability[] }>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, [currentDate]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Create a date set to the 1st of current month to avoid day overflow issues
      const baseDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const startDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1);
      const endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 2, 0);
      
      // Format dates as YYYY-MM-DD without timezone issues
      const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
      const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

      console.log('Date calculations:', {
        baseDate: baseDate.toDateString(),
        startDate: startDate.toDateString(),
        endDate: endDate.toDateString(),
        startDateStr,
        endDateStr
      });

      const [scheduleData, doctorsData, availabilityData] = await Promise.all([
        api.getSchedule(startDateStr, endDateStr),
        api.getAllDoctors(),
        api.getAllAvailability(startDateStr, endDateStr)
      ]);

      setSchedule(scheduleData);
      setDoctors(doctorsData);
      setAllAvailability(availabilityData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSchedule = async () => {
    try {
      setGenerating(true);
      setError('');
      
      // Create a date set to the 1st of current month to avoid day overflow issues
      const baseDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const startDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1);
      const endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 2, 0);
      
      // Format dates as YYYY-MM-DD without timezone issues
      const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
      const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

      console.log('Generate schedule date calculations:', {
        baseDate: baseDate.toDateString(),
        startDate: startDate.toDateString(),
        endDate: endDate.toDateString(),
        startDateStr,
        endDateStr
      });

      const doctorIds = doctors.map(d => d.id);
      const preferences = Object.values(allAvailability).flat();

      const request: GenerateScheduleRequest = {
        startDate: startDateStr,
        endDate: endDateStr,
        doctorIds,
        preferences
      };

      const result = await api.generateSchedule(request);
      
      if (result.success) {
        setMessage('Schedule generated successfully!');
        await loadDashboardData();
      } else {
        setError('Failed to generate schedule: ' + (result.conflicts?.join(', ') || 'Unknown error'));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate schedule');
    } finally {
      setGenerating(false);
    }
  };

  const handleEditSchedule = (scheduleItem: Schedule) => {
    setEditingSchedule(scheduleItem);
    setSelectedDoctors([...scheduleItem.doctorIds]);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingSchedule) return;

    try {
      setSaving(true);
      await api.updateSchedule(editingSchedule.date, selectedDoctors);
      setMessage('Schedule updated successfully!');
      setShowEditModal(false);
      await loadDashboardData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update schedule');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalizeSchedule = async () => {
    if (!window.confirm('Are you sure you want to finalize this schedule? This action cannot be undone.')) {
      return;
    }

    try {
      setSaving(true);
      // Create a date set to the 1st of current month to avoid day overflow issues
      const baseDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const startDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1);
      const endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 2, 0);
      
      // Format dates as YYYY-MM-DD without timezone issues
      const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
      const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

      console.log('Finalize schedule date calculations:', {
        baseDate: baseDate.toDateString(),
        startDate: startDate.toDateString(),
        endDate: endDate.toDateString(),
        startDateStr,
        endDateStr
      });

      await api.finalizeSchedule(startDateStr, endDateStr);
      setMessage('Schedule finalized successfully!');
      await loadDashboardData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to finalize schedule');
    } finally {
      setSaving(false);
    }
  };

  const getDoctorName = (doctorId: string) => {
    const doctor = doctors.find(d => d.id === doctorId);
    return doctor ? `${doctor.firstName} ${doctor.lastName}` : 'Unknown Doctor';
  };

  const getDoctorAvailability = (doctorId: string, date: string) => {
    const availability = allAvailability[doctorId];
    if (!availability) return null;
    return availability.find(a => a.date === date);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  if (loading) {
    return <LoadingSpinner message="Loading manager dashboard..." />;
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const hasSchedule = schedule.length > 0;
  const hasDraftSchedule = schedule.some(s => !s.isFinalized);

  // Display the month we're actually scheduling for (next month)
  const baseDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const schedulingMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1);

  return (
    <div>
      <Row className="mb-4">
        <Col>
          <h2>Manager Dashboard</h2>
          <p className="text-muted">Generate and manage doctor schedules</p>
        </Col>
      </Row>

      {message && <Alert variant="success">{message}</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}

      {/* Month Navigation and Actions */}
      <Card className="dashboard-card mb-4">
        <Card.Header>
          {/* Mobile-friendly layout */}
          <div className="d-block d-lg-flex justify-content-between align-items-center">
            {/* Month navigation */}
            <div className="d-flex align-items-center justify-content-center mb-3 mb-lg-0">
              <Button variant="outline-primary" onClick={prevMonth} className="me-2" size="sm">
                ← Prev
              </Button>
              <h5 className="mb-0 mx-2 text-center">
                <span className="d-none d-sm-inline">Scheduling for: </span>
                {monthNames[schedulingMonth.getMonth()]} {schedulingMonth.getFullYear()}
              </h5>
              <Button variant="outline-primary" onClick={nextMonth} className="ms-2" size="sm">
                Next →
              </Button>
            </div>
            
            {/* Action buttons */}
            <div className="d-flex flex-column flex-sm-row gap-2 justify-content-center">
              <Button 
                variant="primary" 
                onClick={handleGenerateSchedule}
                disabled={generating}
                className="flex-fill"
                size="sm"
              >
                {generating ? 'Generating...' : 'Generate Schedule'}
              </Button>
              {hasSchedule && hasDraftSchedule && (
                <Button 
                  variant="success" 
                  onClick={handleFinalizeSchedule}
                  disabled={saving}
                  className="flex-fill"
                  size="sm"
                >
                  {saving ? 'Finalizing...' : 'Finalize Schedule'}
                </Button>
              )}
            </div>
          </div>
        </Card.Header>
      </Card>

      {/* Schedule Overview */}
      {hasSchedule ? (
        <Card className="dashboard-card mb-4">
          <Card.Header>
            <h5 className="mb-0">Schedule Overview</h5>
          </Card.Header>
          <Card.Body>
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Assigned Doctors</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((shift) => (
                  <tr key={shift.id}>
                    <td>{new Date(shift.date).toLocaleDateString()}</td>
                    <td>{new Date(shift.date).toLocaleDateString('en-US', { weekday: 'long' })}</td>
                    <td>
                      {shift.doctorIds.length > 0 ? (
                        shift.doctorIds.map(doctorId => getDoctorName(doctorId)).join(', ')
                      ) : (
                        <span className="text-muted">No assignments</span>
                      )}
                    </td>
                    <td>
                      <Badge bg={shift.isFinalized ? 'success' : 'warning'}>
                        {shift.isFinalized ? 'Finalized' : 'Draft'}
                      </Badge>
                    </td>
                    <td>
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        onClick={() => handleEditSchedule(shift)}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      ) : (
        <Alert variant="info">
          No schedule has been generated for this month. Click "Generate Schedule" to create one based on doctor preferences.
        </Alert>
      )}

      {/* Doctor Availability Overview */}
      <Card className="dashboard-card">
        <Card.Header>
          <h5 className="mb-0">Doctor Availability Summary</h5>
        </Card.Header>
        <Card.Body>
          <Table responsive striped>
            <thead>
              <tr>
                <th>Doctor</th>
                <th>Role</th>
                <th>Specialty</th>
                <th>Available Days</th>
                <th>Unavailable Days</th>
                <th>Holiday Days</th>
              </tr>
            </thead>
            <tbody>
              {doctors.map((doctor) => {
                const availability = allAvailability[doctor.id] || [];
                const availableDays = availability.filter(a => a.isAvailable).length;
                const unavailableDays = availability.filter(a => a.isUnavailable).length;
                const holidayDays = availability.filter(a => a.isHoliday).length;

                return (
                  <tr key={doctor.id}>
                    <td>
                      <strong>{doctor.firstName} {doctor.lastName}</strong>
                    </td>
                    <td>
                      <Badge bg={doctor.role === 'manager' ? 'primary' : 'secondary'}>
                        {doctor.role}
                      </Badge>
                    </td>
                    <td>{doctor.specialty || <span className="text-muted">Not specified</span>}</td>
                    <td>
                      <Badge bg="success">{availableDays}</Badge>
                    </td>
                    <td>
                      <Badge bg="danger">{unavailableDays}</Badge>
                    </td>
                    <td>
                      <Badge bg="warning">{holidayDays}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Edit Schedule Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            Edit Schedule for {editingSchedule?.date ? new Date(editingSchedule.date).toLocaleDateString() : ''}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>Assign Doctors for this Day</Form.Label>
              {doctors.map((doctor) => {
                const availability = editingSchedule ? getDoctorAvailability(doctor.id, editingSchedule.date) : null;
                const isAvailable = availability?.isAvailable ?? true;
                
                return (
                  <Form.Check
                    key={doctor.id}
                    type="checkbox"
                    id={`doctor-${doctor.id}`}
                    label={
                      <span>
                        {doctor.firstName} {doctor.lastName} 
                        {doctor.specialty && <Badge bg="secondary" className="ms-2">{doctor.specialty}</Badge>}
                        {!isAvailable && <Badge bg="danger" className="ms-2">Unavailable</Badge>}
                      </span>
                    }
                    checked={selectedDoctors.includes(doctor.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedDoctors([...selectedDoctors, doctor.id]);
                      } else {
                        setSelectedDoctors(selectedDoctors.filter(id => id !== doctor.id));
                      }
                    }}
                    disabled={!isAvailable}
                    className="mb-2"
                  />
                );
              })}
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSaveEdit}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ManagerDashboard;
