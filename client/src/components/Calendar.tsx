import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Modal, OverlayTrigger, Row, Tooltip } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { CalendarDay, DayAvailability, HospitalDay, Schedule as ScheduleType } from '../types';
import * as api from '../services/api';
import LoadingSpinner from './common/LoadingSpinner';
import { MONTH_NAMES, WEEKDAY_NAMES, WEEKDAY_NAMES_MONDAY_FIRST, formatDateLocal, formatDisplayDate, getSpecialtyShortLabel } from '../utils/medical';

const Calendar: React.FC = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [unavailableDays, setUnavailableDays] = useState<Set<string>>(new Set());
  const [holidayDays, setHolidayDays] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [myShifts, setMyShifts] = useState<ScheduleType[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    const loadCalendarData = async () => {
      try {
        setLoading(true);
        const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        const startDateStr = formatDateLocal(startDate);
        const endDateStr = formatDateLocal(endDate);

        const hospitalDaysData = await api.getHospitalSchedule(startDateStr, endDateStr);

        if (user && (user.role === 'doctor' || user.role === 'manager')) {
          const [availability, scheduleData] = await Promise.all([
            api.getDoctorAvailability(user.id, startDateStr, endDateStr),
            api.getSchedule(startDateStr, endDateStr)
          ]);

          setUnavailableDays(new Set(availability.filter((item) => item.isUnavailable).map((item) => item.date)));
          setHolidayDays(new Set(availability.filter((item) => item.isHoliday).map((item) => item.date)));
          setMyShifts(
            scheduleData.filter((day) => day.doctorIds.some((doctorId) => String(doctorId) === String(user.id)))
          );
        } else {
          setMyShifts([]);
        }

        generateCalendarDays(startDate, hospitalDaysData);
      } catch (error) {
        console.error('Failed to load calendar data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCalendarData();
  }, [currentDate, user]);

  const generateCalendarDays = (startDate: Date, hospitalDaysData: HospitalDay[]) => {
    const days: CalendarDay[] = [];
    const hospitalDaysMap = new Map(hospitalDaysData.map((day) => [day.date, day]));
    const firstDay = new Date(startDate);
    firstDay.setDate(1);
    const firstDayOfWeek = (firstDay.getDay() + 6) % 7;
    const calendarStart = new Date(firstDay);
    calendarStart.setDate(1 - firstDayOfWeek);

    for (let i = 0; i < 42; i += 1) {
      const loopDate = new Date(calendarStart);
      loopDate.setDate(calendarStart.getDate() + i);
      const dateStr = formatDateLocal(loopDate);
      const hospitalDay = hospitalDaysMap.get(dateStr);

      days.push({
        date: dateStr,
        isOnCall: hospitalDay?.isOnCall || false,
        isPublicHoliday: hospitalDay?.isPublicHoliday || false,
        hasCardioSurgery: hospitalDay?.hasCardioSurgery || false,
        hasThoracicSurgery: hospitalDay?.hasThoracicSurgery || false,
        availability: {}
      });
    }

    setCalendarDays(days);
  };

  const handleDayClick = (date: string) => {
    if (user?.role === 'viewer' || !isEditMode) {
      return;
    }

    setSelectedDate(date);
    setShowModal(true);
  };

  const handleAvailabilityUpdate = (type: 'unavailable' | 'holiday' | 'available') => {
    const nextUnavailable = new Set(unavailableDays);
    const nextHoliday = new Set(holidayDays);

    if (type === 'unavailable') {
      nextUnavailable.add(selectedDate);
      nextHoliday.delete(selectedDate);
    } else if (type === 'holiday') {
      nextHoliday.add(selectedDate);
      nextUnavailable.delete(selectedDate);
    } else {
      nextUnavailable.delete(selectedDate);
      nextHoliday.delete(selectedDate);
    }

    setUnavailableDays(nextUnavailable);
    setHolidayDays(nextHoliday);
    setShowModal(false);
  };

  const saveAvailability = async () => {
    if (!user) {
      return;
    }

    try {
      setSaving(true);
      const availability: DayAvailability[] = [];
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      const loopDate = new Date(startDate);

      while (loopDate <= endDate) {
        const dateStr = formatDateLocal(loopDate);
        availability.push({
          id: `${user.id}-${dateStr}`,
          doctorId: user.id,
          date: dateStr,
          isAvailable: !unavailableDays.has(dateStr) && !holidayDays.has(dateStr),
          isHoliday: holidayDays.has(dateStr),
          isUnavailable: unavailableDays.has(dateStr)
        });
        loopDate.setDate(loopDate.getDate() + 1);
      }

      await api.updateDoctorAvailability(user.id, availability);
      setIsEditMode(false);
      window.alert('Η διαθεσιμότητα αποθηκεύτηκε.');
    } catch (error) {
      console.error('Failed to save availability:', error);
      window.alert('Αποτυχία αποθήκευσης διαθεσιμότητας.');
    } finally {
      setSaving(false);
    }
  };

  const userHasShift = (date: string) => myShifts.some((shift) => shift.date === date);

  const getDayClass = (day: CalendarDay) => {
    const classes = ['availability-day', 'border', 'text-center', 'position-relative'];
    const dayDate = new Date(`${day.date}T12:00:00`);

    if (dayDate.getMonth() !== currentDate.getMonth()) {
      classes.push('calendar-day-muted');
    }
    if (unavailableDays.has(day.date)) {
      classes.push('day-unavailable');
    } else if (holidayDays.has(day.date)) {
      classes.push('day-holiday');
    }
    if (day.isOnCall) {
      classes.push('day-oncall');
    }
    if (userHasShift(day.date)) {
      classes.push('day-user-shift');
    }
    if (day.isPublicHoliday) {
      classes.push('day-public-holiday');
    }
    if (day.hasCardioSurgery) {
      classes.push('day-cardio-surgery');
    }
    if (day.hasThoracicSurgery) {
      classes.push('day-thoracic-surgery');
    }

    return classes.join(' ');
  };

  const monthAvailability = calendarDays.filter((day) => {
    const dayDate = new Date(`${day.date}T12:00:00`);
    return dayDate.getMonth() === currentDate.getMonth();
  });

  const unavailableCount = monthAvailability.filter((day) => unavailableDays.has(day.date)).length;
  const holidayCount = monthAvailability.filter((day) => holidayDays.has(day.date)).length;
  const onCallCount = monthAvailability.filter((day) => day.isOnCall).length;
  const surgeryCount = monthAvailability.filter((day) => day.hasCardioSurgery || day.hasThoracicSurgery).length;
  const myShiftCount = myShifts.length;

  const summaryCards = [
    { label: 'Ημέρες μη διαθεσιμότητας', value: unavailableCount, accent: 'danger' },
    { label: 'Ημέρες άδειας', value: holidayCount, accent: 'secondary' },
    { label: 'Ημέρες εφημερίας νοσοκομείου', value: onCallCount, accent: 'primary' },
    { label: 'Ημέρες χειρουργείων', value: surgeryCount, accent: 'info' },
    { label: 'Δικές μου εφημερίες', value: myShiftCount, accent: 'success' }
  ];

  if (loading) {
    return <LoadingSpinner message="Φόρτωση ημερολογίου..." />;
  }

  return (
    <div className="page-shell">
      <section className="hero-panel">
        <div>
          <span className="eyebrow">Καθημερινή χρήση</span>
          <h1 className="page-title">{user?.role === 'viewer' ? 'Ημερολόγιο τμήματος' : 'Η διαθεσιμότητά μου'}</h1>
          <p className="page-subtitle">
            {user?.role === 'viewer'
              ? 'Δείτε συγκεντρωτικά τις ημέρες εφημερίας, αργιών και χειρουργείων.'
              : 'Σημειώσε μόνο ό,τι επηρεάζει το πρόγραμμα σου: μη διαθεσιμότητα και άδειες'}
          </p>
        </div>
        {(user?.role === 'doctor' || user?.role === 'manager') && (
          <div className="hero-actions">
            <Button variant={isEditMode ? 'success' : 'primary'} onClick={() => setIsEditMode((value) => !value)}>
              {isEditMode ? 'Ολοκλήρωση επεξεργασίας' : 'Ενημέρωση διαθεσιμότητας'}
            </Button>
            {isEditMode && (
              <Button variant="outline-primary" onClick={saveAvailability} disabled={saving}>
                {saving ? 'Αποθήκευση...' : 'Αποθήκευση'}
              </Button>
            )}
          </div>
        )}
      </section>

      {user?.role === 'viewer' ? (
        <Alert variant="info">Ημερολόγιο του τμήματος</Alert>
      ) : (
        <Alert variant={isEditMode ? 'warning' : 'light'} className="info-banner">
          {isEditMode
            ? 'Πατήσε πάνω σε μια ημέρα για να δηλώσεις διαθεσιμότητα, άδεια ή μη διαθεσιμότητα.'
            : 'Εδώ θα δεις την δηλωμένη διαθεσιμότητα σου, τις ημέρες εφημερίας του νοσοκομείου και τις αναθέσεις σου.'}
        </Alert>
      )}

      <Row className="g-3 mb-4">
        {summaryCards.map((card) => (
          <Col key={card.label} xs={6} md={4} xl={2}>
            <Card className="summary-card h-100">
              <Card.Body>
                <span className="summary-label">{card.label}</span>
                <div className={`summary-value text-${card.accent}`}>{card.value}</div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Card className="calendar-container">
        <Card.Header className="section-header">
          <div>
            <h5 className="mb-1">
              {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h5>
            <small className="text-muted">Εικόνα διαθεσιμότητας</small>
          </div>
          <div className="d-flex gap-2">
            <Button variant="outline-primary" size="sm" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}>
              ← Προηγούμενος
            </Button>
            <Button variant="outline-primary" size="sm" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}>
              Επόμενος →
            </Button>
          </div>
        </Card.Header>

        <Card.Body className="p-0">
          <div className="mobile-calendar-view">
            {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate() }, (_, index) => index + 1).map((dayNumber) => {
              const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNumber);
              const dateStr = formatDateLocal(date);
              const dayData = calendarDays.find((item) => item.date === dateStr);

              if (!dayData) {
                return null;
              }

              return (
                <div
                  key={dateStr}
                  className={`mobile-calendar-day ${unavailableDays.has(dateStr) ? 'unavailable' : ''} ${holidayDays.has(dateStr) ? 'holiday' : ''} ${dayData.isOnCall ? 'oncall' : ''}`}
                  onClick={() => handleDayClick(dateStr)}
                  style={{ cursor: user?.role !== 'viewer' && isEditMode ? 'pointer' : 'default' }}
                >
                  <div className="mobile-day-left">
                    <div className="mobile-day-number">{dayNumber}</div>
                    <div className="mobile-day-name">{WEEKDAY_NAMES[date.getDay()]}</div>
                  </div>
                  <div className="mobile-day-content">
                    <div className="mobile-day-indicators">
                      {unavailableDays.has(dateStr) && <span className="mobile-indicator status-danger">Μη διαθέσιμος</span>}
                      {holidayDays.has(dateStr) && <span className="mobile-indicator status-muted">Άδεια</span>}
                      {dayData.isPublicHoliday && <span className="mobile-indicator status-muted">Αργία</span>}
                      {dayData.hasCardioSurgery && <span className="mobile-indicator status-info">ΚΧ</span>}
                      {dayData.hasThoracicSurgery && <span className="mobile-indicator status-info">ΘΧ</span>}
                      {userHasShift(dateStr) && <span className="mobile-indicator status-success">Εφημερία</span>}
                    </div>
                    <div className="mobile-no-doctors">
                      {dayData.isOnCall
                        ? 'Το νοσοκομείο είναι σε γενική εφημερία.'
                        : userHasShift(dateStr)
                          ? 'Έχετε ανάθεση σε αυτή την ημέρα.'
                          : 'Δεν έχετε ανάθεση σε αυτή την ημέρα.'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="desktop-calendar-view">
            <Row className="g-0 bg-light">
              {WEEKDAY_NAMES_MONDAY_FIRST.map((dayName) => (
                <Col key={dayName} className="p-2 text-center fw-bold border">
                  {dayName}
                </Col>
              ))}
            </Row>
            <div className="calendar-grid">
              {Array.from({ length: 6 }, (_, weekIndex) => (
                <Row key={weekIndex} className="g-0">
                  {WEEKDAY_NAMES_MONDAY_FIRST.map((_, dayIndex) => {
                    const dayData = calendarDays[weekIndex * 7 + dayIndex];
                    if (!dayData) {
                      return <Col key={dayIndex} className="border" style={{ minHeight: '112px' }} />;
                    }

                    const dateLabel = formatDisplayDate(dayData.date);

                    return (
                      <Col
                        key={dayData.date}
                        className={getDayClass(dayData)}
                        onClick={() => handleDayClick(dayData.date)}
                        style={{ minHeight: '112px', cursor: user?.role !== 'viewer' && isEditMode ? 'pointer' : 'default' }}
                      >
                        <div className="calendar-day-top">
                          <strong>{new Date(`${dayData.date}T12:00:00`).getDate()}</strong>
                          <div className="calendar-flags calendar-flags-spacing">
                            {dayData.hasCardioSurgery && <span className="surgery-indicator cardio">{getSpecialtyShortLabel('cardiology')}</span>}
                            {dayData.hasThoracicSurgery && <span className="surgery-indicator thoracic">{getSpecialtyShortLabel('thoracic')}</span>}
                          </div>
                        </div>
                        <div className="calendar-status-stack">
                          {unavailableDays.has(dayData.date) && <span className="calendar-pill status-danger">Μη διαθέσιμος</span>}
                          {holidayDays.has(dayData.date) && <span className="calendar-pill status-muted">Άδεια</span>}
                          {dayData.isPublicHoliday && <span className="calendar-pill status-muted">Αργία</span>}
                          {userHasShift(dayData.date) && <span className="calendar-pill status-success">Εφημερία</span>}
                        </div>
                        {userHasShift(dayData.date) && (
                          <OverlayTrigger
                            placement="top"
                            overlay={<Tooltip id={`shift-${dayData.date}`}>{dateLabel}: Έχετε ανατεθεί σε αυτή την ημέρα.</Tooltip>}
                          >
                            <div className="user-shift-anchor" aria-hidden="true"></div>
                          </OverlayTrigger>
                        )}
                      </Col>
                    );
                  })}
                </Row>
              ))}
            </div>
          </div>
        </Card.Body>

        <Card.Footer className="legend-bar">
          <span><span className="legend-swatch legend-danger"></span>Μη διαθέσιμος</span>
          <span><span className="legend-swatch legend-muted"></span>Άδεια / Αργία</span>
          <span><span className="legend-swatch legend-success"></span>Δική μου εφημερία</span>
          <span><span className="legend-swatch legend-oncall"></span>Γενική εφημερία νοσοκομείου</span>
          <span><span className="legend-icon cardio">ΚΧ</span> Καρδιοχειρουργική</span>
          <span><span className="legend-icon thoracic">ΘΧ</span> Θωρακοχειρουργική</span>
        </Card.Footer>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{formatDisplayDate(selectedDate)}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted mb-3">Επιλέξτε πώς πρέπει να υπολογιστεί η ημέρα στο πρόγραμμα.</p>
          <div className="d-grid gap-2">
            <Button variant="success" onClick={() => handleAvailabilityUpdate('available')}>
              Διαθέσιμος/η
            </Button>
            <Button variant="danger" onClick={() => handleAvailabilityUpdate('unavailable')}>
              Μη διαθέσιμος/η
            </Button>
            <Button variant="secondary" onClick={() => handleAvailabilityUpdate('holiday')}>
              Προσωπική άδεια
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Calendar;
