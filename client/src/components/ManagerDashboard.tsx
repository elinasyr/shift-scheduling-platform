import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Alert, Form, Row, Col, Modal, Badge, Tabs, Tab } from 'react-bootstrap';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { getShifts, getHolidays, getDoctors, createShift, deleteShift, validateSchedule, generateSchedule, clearAllShifts } from '../services/api';
import { Doctor, Shift, Holiday, RuleViolation } from '../types';

const ManagerDashboard: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<number | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<number>(1); // Default to Attikon hospital
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showValidationModal, setShowValidationModal] = useState<boolean>(false);
  const [validationResults, setValidationResults] = useState<{valid: boolean, violations: RuleViolation[]}>({valid: true, violations: []});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOverride, setIsOverride] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState<{year: number, month: number}>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  
  const fetchCalendarData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get the current month's start and end dates
      const startDate = new Date(currentMonth.year, currentMonth.month - 1, 1);
      const endDate = new Date(currentMonth.year, currentMonth.month, 0);
      
      const formattedStartDate = startDate.toISOString().split('T')[0];
      const formattedEndDate = endDate.toISOString().split('T')[0];
      
      // Fetch holidays
      const holidays = await getHolidays(formattedStartDate, formattedEndDate);
      
      // Fetch shifts
      const shifts = await getShifts(formattedStartDate, formattedEndDate);
      
      // Fetch doctors
      const doctorsData = await getDoctors();
      setDoctors(doctorsData);
      
      // Process events
      const holidayEvents = holidays.map(holiday => ({
        title: holiday.name,
        start: holiday.date,
        allDay: true,
        className: 'holiday-event',
        extendedProps: {
          type: 'holiday',
          holiday
        }
      }));
      
      const shiftEvents = shifts.map(shift => ({
        title: `${shift.doctor.name} (${shift.doctor.rank})`,
        start: shift.date,
        allDay: true,
        className: shift.isOverride ? 'shift-event is-override' : 'shift-event',
        extendedProps: {
          type: 'shift',
          shift
        }
      }));
      
      // Combine all events
      setEvents([...holidayEvents, ...shiftEvents]);
      
    } catch (err) {
      console.error('Error fetching calendar data:', err);
      setError('Failed to load calendar data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);
  
  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);
  
  const handleDateClick = (arg: any) => {
    setSelectedDate(arg.dateStr);
    setShowModal(true);
  };
  
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedDate(null);
    setSelectedDoctor(null);
    setIsOverride(false);
  };
  
  const handleAssignShift = async () => {
    if (!selectedDate || !selectedDoctor) return;
    
    try {
      await createShift(selectedDoctor, selectedHospital, selectedDate, isOverride);
      fetchCalendarData(); // Refresh calendar data
      handleCloseModal();
      
      // Show success message
      setSuccessMessage('Shift assigned successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error assigning shift:', err);
      
      // Handle rule violations
      if (err.response && err.response.data && err.response.data.violations) {
        setValidationResults({
          valid: false,
          violations: err.response.data.violations
        });
        handleCloseModal();
        setShowValidationModal(true);
      } else {
        setError('Failed to assign shift. Please try again.');
      }
    }
  };
  
  const handleRemoveShift = async (shiftId: number) => {
    if (!window.confirm('Are you sure you want to remove this shift?')) return;
    
    try {
      await deleteShift(shiftId);
      fetchCalendarData(); // Refresh calendar data
      
      // Show success message
      setSuccessMessage('Shift removed successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error removing shift:', err);
      setError('Failed to remove shift. Please try again.');
    }
  };
  
  const handleEventClick = (info: any) => {
    const { extendedProps } = info.event;
    
    if (extendedProps.type === 'shift') {
      const { shift } = extendedProps;
      
      if (window.confirm(`Remove shift for ${shift.doctor.name} on ${shift.date}?`)) {
        handleRemoveShift(shift.id);
      }
    }
  };
  
  const handleValidateSchedule = async () => {
    try {
      const results = await validateSchedule(currentMonth.year, currentMonth.month, selectedHospital);
      setValidationResults(results);
      setShowValidationModal(true);
    } catch (err) {
      console.error('Error validating schedule:', err);
      setError('Failed to validate schedule. Please try again.');
    }
  };
  
  const handleGenerateSchedule = async () => {
    if (!window.confirm('Are you sure you want to generate a schedule? This may override existing shifts.')) return;
    
    try {
      setLoading(true);
      await generateSchedule(currentMonth.year, currentMonth.month, selectedHospital);
      await fetchCalendarData(); // Refresh calendar data
      
      // Show success message
      setSuccessMessage('Schedule generated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error generating schedule:', err);
      setError('Failed to generate schedule. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleClearAllShifts = async () => {
    if (!window.confirm('Are you sure you want to clear all shifts for the current month? This action cannot be undone.')) return;
    
    try {
      setLoading(true);
      const result = await clearAllShifts(currentMonth.year, currentMonth.month, selectedHospital);
      await fetchCalendarData(); // Refresh calendar data
      
      // Show success message
      setSuccessMessage(`Successfully cleared ${result.deleted_count} shifts`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error clearing shifts:', err);
      setError('Failed to clear shifts. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleMonthChange = (info: any) => {
    const date = info.view.currentStart;
    setCurrentMonth({
      year: date.getFullYear(),
      month: date.getMonth() + 1
    });
  };
  
  return (
    <div className="manager-dashboard">
      <Row>
        <Col md={12}>
          <h2>Manager Dashboard</h2>
          {successMessage && <Alert variant="success">{successMessage}</Alert>}
          {error && <Alert variant="danger">{error}</Alert>}
        </Col>
      </Row>
      
      <Row className="mb-3">
        <Col md={12}>
          <Card className="mb-3">
            <Card.Body>
              <h5>Schedule Generation</h5>
              <p>
                Automatic schedule generation takes into account:
              </p>
              <ul>
                <li><strong>Doctor Preferences</strong> - Preferred days receive highest priority in assignment</li>
                <li><strong>Availability</strong> - Doctors marked as unavailable are excluded from scheduling</li>
                <li><strong>Scheduling Rules</strong> - All hospital policies and legal regulations are enforced</li>
                <li><strong>Workload Balance</strong> - Shifts are distributed fairly among doctors</li>
              </ul>
              <div className="d-flex gap-2">
                <Button variant="primary" onClick={handleValidateSchedule}>
                  Validate Schedule
                </Button>
                <Button variant="success" onClick={handleGenerateSchedule}>
                  Generate Schedule
                </Button>
                <Button variant="danger" onClick={handleClearAllShifts}>
                  Clear All Shifts
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Tabs defaultActiveKey="calendar" id="manager-tabs">
        <Tab eventKey="calendar" title="Schedule Calendar">
          <Card>
            <Card.Body>
              <div className="shift-legend">
                <div className="legend-item">
                  <div className="legend-color color-holiday"></div>
                  <span>Holiday</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color color-shift"></div>
                  <span>Shift</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color color-override"></div>
                  <span>Override</span>
                </div>
              </div>
              
              {loading ? (
                <p>Loading calendar data...</p>
              ) : (
                <FullCalendar
                  plugins={[dayGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  events={events}
                  dateClick={handleDateClick}
                  eventClick={handleEventClick}
                  headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth'
                  }}
                  datesSet={handleMonthChange}
                  height="auto"
                />
              )}
            </Card.Body>
          </Card>
        </Tab>
        
        <Tab eventKey="shifts" title="Current Shifts">
          <Card>
            <Card.Body>
              <h4>Shifts for {new Date(currentMonth.year, currentMonth.month - 1).toLocaleString('default', { month: 'long' })} {currentMonth.year}</h4>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Doctor</th>
                    <th>Rank</th>
                    <th>Hospital</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events
                    .filter(event => event.extendedProps?.type === 'shift')
                    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                    .map((event, index) => {
                      const { shift } = event.extendedProps;
                      return (
                        <tr key={index}>
                          <td>{new Date(shift.date).toLocaleDateString()}</td>
                          <td>{shift.doctor.name}</td>
                          <td>{shift.doctor.rank}</td>
                          <td>{shift.hospital.name}</td>
                          <td>
                            {shift.isOverride ? (
                              <Badge bg="info">Override</Badge>
                            ) : (
                              <Badge bg="primary">Regular</Badge>
                            )}
                          </td>
                          <td>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleRemoveShift(shift.id)}
                            >
                              Remove
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  {events.filter(event => event.extendedProps?.type === 'shift').length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center">No shifts scheduled for this month</td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
      
      {/* Shift Assignment Modal */}
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>Assign Shift for {selectedDate}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Doctor</Form.Label>
              <Form.Select
                value={selectedDoctor || ''}
                onChange={(e) => setSelectedDoctor(Number(e.target.value))}
              >
                <option value="">Select a doctor</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.firstName} {doctor.lastName} ({doctor.rank})
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Override scheduling rules"
                checked={isOverride}
                onChange={(e) => setIsOverride(e.target.checked)}
              />
              {isOverride && (
                <Alert variant="warning" className="mt-2">
                  <small>
                    Warning: Overriding scheduling rules may create conflicts in the schedule.
                    Use this option only when necessary.
                  </small>
                </Alert>
              )}
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleAssignShift}
            disabled={!selectedDoctor}
          >
            Assign Shift
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Validation Results Modal */}
      <Modal show={showValidationModal} onHide={() => setShowValidationModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Schedule Validation Results</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {validationResults.valid ? (
            <>
              <Alert variant="success">
                The schedule passes all rules and constraints.
              </Alert>
              <div className="mt-3">
                <h6>Preference Utilization</h6>
                <p>
                  The generated schedule has maximized doctor preferences where possible while maintaining compliance with hospital policies and regulations. 
                  Doctors who marked dates as "Preferred" were given priority for those shifts.
                </p>
              </div>
            </>
          ) : (
            <>
              <Alert variant="warning">
                The schedule has {validationResults.violations.length} rule violations:
              </Alert>
              <Table striped bordered>
                <thead>
                  <tr>
                    <th>Rule</th>
                    <th>Description</th>
                    <th>Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {validationResults.violations.map((violation, index) => (
                    <tr key={index}>
                      <td>{violation.rule}</td>
                      <td>{violation.description}</td>
                      <td>
                        <Badge bg={violation.severity === 'error' ? 'danger' : 'warning'}>
                          {violation.severity}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowValidationModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ManagerDashboard;
