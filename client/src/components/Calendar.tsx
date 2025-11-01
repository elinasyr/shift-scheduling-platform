import React, { useState, useEffect } from 'react';
import { Card, Button, Row, Col, Badge, Alert, Modal, Form, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { CalendarDay, DayAvailability, HospitalDay } from '../types';
import * as api from '../services/api';
import LoadingSpinner from './common/LoadingSpinner';

const Calendar: React.FC = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [unavailableDays, setUnavailableDays] = useState<Set<string>>(new Set());
  const [holidayDays, setHolidayDays] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [hospitalDays, setHospitalDays] = useState<HospitalDay[]>([]);
  const [allAvailability, setAllAvailability] = useState<{ [doctorId: string]: DayAvailability[] }>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [doctorsData, setDoctorsData] = useState<{ [doctorId: string]: { firstName: string; lastName: string } }>({});

  useEffect(() => {
    loadCalendarData();
  }, [currentDate]);

  const loadCalendarData = async () => {
    try {
      setLoading(true);
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      // Format dates as YYYY-MM-DD without timezone issues
      const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
      const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

      // Load hospital days (on-call, surgeries, and public holidays)
      const hospitalDaysData = await api.getHospitalSchedule(startDateStr, endDateStr);
      setHospitalDays(hospitalDaysData);

      // Load all doctors data for names
      const doctors = await api.getAllDoctors();
      const doctorsMap: { [doctorId: string]: { firstName: string; lastName: string } } = {};
      doctors.forEach(doctor => {
        doctorsMap[doctor.id] = { firstName: doctor.firstName, lastName: doctor.lastName };
      });
      setDoctorsData(doctorsMap);

      // Load user's availability if doctor or manager
      if (user && (user.role === 'doctor' || user.role === 'manager')) {
        console.log('Start date:', startDateStr, 'End date:', endDateStr);
        const availability = await api.getDoctorAvailability(user.id, startDateStr, endDateStr);
        const unavailable = new Set(
          availability.filter(a => a.isUnavailable).map(a => a.date)
        );
        const holidays = new Set(
          availability.filter(a => a.isHoliday).map(a => a.date)
        );
        setUnavailableDays(unavailable);
        setHolidayDays(holidays);

        // Load all doctors' availability for profile pictures
        const allAvail = await api.getAllAvailability(startDateStr, endDateStr);
        setAllAvailability(allAvail);
      }

      generateCalendarDays(startDate, endDate, hospitalDaysData);
    } catch (error) {
      console.error('Failed to load calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCalendarDays = (startDate: Date, endDate: Date, hospitalDaysData: HospitalDay[]) => {
    const days: CalendarDay[] = [];
    const hospitalDaysMap = new Map(hospitalDaysData.map(day => [day.date, day]));
    
    // Helper function to format date as YYYY-MM-DD without timezone issues
    const formatDateLocal = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    // Generate 6 weeks (42 days) for the calendar grid
    const firstDay = new Date(startDate);
    firstDay.setDate(1);
    const firstDayOfWeek = (firstDay.getDay() + 6) % 7; // Shift Sunday (0) to the end of the week
    
    // Start from the beginning of the week containing the 1st
    const calendarStart = new Date(firstDay);
    calendarStart.setDate(1 - firstDayOfWeek);
    
    for (let i = 0; i < 42; i++) {
      const currentDate = new Date(calendarStart);
      currentDate.setDate(calendarStart.getDate() + i);
      const dateStr = formatDateLocal(currentDate);
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
    if (user?.role === 'viewer' || !isEditMode) return;
    console.log('Clicked date:', date);
    const currentDay = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // // Don't allow selecting past dates
    // if (currentDay < today) return;

    setSelectedDate(date);
    setShowModal(true);
  };

  const handleAvailabilityUpdate = (type: 'unavailable' | 'holiday' | 'available') => {
    const newUnavailable = new Set(unavailableDays);
    const newHolidays = new Set(holidayDays);

    if (type === 'unavailable') {
      newUnavailable.add(selectedDate);
      newHolidays.delete(selectedDate);
    } else if (type === 'holiday') {
      newHolidays.add(selectedDate);
      newUnavailable.delete(selectedDate);
    } else {
      newUnavailable.delete(selectedDate);
      newHolidays.delete(selectedDate);
    }

    setUnavailableDays(newUnavailable);
    setHolidayDays(newHolidays);
    setShowModal(false);
  };

  const saveAvailability = async () => {
    if (!user) return;

    try {
      setSaving(true);
      const availability: DayAvailability[] = [];

      // Get all days of the current month
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      // Use a more reliable loop to avoid date mutation issues
      const currentDateLoop = new Date(startDate);
      while (currentDateLoop <= endDate) {
        // Format date as YYYY-MM-DD without timezone issues
        const dateStr = `${currentDateLoop.getFullYear()}-${String(currentDateLoop.getMonth() + 1).padStart(2, '0')}-${String(currentDateLoop.getDate()).padStart(2, '0')}`;
        availability.push({
          id: '',
          doctorId: user.id,
          date: dateStr,
          isAvailable: !unavailableDays.has(dateStr) && !holidayDays.has(dateStr),
          isHoliday: holidayDays.has(dateStr),
          isUnavailable: unavailableDays.has(dateStr)
        });
        currentDateLoop.setDate(currentDateLoop.getDate() + 1);
      }

      await api.updateDoctorAvailability(user.id, availability);
      setIsEditMode(false);
      alert('Η διαθεσιμότητα αποθηκεύτηκε επιτυχώς!');
    } catch (error) {
      console.error('Failed to save availability:', error);
      alert('Αποτυχία αποθήκευσης διαθεσιμότητας');
    } finally {
      setSaving(false);
    }
  };

  const getDayClass = (day: CalendarDay) => {
    const classes = ['availability-day', 'p-2', 'border', 'text-center', 'position-relative'];
    const dayDate = new Date(day.date);
    const currentMonth = currentDate.getMonth();
    
    if (dayDate.getMonth() !== currentMonth) {
      classes.push('text-muted', 'bg-light');
    }

    if (unavailableDays.has(day.date)) {
      classes.push('day-unavailable');
    } else if (holidayDays.has(day.date)) {
      classes.push('day-holiday');
    }

    if (day.isOnCall) {
      classes.push('day-oncall');
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

  const getAvailableDoctors = (date: string) => {
    console.log('Getting available doctors for date:', date);
    const available = [];
    for (const [doctorId, availability] of Object.entries(allAvailability)) {
      const dayAvail = availability.find(a => a.date === date);
      if (dayAvail && dayAvail.isAvailable) {
        const doctorInfo = doctorsData[doctorId];
        if (doctorInfo) {
          available.push({
            id: doctorId,
            initials: `${doctorInfo.firstName.charAt(0)}${doctorInfo.lastName.charAt(0)}`,
            fullName: `${doctorInfo.firstName} ${doctorInfo.lastName}`
          });
        }
      }
    }
    return available;
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const renderMobileCalendarView = () => {
    // Helper function to format date as YYYY-MM-DD without timezone issues
    const formatDateLocal = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    // Get all days in current month
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    
    const days = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = formatDateLocal(date);
      const dayData = calendarDays.find(d => d.date === dateStr) || { 
        date: dateStr, 
        isOnCall: false, 
        isPublicHoliday: false,
        hasCardioSurgery: false,
        hasThoracicSurgery: false,
        availability: {}
      };
      days.push({ ...dayData, dayNumber: day, dayOfWeek: date.getDay() });
    }

    return (
      <div className="mobile-calendar-view">
        {days.map((day) => {
          const availableDoctors = getAvailableDoctors(day.date);
          const isToday = new Date(day.date).toDateString() === today.toDateString();
          const isWeekend = day.dayOfWeek === 0 || day.dayOfWeek === 6;
          const isUnavailable = unavailableDays.has(day.date);
          const isHoliday = holidayDays.has(day.date);
          const isOnCall = day.isOnCall;
          
          let dayClasses = 'mobile-calendar-day';
          if (isToday) dayClasses += ' today';
          if (isWeekend) dayClasses += ' weekend';
          if (isUnavailable) dayClasses += ' unavailable';
          if (isHoliday) dayClasses += ' holiday';
          if (isOnCall) dayClasses += ' oncall';

          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

          return (
            <div 
              key={day.date} 
              className={dayClasses}
              onClick={() => handleDayClick(day.date)}
              style={{ cursor: (user?.role !== 'viewer' && isEditMode) ? 'pointer' : 'default' }}
            >
              <div className="mobile-day-left">
                <div className="mobile-day-number">{day.dayNumber}</div>
                <div className="mobile-day-name">{dayNames[day.dayOfWeek]}</div>
              </div>
              
              <div className="mobile-day-content">
                <div className="mobile-day-indicators">
                  {isUnavailable && <span className="mobile-indicator" style={{backgroundColor: '#ffebee', color: '#c62828'}}>Μη Διαθέσιμος</span>}
                  {isHoliday && <span className="mobile-indicator" style={{backgroundColor: '#e0e0e0', color: '#616161'}}>Άδεια</span>}
                  {isOnCall && <span className="mobile-indicator" style={{backgroundColor: '#ffebee', color: '#c62828'}}>📞 Εφημερία</span>}
                  {day.isPublicHoliday && <span className="mobile-indicator" style={{backgroundColor: '#e0e0e0', color: '#616161'}}>Αργία</span>}
                  {day.hasCardioSurgery && <span className="mobile-indicator" style={{backgroundColor: '#e3f2fd', color: '#1976d2'}}>ΚΧ</span>}
                  {day.hasThoracicSurgery && <span className="mobile-indicator" style={{backgroundColor: '#e1f5fe', color: '#0277bd'}}>ΘΧ</span>}
                </div>
                
                {availableDoctors.length > 0 ? (
                  <div className="mobile-available-doctors">
                    {availableDoctors.slice(0, 6).map((doctor) => (
                      <span 
                        key={doctor.id} 
                        className={`mobile-doctor-chip ${user?.id === doctor.id ? 'current-user' : ''}`}
                      >
                        {doctor.fullName}
                      </span>
                    ))}
                    {availableDoctors.length > 6 && (
                      <span className="mobile-doctor-chip">+{availableDoctors.length - 6} ακόμα</span>
                    )}
                  </div>
                ) : (
                  <div className="mobile-no-doctors">Δεν υπάρχουν διαθέσιμοι ειδικευόμενοι</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return <LoadingSpinner message="Φόρτωση ημερολογίου..." />;
  }

  const monthNames = [
    'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος',
    'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'
  ];

  const dayNames = ['Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ', 'Κυρ'];

  return (
    <div className='box-around'>
      <Row className="mb-4">
        <Col>
          <h2>Διαθεσιμότητα</h2>
          {user?.role === 'viewer' && (
            <Alert variant="info">
              Έχετε δικαιώματα μόνο προβολής. Το τελικό πρόγραμμα εφημεριών θα εμφανιστεί εδώ όταν είναι διαθέσιμο.
            </Alert>
          )}
          {(user?.role === 'doctor' || user?.role === 'manager') && (
            <Alert variant={isEditMode ? "warning" : "success"} className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center">
              <div className="mb-2 mb-sm-0">
                {isEditMode ? (
                  <>
                    <strong>Λειτουργία Επεξεργασίας:</strong> 
                    <span className="d-none d-sm-inline"> Κάνε κλικ στις ημέρες για να ορίσεις τη διαθεσιμότητά σου. Μην ξεχάσεις να αποθηκεύσεις τις αλλαγές!</span>
                    <span className="d-sm-none"> Πατήστε ημέρες για ορισμό διαθεσιμότητας.</span>
                  </>
                ) : (
                  <>
                    <strong>Λειτουργία Προβολής:</strong> 
                    <span className="d-none d-sm-inline"> Η διαθεσιμότητά σου έχει οριστεί. Κάνε κλικ "Επεξεργασία Διαθεσιμότητας" για αλλαγές.</span>
                    <span className="d-sm-none"> Πάτησε για επεξεργασία της διαθεσιμότητας σου.</span>
                  </>
                )}
              </div>
              <Button 
                variant={isEditMode ? "success" : "primary"}
                onClick={() => setIsEditMode(!isEditMode)}
                size="sm"
                className="align-self-end align-self-sm-center"
              >
                {isEditMode ? "Έξοδος" : "Επεξεργασία"}
                <span className="d-none d-sm-inline"> {isEditMode ? "" : "Διαθεσιμότητας"}</span>
              </Button>
            </Alert>
          )}
        </Col>
      </Row>

      <Card className="calendar-container">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <Button variant="outline-primary" size="sm" onClick={prevMonth}>
            <span className="d-none d-sm-inline">← Προηγούμενος</span>
            <span className="d-sm-none">←</span>
          </Button>
          <h4 className="mb-0 text-center">
            <span className="d-none d-sm-inline">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <span className="d-sm-none">
              {monthNames[currentDate.getMonth()].substring(0, 3)} {currentDate.getFullYear()}
            </span>
          </h4>
          <Button variant="outline-primary" size="sm" onClick={nextMonth}>
            <span className="d-none d-sm-inline">Επόμενος →</span>
            <span className="d-sm-none">→</span>
          </Button>
        </Card.Header>

        {/* Mobile View */}
        <div className="mobile-calendar-view">
          {renderMobileCalendarView()}
        </div>

        {/* Desktop View */}
        <Card.Body className="p-0 desktop-calendar-view">
          {/* Day names header */}
          <Row className="g-0 bg-light">
            {dayNames.map(dayName => (
              <Col key={dayName} className="p-2 text-center fw-bold border">
                {dayName}
              </Col>
            ))}
          </Row>

          {/* Calendar grid */}
          <div className="calendar-grid">
            {Array.from({ length: 6 }, (_, weekIndex) => (
              <Row key={weekIndex} className="g-0">
                {dayNames.map((_, dayIndex) => {
                  const dayData = calendarDays[weekIndex * 7 + dayIndex];
                  if (!dayData) return <Col key={dayIndex} className="border" style={{ minHeight: '80px' }}></Col>;

                const availableDoctors = getAvailableDoctors(dayData.date);
                
                  return (
                    <Col 
                      key={dayIndex} 
                      className={getDayClass(dayData)}
                      onClick={() => handleDayClick(dayData.date)}
                      style={{ 
                        minHeight: '80px', 
                        cursor: (user?.role !== 'viewer' && isEditMode) ? 'pointer' : 'default'
                      }}
                    >
                      <div className="fw-bold">
                        {new Date(dayData.date).getDate()}
                      </div>
                      
                      {/* Show surgery indicators */}
                      <div className="day-indicators">
                        {dayData.hasCardioSurgery && (
                          <span className="surgery-indicator cardio" title="Καρδιοχειρουργική">♥</span>
                        )}
                        {dayData.hasThoracicSurgery && (
                          <span className="surgery-indicator thoracic" title="Θωρακοχειρουργική">🫁</span>
                        )}
                      </div>
                      
                      {/* Show available doctors as green circles with initials */}
                      {availableDoctors.length > 0 && (
                        <OverlayTrigger
                          placement="top"
                          overlay={
                            <Tooltip id={`tooltip-${dayData.date}`}>
                              <div className="text-start">
                                <strong>Διαθέσιμοι Ειδικευόμενοι:</strong>
                                <br />
                                {availableDoctors.map((doctor, index) => (
                                  <div key={doctor.id}>
                                    • {doctor.fullName}
                                  </div>
                                ))}
                              </div>
                            </Tooltip>
                          }
                        >
                          <div className="profile-avatars">
                            {availableDoctors.slice(0, 4).map((doctor) => (
                              <div 
                                key={doctor.id}
                                className="profile-avatar bg-success text-white"
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '8px',
                                  fontWeight: 'bold',
                                  margin: '1px',
                                  cursor: 'pointer'
                                }}
                              >
                                {doctor.initials}
                              </div>
                            ))}
                            {availableDoctors.length > 4 && (
                              <small className="text-muted d-block">+{availableDoctors.length - 4}</small>
                            )}
                          </div>
                        </OverlayTrigger>
                      )}
                    </Col>
                  );
                })}
              </Row>
            ))}
          </div>
        </Card.Body>

        {(user?.role === 'doctor' || user?.role === 'manager') && (
          <Card.Footer>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <Badge bg="danger" className="me-2">■</Badge> Μη Διαθέσιμος
                <Badge bg="secondary" className="me-2 ms-3">■</Badge> Άδεια
                <Badge bg="danger" className="me-2 ms-3">●</Badge> 📞 Εφημερία
                <Badge bg="secondary" className="me-2 ms-3">★</Badge> Αργία
                <Badge bg="success" className="me-2 ms-3">●</Badge> Διαθέσιμοι Ειδικευόμενοι
                <span className="me-2 ms-3" style={{color: '#1976d2'}}>♥</span> ΚΧ (Καρδιοχειρουργική)
                <span className="me-2 ms-3" style={{color: '#0277bd'}}>🫁</span> ΘΧ (Θωρακοχειρουργική)
              </div>
              {isEditMode && (
                <Button 
                  variant="success" 
                  onClick={saveAvailability}
                  disabled={saving}
                  size="lg"
                  className="fw-bold"
                >
                  {saving ? 'Αποθήκευση Αλλαγών...' : 'Αποθήκευση Διαθεσιμότητας'}
                </Button>
              )}
            </div>
          </Card.Footer>
        )}
      </Card>

      {/* Day selection modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Διαθεσιμότητα για {selectedDate}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Πώς θέλετε να σημειώσετε αυτή την ημέρα;</p>
          <div className="d-grid gap-2">
            <Button 
              variant="success" 
              onClick={() => handleAvailabilityUpdate('available')}
            >
              Διαθέσιμος/η για Εφημερία
            </Button>
            <Button 
              variant="danger" 
              onClick={() => handleAvailabilityUpdate('unavailable')}
            >
              Μη Διαθέσιμος/η για Εφημερία
            </Button>
            <Button 
              variant="warning" 
              onClick={() => handleAvailabilityUpdate('holiday')}
            >
              Προσωπική Άδεια
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Calendar;
