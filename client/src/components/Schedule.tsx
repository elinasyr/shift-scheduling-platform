import React, { useEffect, useState } from 'react';
import { Alert, Badge, Button, ButtonGroup, Card, Col, Row, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Doctor, HospitalDay, Schedule as ScheduleType } from '../types';
import * as api from '../services/api';
import LoadingSpinner from './common/LoadingSpinner';
import {
  MONTH_NAMES,
  WEEKDAY_NAMES,
  WEEKDAY_NAMES_MONDAY_FIRST,
  formatDateLocal,
  formatDisplayDate,
  formatWeekdayLong,
  getSpecialtyShortLabel
} from '../utils/medical';

const Schedule: React.FC = () => {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<ScheduleType[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [hospitalDays, setHospitalDays] = useState<HospitalDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  useEffect(() => {
    const loadScheduleData = async () => {
      try {
        setLoading(true);
        const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        const startDateStr = formatDateLocal(startDate);
        const endDateStr = formatDateLocal(endDate);

        const [scheduleData, doctorsData, hospitalDaysData] = await Promise.all([
          api.getSchedule(startDateStr, endDateStr),
          api.getAllDoctors(),
          api.getHospitalDays(startDateStr, endDateStr)
        ]);

        setSchedule(scheduleData);
        setDoctors(doctorsData);
        setHospitalDays(hospitalDaysData);
      } catch (error) {
        console.error('Failed to load schedule data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadScheduleData();
  }, [currentDate]);

  const getDoctor = (doctorId: string) => doctors.find((doctor) => String(doctor.id) === String(doctorId));
  const getHospitalDay = (date: string) => hospitalDays.find((day) => day.date === date);
  const getScheduleForDate = (date: string) => schedule.find((item) => item.date === date);

  const isUserOnCall = (date: string) => {
    if (!user || user.role === 'viewer') {
      return false;
    }

    return getScheduleForDate(date)?.doctorIds.some((doctorId) => String(doctorId) === String(user.id)) || false;
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      const startDateStr = formatDateLocal(startDate);
      const endDateStr = formatDateLocal(endDate);
      const blob = await api.downloadSchedule(startDateStr, endDateStr);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = blob.type.includes('pdf')
        ? `schedule-${startDateStr}-to-${endDateStr}.pdf`
        : `schedule-${startDateStr}-to-${endDateStr}.txt`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error('Failed to download schedule:', error);
      window.alert('Αποτυχία λήψης προγράμματος.');
    } finally {
      setDownloading(false);
    }
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7;
    const days: Array<Date | null> = [];

    for (let i = 0; i < startingDayOfWeek; i += 1) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      days.push(new Date(year, month, day, 12, 0, 0));
    }

    return days;
  };

  const hasSchedule = schedule.length > 0;
  const finalizedCount = schedule.filter((item) => item.isFinalized).length;
  const onCallCount = hospitalDays.filter((item) => item.isOnCall).length;
  const assignedToUserCount = schedule.filter((item) => isUserOnCall(item.date)).length;
  const hasDraftSchedule = schedule.some((item) => !item.isFinalized);

  const summaryCards = [
    { label: 'Ημέρες με αναθέσεις', value: schedule.length, accent: 'primary' },
    { label: 'Οριστικοποιημένες ημέρες', value: finalizedCount, accent: 'success' },
    { label: 'Ημέρες εφημερίας', value: onCallCount, accent: 'danger' },
    { label: 'Οι δικές μου αναθέσεις', value: assignedToUserCount, accent: 'info' }
  ];

  const renderCalendarDay = (date: Date | null) => {
    if (!date) {
      return <div className="schedule-calendar-day empty" />;
    }

    const dateStr = formatDateLocal(date);
    const daySchedule = getScheduleForDate(dateStr);
    const hospitalDay = getHospitalDay(dateStr);

    return (
      <div
        key={dateStr}
        className={`schedule-calendar-day ${isUserOnCall(dateStr) ? 'mine' : ''} ${hospitalDay?.isOnCall ? 'oncall' : ''}`}
      >
        <div className="calendar-day-top">
          <strong>{date.getDate()}</strong>
          <div className="calendar-flags calendar-flags-spacing">
            {hospitalDay?.hasCardioSurgery && <span className="surgery-indicator cardio">{getSpecialtyShortLabel('cardiology')}</span>}
            {hospitalDay?.hasThoracicSurgery && <span className="surgery-indicator thoracic">{getSpecialtyShortLabel('thoracic')}</span>}
          </div>
        </div>

        <div className="calendar-status-stack">
          {hospitalDay?.isPublicHoliday && <span className="calendar-pill status-muted">Αργία</span>}
          {hospitalDay?.isOnCall && <span className="calendar-pill status-alert">Εφημερία</span>}
          {isUserOnCall(dateStr) && <span className="calendar-pill status-success">Η δική μου βάρδια</span>}
        </div>

        <div className="calendar-assignment-list">
          {daySchedule?.doctorIds.length ? (
            daySchedule.doctorIds.map((doctorId) => {
              const doctor = getDoctor(doctorId);
              return (
                <div key={doctorId} className={`doctor-assignment ${String(user?.id) === String(doctorId) ? 'current-user' : ''}`}>
                  {doctor ? `${doctor.firstName} ${doctor.lastName}` : 'Άγνωστος'}
                </div>
              );
            })
          ) : (
            <span className="text-muted small">Χωρίς αναθέσεις</span>
          )}
        </div>
      </div>
    );
  };

  const renderMobileScheduleView = () => {
    const days = getDaysInMonth().filter(Boolean) as Date[];

    return (
      <div className="mobile-calendar-view">
        {days.map((day) => {
          const dateStr = formatDateLocal(day);
          const daySchedule = getScheduleForDate(dateStr);
          const hospitalDay = getHospitalDay(dateStr);

          return (
            <div key={dateStr} className={`mobile-calendar-day ${isUserOnCall(dateStr) ? 'mine' : ''}`}>
              <div className="mobile-day-left">
                <div className="mobile-day-number">{day.getDate()}</div>
                <div className="mobile-day-name">{WEEKDAY_NAMES[day.getDay()]}</div>
              </div>
              <div className="mobile-day-content">
                <div className="mobile-day-indicators">
                  {hospitalDay?.isOnCall && <span className="mobile-indicator status-alert">Εφημερία</span>}
                  {hospitalDay?.isPublicHoliday && <span className="mobile-indicator status-muted">Αργία</span>}
                  {hospitalDay?.hasCardioSurgery && <span className="mobile-indicator status-info">ΚΧ</span>}
                  {hospitalDay?.hasThoracicSurgery && <span className="mobile-indicator status-info">ΘΧ</span>}
                  {isUserOnCall(dateStr) && <span className="mobile-indicator status-success">Η δική μου βάρδια</span>}
                </div>
                {daySchedule?.doctorIds.length ? (
                  <div className="mobile-available-doctors">
                    {daySchedule.doctorIds.map((doctorId) => {
                      const doctor = getDoctor(doctorId);
                      if (!doctor) {
                        return null;
                      }

                      return (
                        <span key={doctorId} className={`mobile-doctor-chip ${String(user?.id) === String(doctorId) ? 'current-user' : ''}`}>
                          {doctor.firstName} {doctor.lastName}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mobile-no-doctors">Δεν έχουν ανατεθεί ειδικευόμενοι.</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderListView = () => {
    const rows = [...schedule].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return (
      <Table responsive hover>
        <thead>
          <tr>
            <th>Ημερομηνία</th>
            <th>Ημέρα</th>
            <th>Ανάθεση</th>
            <th>Κατάσταση</th>
            <th>Σημειώσεις</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((shift) => {
            const hospitalDay = getHospitalDay(shift.date);
            return (
              <tr key={shift.id} className={isUserOnCall(shift.date) ? 'user-assigned-row' : ''}>
                <td>{formatDisplayDate(shift.date)}</td>
                <td>{formatWeekdayLong(shift.date)}</td>
                <td>
                  {shift.doctorIds.length ? (
                    shift.doctorIds.map((doctorId) => {
                      const doctor = getDoctor(doctorId);
                      return (
                        <div key={doctorId} className="mb-1">
                          <strong className={String(user?.id) === String(doctorId) ? 'text-primary' : ''}>
                            {doctor ? `${doctor.firstName} ${doctor.lastName}` : 'Άγνωστος'}
                          </strong>
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-muted">Χωρίς αναθέσεις</span>
                  )}
                </td>
                <td>
                  <Badge bg={shift.isFinalized ? 'success' : 'warning'}>
                    {shift.isFinalized ? 'Οριστικοποιημένο' : 'Προσχέδιο'}
                  </Badge>
                </td>
                <td>
                  {hospitalDay?.isOnCall && <Badge bg="danger" className="me-1">Εφημερία</Badge>}
                  {hospitalDay?.isPublicHoliday && <Badge bg="secondary" className="me-1">Αργία</Badge>}
                  {hospitalDay?.description && <small className="text-muted">{hospitalDay.description}</small>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    );
  };

  if (loading) {
    return <LoadingSpinner message="Φόρτωση προγράμματος εφημεριών..." />;
  }

  return (
    <div className="page-shell">
      <section className="hero-panel">
        <div>
          <span className="eyebrow">Πρόγραμμα</span>
          <h1 className="page-title">Εφημερίες μήνα</h1>
          <p className="page-subtitle">
            Κατάστασης προγράμματος και ημερών νοσοκομείου για τον μήνα "{MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}".
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

      {hasSchedule && (
        <Alert variant={hasDraftSchedule ? 'warning' : 'success'} className="info-banner">
          {hasDraftSchedule
            ? 'Προσχέδιο προγράμματος: το πρόγραμμα δεν έχει οριστικοποιηθεί ακόμη για όλο τον μήνα.'
            : 'Τελικό πρόγραμμα: όλες οι ημέρες του μήνα έχουν οριστικοποιηθεί.'}
        </Alert>
      )}

      {!hasSchedule && user?.role === 'viewer' && (
        <Alert variant="info">Το επίσημο πρόγραμμα δεν έχει οριστικοποιηθεί ακόμη για αυτόν τον μήνα.</Alert>
      )}

      {(user?.role !== 'viewer' || hasSchedule) && (
        <>
          <Card className="dashboard-card mb-4">
            <Card.Header className="section-header">
              <div>
                <h5 className="mb-1">
                  {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h5>
                <small className="text-muted">Εναλλαγή μεταξύ συνοπτικού ημερολογίου και λίστας ανά ημέρα.</small>
              </div>
              <div className="d-flex flex-column flex-sm-row gap-2">
                <ButtonGroup>
                  <Button variant={viewMode === 'calendar' ? 'primary' : 'outline-primary'} onClick={() => setViewMode('calendar')}>
                    Ημερολόγιο
                  </Button>
                  <Button variant={viewMode === 'list' ? 'primary' : 'outline-primary'} onClick={() => setViewMode('list')}>
                    Λίστα
                  </Button>
                </ButtonGroup>
                {hasSchedule && (
                  <Button variant="success" onClick={handleDownload} disabled={downloading}>
                    {downloading ? 'Λήψη...' : 'Λήψη αρχείου'}
                  </Button>
                )}
              </div>
            </Card.Header>
          </Card>

          <Card className="dashboard-card">
            <Card.Body>
              {hasSchedule ? (
                viewMode === 'calendar' ? (
                  <>
                    {renderMobileScheduleView()}
                    <div className="desktop-calendar-view">
                      <div className="calendar-header schedule-calendar-header">
                        {WEEKDAY_NAMES_MONDAY_FIRST.map((dayName) => (
                          <div key={dayName} className="weekday">
                            {dayName}
                          </div>
                        ))}
                      </div>
                      <div className="calendar-grid schedule-calendar-grid">
                        {Array.from({ length: Math.ceil(getDaysInMonth().length / 7) }, (_, weekIndex) => (
                          <div key={weekIndex} className="calendar-week">
                            {getDaysInMonth().slice(weekIndex * 7, weekIndex * 7 + 7).map((day) => renderCalendarDay(day))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  renderListView()
                )
              ) : (
                <Alert variant="warning">
                  <h5>Δεν έχει δημιουργηθεί πρόγραμμα.</h5>
                  <p className="mb-0">
                    {user?.role === 'manager' ? (
                      <>
                        Μεταβείτε στον <Link to="/manager">πίνακα διαχείρισης</Link> για να ετοιμάσετε το πρόγραμμα του μήνα.
                      </>
                    ) : (
                      'Το πρόγραμμα δεν είναι ακόμη διαθέσιμο.'
                    )}
                  </p>
                </Alert>
              )}
            </Card.Body>
          </Card>
        </>
      )}
    </div>
  );
};

export default Schedule;
