import React, { useState, useEffect } from 'react';
import { Card, Button, Row, Col, Badge, Alert, Modal, Form } from 'react-bootstrap';
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

  useEffect(() => {
    loadCalendarData();
  }, [currentDate]);

  const loadCalendarData = async () => {
    try {
      setLoading(true);
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Load hospital days (on-call and public holidays)
      const hospitalDaysData = await api.getHospitalDays(startDateStr, endDateStr);
      setHospitalDays(hospitalDaysData);

      // Load user's availability if doctor or manager
      if (user && (user.role === 'doctor' || user.role === 'manager')) {
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

  const generateCalendarDays = (startDate: Date, endDate: Date, hospitalDays: HospitalDay[]) => {
    const days: CalendarDay[] = [];
    const hospitalDaysMap = new Map(hospitalDays.map(hd => [hd.date, hd]));

    // Start from the first day of the week containing the first day of the month
    const firstDay = new Date(startDate);
    firstDay.setDate(firstDay.getDate() - firstDay.getDay());

    // Generate 6 weeks worth of days
    for (let i = 0; i < 42; i++) {
      const date = new Date(firstDay);
      date.setDate(firstDay.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const hospitalDay = hospitalDaysMap.get(dateStr);
      
      days.push({
        date: dateStr,
        isOnCall: hospitalDay?.isOnCall || false,
        isPublicHoliday: hospitalDay?.isPublicHoliday || false,
        availability: {}
      });
    }

    setCalendarDays(days);
  };

  const handleDayClick = (date: string) => {
    if (user?.role === 'viewer') return;

    const currentDay = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Don't allow selecting past dates
    if (currentDay < today) return;

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

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        availability.push({
          id: '',
          doctorId: user.id,
          date: dateStr,
          isAvailable: !unavailableDays.has(dateStr) && !holidayDays.has(dateStr),
          isHoliday: holidayDays.has(dateStr),
          isUnavailable: unavailableDays.has(dateStr)
        });
      }

      await api.updateDoctorAvailability(user.id, availability);
      alert('Availability saved successfully!');
    } catch (error) {
      console.error('Failed to save availability:', error);
      alert('Failed to save availability');
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

    return classes.join(' ');
  };

  const getAvailableDoctors = (date: string) => {
    const available = [];
    for (const [doctorId, availability] of Object.entries(allAvailability)) {
      const dayAvail = availability.find(a => a.date === date);
      if (dayAvail && dayAvail.isAvailable) {
        available.push(doctorId);
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

  if (loading) {
    return <LoadingSpinner message="Loading calendar..." />;
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div>
      <Row className="mb-4">
        <Col>
          <h2>Schedule Calendar</h2>
          {user?.role === 'viewer' && (
            <Alert variant="info">
              You have view-only access. The final schedule will appear here when available.
            </Alert>
          )}
        </Col>
      </Row>

      <Card className="calendar-container">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <Button variant="outline-primary" onClick={prevMonth}>
            ← Previous
          </Button>
          <h4 className="mb-0">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h4>
          <Button variant="outline-primary" onClick={nextMonth}>
            Next →
          </Button>
        </Card.Header>

        <Card.Body className="p-0">
          {/* Day names header */}
          <Row className="g-0 bg-light">
            {dayNames.map(dayName => (
              <Col key={dayName} className="p-2 text-center fw-bold border">
                {dayName}
              </Col>
            ))}
          </Row>

          {/* Calendar grid */}
          {Array.from({ length: 6 }, (_, weekIndex) => (
            <Row key={weekIndex} className="g-0">
              {dayNames.map((_, dayIndex) => {
                const dayData = calendarDays[weekIndex * 7 + dayIndex];
                if (!dayData) return <Col key={dayIndex}></Col>;

                const availableDoctors = getAvailableDoctors(dayData.date);
                
                return (
                  <Col 
                    key={dayIndex} 
                    className={getDayClass(dayData)}
                    onClick={() => handleDayClick(dayData.date)}
                    style={{ minHeight: '80px', cursor: user?.role !== 'viewer' ? 'pointer' : 'default' }}
                  >
                    <div className="fw-bold">
                      {new Date(dayData.date).getDate()}
                    </div>
                    
                    {/* Show available doctors as small circles */}
                    {availableDoctors.length > 0 && (
                      <div className="profile-avatars">
                        {availableDoctors.slice(0, 3).map((doctorId, index) => (
                          <div 
                            key={doctorId}
                            className="profile-avatar bg-success"
                            title={`Doctor ${doctorId} available`}
                          />
                        ))}
                        {availableDoctors.length > 3 && (
                          <small className="text-muted">+{availableDoctors.length - 3}</small>
                        )}
                      </div>
                    )}
                  </Col>
                );
              })}
            </Row>
          ))}
        </Card.Body>

        {(user?.role === 'doctor' || user?.role === 'manager') && (
          <Card.Footer>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <Badge bg="danger" className="me-2">■</Badge> Unavailable
                <Badge bg="warning" className="me-2 ms-3">■</Badge> Holiday
                <Badge bg="info" className="me-2 ms-3">●</Badge> On Call
                <Badge bg="warning" className="me-2 ms-3">★</Badge> Public Holiday
              </div>
              <Button 
                variant="primary" 
                onClick={saveAvailability}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Availability'}
              </Button>
            </div>
          </Card.Footer>
        )}
      </Card>

      {/* Day selection modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Set Availability for {selectedDate}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>How would you like to mark this day?</p>
          <div className="d-grid gap-2">
            <Button 
              variant="success" 
              onClick={() => handleAvailabilityUpdate('available')}
            >
              Available for Shifts
            </Button>
            <Button 
              variant="danger" 
              onClick={() => handleAvailabilityUpdate('unavailable')}
            >
              Unavailable for Shifts
            </Button>
            <Button 
              variant="warning" 
              onClick={() => handleAvailabilityUpdate('holiday')}
            >
              Personal Holiday
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Calendar;
