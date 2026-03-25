import React, { useEffect, useState } from 'react';
import { Alert, Badge, Button, ButtonGroup, Card, Col, Form, Modal, Row, Tab, Table, Tabs } from 'react-bootstrap';
import { DayAvailability, Doctor, GenerateScheduleRequest, HospitalDay, Schedule } from '../../types';
import * as api from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import HospitalScheduleManager from './HospitalScheduleManager';
import PendingDoctors from './PendingDoctors';
import {
  MONTH_NAMES,
  formatDateLocal,
  formatDisplayDate,
  formatWeekdayLong,
  getRankLabel,
  getSpecialtyLabel
} from '../../utils/medical';

const ManagerDashboard: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [allAvailability, setAllAvailability] = useState<{ [doctorId: string]: DayAvailability[] }>({});
  const [hospitalDays, setHospitalDays] = useState<HospitalDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);
  const [assignmentsViewMode, setAssignmentsViewMode] = useState<'calendar' | 'list'>('calendar');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        const startDateStr = formatDateLocal(startDate);
        const endDateStr = formatDateLocal(endDate);

        const [scheduleData, doctorsData, availabilityData, hospitalDaysData] = await Promise.all([
          api.getSchedule(startDateStr, endDateStr),
          api.getAllDoctors(),
          api.getAllAvailability(startDateStr, endDateStr),
          api.getHospitalSchedule(startDateStr, endDateStr)
        ]);

        setSchedule(scheduleData);
        setDoctors(doctorsData);
        setAllAvailability(availabilityData);
        setHospitalDays(hospitalDaysData);
      } catch (loadError) {
        console.error('Failed to load dashboard data:', loadError);
        setError('Αποτυχία φόρτωσης δεδομένων διαχείρισης.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [currentDate]);

  const periodStart = formatDateLocal(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
  const periodEnd = formatDateLocal(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0));

  const getDoctorName = (doctorId: string) => {
    const doctor = doctors.find((entry) => String(entry.id) === String(doctorId));
    return doctor ? `${doctor.firstName} ${doctor.lastName}` : 'Άγνωστος';
  };

  const getDoctorAvailability = (doctorId: string, date: string) => {
    return allAvailability[doctorId]?.find((entry) => entry.date === date) || null;
  };

  const handleGenerateSchedule = async () => {
    if (missingHospitalDays > 0) {
      setError('Συμπληρώστε πρώτα όλες τις Ημέρες Νοσοκομείου του μήνα.');
      return;
    }

    try {
      setGenerating(true);
      setError('');
      setMessage('');

      const request: GenerateScheduleRequest = {
        startDate: periodStart,
        endDate: periodEnd,
        doctorIds: doctors.map((doctor) => doctor.id),
        preferences: Object.values(allAvailability).flat()
      };

      const result = await api.generateSchedule(request);
      if (!result.success) {
        setError(`Αποτυχία δημιουργίας προγράμματος: ${result.conflicts?.join(', ') || 'άγνωστο σφάλμα'}`);
        return;
      }

      setMessage('Το προσχέδιο προγράμματος δημιουργήθηκε.');
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || 'Αποτυχία δημιουργίας προγράμματος.');
    } finally {
      setGenerating(false);
      const refreshed = await Promise.all([
        api.getSchedule(periodStart, periodEnd),
        api.getAllAvailability(periodStart, periodEnd),
        api.getHospitalSchedule(periodStart, periodEnd)
      ]);
      setSchedule(refreshed[0]);
      setAllAvailability(refreshed[1]);
      setHospitalDays(refreshed[2]);
    }
  };

  const handleEditSchedule = (scheduleItem: Schedule) => {
    setEditingSchedule(scheduleItem);
    setSelectedDoctors([...scheduleItem.doctorIds]);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingSchedule) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      await api.updateSchedule(editingSchedule.date, selectedDoctors);
      setMessage('Η ημέρα ενημερώθηκε.');
      setShowEditModal(false);
      setSchedule(await api.getSchedule(periodStart, periodEnd));
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || 'Αποτυχία ενημέρωσης ημέρας.');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalizeSchedule = async () => {
    if (!window.confirm('Θέλετε να οριστικοποιήσετε το πρόγραμμα αυτού του μήνα;')) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      await api.finalizeSchedule(periodStart, periodEnd);
      setMessage('Το πρόγραμμα οριστικοποιήθηκε.');
      setSchedule(await api.getSchedule(periodStart, periodEnd));
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || 'Αποτυχία οριστικοποίησης.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Φόρτωση πίνακα διαχείρισης..." />;
  }

  const hasSchedule = schedule.length > 0;
  const hasDraftSchedule = schedule.some((item) => !item.isFinalized);
  const doctorsWithAvailability = Object.values(allAvailability).filter((entries) =>
    entries.some((entry) => entry.isHoliday || entry.isUnavailable)
  ).length;
  const doctorsWithoutPreferences = doctors.length - doctorsWithAvailability;

  const summaryCards = [
    { label: 'Ειδικευόμενοι', value: doctors.length, accent: 'primary' },
    { label: 'Με δηλωμένες προτιμήσεις', value: doctorsWithAvailability, accent: 'success' },
    { label: 'Χωρίς δηλώσεις', value: doctorsWithoutPreferences, accent: 'warning' },
    { label: 'Ημέρες προσχεδίου', value: schedule.filter((item) => !item.isFinalized).length, accent: 'info' }
  ];
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const configuredHospitalDays = new Set(hospitalDays.map((day) => day.date)).size;
  const missingHospitalDays = daysInMonth - configuredHospitalDays;

  const renderAssignmentsCalendar = () => {
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const offset = (firstDay.getDay() + 6) % 7;
    const cells: Array<Date | null> = [];
    for (let i = 0; i < offset; i += 1) {
      cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), day, 12, 0, 0));
    }

    return (
      <div className="desktop-calendar-view">
        <div className="calendar-header schedule-calendar-header">
          {['Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ', 'Κυρ'].map((dayName) => (
            <div key={dayName} className="weekday">
              {dayName}
            </div>
          ))}
        </div>
        <div className="calendar-grid schedule-calendar-grid">
          {Array.from({ length: Math.ceil(cells.length / 7) }, (_, weekIndex) => (
            <div key={weekIndex} className="calendar-week">
              {cells.slice(weekIndex * 7, weekIndex * 7 + 7).map((day, dayIndex) => {
                if (!day) {
                  return <div key={`${weekIndex}-${dayIndex}`} className="schedule-calendar-day empty" />;
                }

                const dateStr = formatDateLocal(day);
                const shift = schedule.find((item) => item.date === dateStr);
                const hospitalDay = hospitalDays.find((item) => item.date === dateStr);

                return (
                  <div
                    key={dateStr}
                    className={`schedule-calendar-day ${hospitalDay?.isOnCall ? 'oncall' : ''}`}
                  >
                    <div className="calendar-day-top">
                      <strong>{day.getDate()}</strong>
                      <div className="calendar-flags">
                        {hospitalDay?.hasCardioSurgery && <span className="surgery-indicator cardio">ΚΧ</span>}
                        {hospitalDay?.hasThoracicSurgery && <span className="surgery-indicator thoracic">ΘΧ</span>}
                      </div>
                    </div>
                    <div className="calendar-status-stack">
                      {hospitalDay?.isOnCall && <span className="calendar-pill status-alert">Εφημερία</span>}
                      {shift && (
                        <span className={`calendar-pill ${shift.isFinalized ? 'status-success' : 'status-warning'}`}>
                          {shift.isFinalized ? 'Τελικό' : 'Προσχέδιο'}
                        </span>
                      )}
                    </div>
                    <div className="calendar-assignment-list">
                      {shift?.doctorIds.length ? (
                        shift.doctorIds.map((doctorId) => (
                          <div key={doctorId} className="doctor-assignment">
                            {getDoctorName(doctorId)}
                          </div>
                        ))
                      ) : (
                        <span className="text-muted small">Χωρίς αναθέσεις</span>
                      )}
                    </div>
                    <div className="mt-2">
                      <Button variant="outline-primary" size="sm" onClick={() => shift && handleEditSchedule(shift)} disabled={!shift}>
                        Επεξεργασία
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="page-shell">
      <section className="hero-panel">
        <div>
          <span className="eyebrow">Διαχείριση μήνα</span>
          <h1 className="page-title">Προσχέδιο προγράμματος εφημεριών</h1>
          <p className="page-subtitle">
            Προετοιμάσαι το πρόγραμμα για τον επόμενο μήνα: πρώτα περιορισμοί και εφημερίες νοσοκομείου, μετά δημιουργία προσχεδίου και τέλος οριστικοποίηση.
          </p>
        </div>
        <div className="hero-actions">
          <Button variant="outline-primary" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}>
            ← Προηγούμενος
          </Button>
          <Button variant="outline-primary" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}>
            Επόμενος →
          </Button>
        </div>
      </section>

      {message && <Alert variant="success">{message}</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}

      <Row className="g-3 mb-4">
        {summaryCards.map((card) => (
          <Col key={card.label} xs={6} lg={3}>
            <Card className="summary-card h-100">
              <Card.Body>
                <span className="summary-label">{card.label}</span>
                <div className={`summary-value text-${card.accent}`}>{card.value}</div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Card className="dashboard-card mb-4">
        <Card.Header className="section-header">
          <div>
            <h5 className="mb-1">
              {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h5>
            <small className="text-muted">Βήμα 1: ελέγξτε διαθεσιμότητα. Βήμα 2: δημιουργήστε προσχέδιο. Βήμα 3: διορθώστε και οριστικοποιήστε.</small>
          </div>
          <div className="d-flex flex-column flex-sm-row gap-2">
            <Button variant="primary" onClick={handleGenerateSchedule} disabled={generating || missingHospitalDays > 0}>
              {generating ? 'Δημιουργία...' : 'Δημιουργία προσχεδίου'}
            </Button>
            {hasSchedule && hasDraftSchedule && (
              <Button variant="success" onClick={handleFinalizeSchedule} disabled={saving}>
                {saving ? 'Οριστικοποίηση...' : 'Οριστικοποίηση'}
              </Button>
            )}
          </div>
        </Card.Header>
      </Card>

      {missingHospitalDays > 0 && (
        <Alert variant="warning" className="info-banner">
          Πριν δημιουργήσετε πρόγραμμα, πρέπει να συμπληρώσετε όλες τις Ημέρες Νοσοκομείου για τον μήνα.
          Απομένουν {missingHospitalDays} από τις {daysInMonth} ημέρες.
        </Alert>
      )}

      <Tabs defaultActiveKey="overview" className="mb-4">
        <Tab eventKey="overview" title="Επισκόπηση μήνα">
          <Card className="dashboard-card mb-4">
            <Card.Header className="section-header">
              <div>
                <h5 className="mb-1">Πρόοδος προετοιμασίας</h5>
                <small className="text-muted">Γρήγορος έλεγχος πριν τη δημιουργία ή δημοσίευση.</small>
              </div>
            </Card.Header>
            <Card.Body>
              <div className="workflow-grid">
                <div className="workflow-step">
                  <strong>1. Διαθεσιμότητα</strong>
                  <span>{doctorsWithAvailability}/{doctors.length} γιατροί έχουν δηλώσει περιορισμούς.</span>
                </div>
                <div className="workflow-step">
                  <strong>2. Προσχέδιο</strong>
                  <span>{hasSchedule ? 'Υπάρχει πρόγραμμα προς έλεγχο.' : 'Δεν έχει δημιουργηθεί ακόμη προσχέδιο.'}</span>
                </div>
                <div className="workflow-step">
                  <strong>3. Δημοσίευση</strong>
                  <span>{hasDraftSchedule ? 'Υπάρχουν ακόμη ημέρες προσχεδίου.' : 'Όλες οι ημέρες είναι οριστικοποιημένες.'}</span>
                </div>
              </div>
            </Card.Body>
          </Card>

          {hasSchedule ? (
            <Card className="dashboard-card mb-4">
              <Card.Header className="section-header">
                <div>
                  <h5 className="mb-1">Αναθέσεις ανά ημέρα</h5>
                  <small className="text-muted">Επεξεργαστείτε μόνο τις ημέρες που χρειάζονται παρέμβαση.</small>
                </div>
                <ButtonGroup>
                  <Button
                    variant={assignmentsViewMode === 'calendar' ? 'primary' : 'outline-primary'}
                    onClick={() => setAssignmentsViewMode('calendar')}
                  >
                    Ημερολόγιο
                  </Button>
                  <Button
                    variant={assignmentsViewMode === 'list' ? 'primary' : 'outline-primary'}
                    onClick={() => setAssignmentsViewMode('list')}
                  >
                    Λίστα
                  </Button>
                </ButtonGroup>
              </Card.Header>
              <Card.Body>
                {assignmentsViewMode === 'calendar' ? (
                  renderAssignmentsCalendar()
                ) : (
                  <Table responsive hover>
                    <thead>
                      <tr>
                        <th>Ημερομηνία</th>
                        <th>Ημέρα</th>
                        <th>Ανατεθέντες</th>
                        <th>Κατάσταση</th>
                        <th>Ενέργεια</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedule.map((shift) => (
                        <tr key={shift.id}>
                          <td>{formatDisplayDate(shift.date)}</td>
                          <td>{formatWeekdayLong(shift.date)}</td>
                          <td>
                            {shift.doctorIds.length ? shift.doctorIds.map((doctorId) => getDoctorName(doctorId)).join(', ') : 'Χωρίς αναθέσεις'}
                          </td>
                          <td>
                            <Badge bg={shift.isFinalized ? 'success' : 'warning'}>
                              {shift.isFinalized ? 'Οριστικοποιημένο' : 'Προσχέδιο'}
                            </Badge>
                          </td>
                          <td>
                            <Button variant="outline-primary" size="sm" onClick={() => handleEditSchedule(shift)}>
                              Επεξεργασία
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          ) : (
            <Alert variant="info">Δεν υπάρχει ακόμη προσχέδιο για αυτόν τον μήνα.</Alert>
          )}

          <Card className="dashboard-card">
            <Card.Header className="section-header">
              <div>
                <h5 className="mb-1">Σύνοψη διαθεσιμότητας</h5>
                <small className="text-muted">Ελέγξτε γρήγορα ποιοι έχουν δηλώσει περιορισμούς πριν παραχθεί πρόγραμμα.</small>
              </div>
            </Card.Header>
            <Card.Body>
              <Table responsive striped>
                <thead>
                  <tr>
                    <th>Γιατρός</th>
                    <th>Τομέας</th>
                    <th>Βαθμίδα</th>
                    <th>Μη διαθέσιμες</th>
                    <th>Άδειες</th>
                    <th>Διαθέσιμες</th>
                  </tr>
                </thead>
                <tbody>
                  {doctors.map((doctor) => {
                    const availability = allAvailability[doctor.id] || [];
                    const availableDays = availability.filter((entry) => entry.isAvailable).length;
                    const unavailableDays = availability.filter((entry) => entry.isUnavailable).length;
                    const holidayDays = availability.filter((entry) => entry.isHoliday).length;

                    return (
                      <tr key={doctor.id}>
                        <td>
                          <strong>{doctor.firstName} {doctor.lastName}</strong>
                        </td>
                        <td>{getSpecialtyLabel(doctor.specialty)}</td>
                        <td>{getRankLabel(doctor.rank)}</td>
                        <td><Badge bg="danger">{unavailableDays}</Badge></td>
                        <td><Badge bg="secondary">{holidayDays}</Badge></td>
                        <td><Badge bg="success">{availableDays}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="approvals" title="Εγκρίσεις">
          <PendingDoctors />
        </Tab>

        <Tab eventKey="hospital-schedule" title="Ημέρες νοσοκομείου">
          <HospitalScheduleManager activeMonth={currentDate} onMonthChange={setCurrentDate} />
        </Tab>
      </Tabs>

      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            Επεξεργασία ημέρας {editingSchedule?.date ? formatDisplayDate(editingSchedule.date) : ''}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>Ανάθεση ειδικευομένων</Form.Label>
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
                        <Badge bg="light" text="dark" className="ms-2">{getSpecialtyLabel(doctor.specialty)}</Badge>
                        {!isAvailable && <Badge bg="danger" className="ms-2">Μη διαθέσιμος</Badge>}
                      </span>
                    }
                    checked={selectedDoctors.includes(doctor.id)}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setSelectedDoctors([...selectedDoctors, doctor.id]);
                      } else {
                        setSelectedDoctors(selectedDoctors.filter((id) => id !== doctor.id));
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
            Ακύρωση
          </Button>
          <Button variant="primary" onClick={handleSaveEdit} disabled={saving}>
            {saving ? 'Αποθήκευση...' : 'Αποθήκευση'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ManagerDashboard;
