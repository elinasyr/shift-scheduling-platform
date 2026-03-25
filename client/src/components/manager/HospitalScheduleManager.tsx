import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Modal, Form, Alert, Badge, Row, Col } from 'react-bootstrap';
import { HospitalDay } from '../../types';
import * as api from '../../services/api';
import { MONTH_NAMES, WEEKDAY_NAMES } from '../../utils/medical';

interface HospitalScheduleManagerProps {
  activeMonth?: Date;
  onMonthChange?: (date: Date) => void;
}

const HospitalScheduleManager: React.FC<HospitalScheduleManagerProps> = ({ activeMonth, onMonthChange }) => {
  const [currentDate, setCurrentDate] = useState(activeMonth || new Date());
  const [hospitalDays, setHospitalDays] = useState<HospitalDay[]>([]);
  const [calendarDays, setCalendarDays] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [scheduleData, setScheduleData] = useState({
    isOnCall: false,
    isPublicHoliday: false,
    hasCardioSurgery: false,
    hasThoracicSurgery: false,
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (activeMonth) {
      setCurrentDate(activeMonth);
    }
  }, [activeMonth]);

  const loadHospitalSchedule = useCallback(async () => {
    try {
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      // Format dates as YYYY-MM-DD without timezone issues
      const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
      const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

      const schedule = await api.getHospitalSchedule(startDateStr, endDateStr);
      setHospitalDays(schedule);
      generateCalendarDays(startDate, endDate, schedule);
    } catch (error) {
      console.error('Failed to load hospital schedule:', error);
      setError('Αποτυχία φόρτωσης προγράμματος νοσοκομείου');
    }
  }, [currentDate]);

  useEffect(() => {
    loadHospitalSchedule();
  }, [loadHospitalSchedule]);

  const generateCalendarDays = (startDate: Date, endDate: Date, hospitalDaysData: HospitalDay[]) => {
    const days: any[] = [];
    const hospitalDaysMap = new Map(hospitalDaysData.map(day => [day.date, day]));
    
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
      
      // Use manual date formatting to avoid timezone issues
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
      const hospitalDay = hospitalDaysMap.get(dateStr);
      
      days.push({
        date: dateStr,
        dayNumber: currentDate.getDate(),
        hospitalDay: hospitalDay || null,
        isCurrentMonth: currentDate.getMonth() === startDate.getMonth()
      });
    }
    
    setCalendarDays(days);
  };

  const handleDayClick = (dateStr: string) => {
    const hospitalDay = hospitalDays.find(h => h.date === dateStr);
    
    setSelectedDate(dateStr);
    setScheduleData({
      isOnCall: hospitalDay?.isOnCall || false,
      isPublicHoliday: hospitalDay?.isPublicHoliday || false,
      hasCardioSurgery: hospitalDay?.hasCardioSurgery || false,
      hasThoracicSurgery: hospitalDay?.hasThoracicSurgery || false,
      description: hospitalDay?.description || ''
    });
    setShowModal(true);
    setMessage('');
    setError('');
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError('');
      
      await api.updateHospitalSchedule({
        date: selectedDate,
        ...scheduleData
      });
      
      setMessage('Το πρόγραμμα νοσοκομείου ενημερώθηκε επιτυχώς!');
      setShowModal(false);
      
      // Reload schedule
      await loadHospitalSchedule();
      
    } catch (error: any) {
      setError(error.response?.data?.error || 'Αποτυχία ενημέρωσης προγράμματος νοσοκομείου');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<any>) => {
    const { name, type, checked, value } = e.target;
    setScheduleData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const nextMonth = () => {
    const nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    setCurrentDate(nextDate);
    onMonthChange?.(nextDate);
  };

  const prevMonth = () => {
    const prevDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    setCurrentDate(prevDate);
    onMonthChange?.(prevDate);
  };

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const configuredDays = new Set(hospitalDays.map((day) => day.date)).size;
  const missingDays = daysInMonth - configuredDays;

  return (
    <>
      <Card className="dashboard-card">
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center">
            <Button variant="outline-primary" onClick={prevMonth} size="sm">
              ← Προηγ
            </Button>
            <h5 className="mb-0">
              {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h5>
            <Button variant="outline-primary" onClick={nextMonth} size="sm">
              Επόμ →
            </Button>
          </div>
        </Card.Header>
        <Card.Body>
          {message && <Alert variant="success">{message}</Alert>}
          {error && <Alert variant="danger">{error}</Alert>}
          {missingDays > 0 && (
            <Alert variant="warning" className="info-banner">
              Ο μήνας δεν έχει συμπληρωθεί πλήρως. Απομένουν {missingDays} ημέρες χωρίς ρύθμιση νοσοκομείου.
            </Alert>
          )}

          <div className="desktop-calendar-view">
            {/* Day names header */}
            <Row className="g-0 bg-light">
              {WEEKDAY_NAMES.slice(1).concat(WEEKDAY_NAMES[0]).map(dayName => (
                <Col key={dayName} className="p-2 text-center fw-bold border" xs={true}>
                  {dayName}
                </Col>
              ))}
            </Row>

            {/* Calendar grid - 6 weeks */}
            {Array.from({ length: 6 }, (_, weekIndex) => (
              <Row key={weekIndex} className="g-0">
                {WEEKDAY_NAMES.slice(1).concat(WEEKDAY_NAMES[0]).map((_, dayIndex) => {
                  const dayData = calendarDays[weekIndex * 7 + dayIndex];
                  
                  if (!dayData) {
                    return (
                      <Col 
                        key={dayIndex} 
                        className="border" 
                        style={{ minHeight: '100px' }}
                      >
                        {/* Empty cell */}
                      </Col>
                    );
                  }

                  return (
                    <Col 
                      key={dayIndex} 
                      className={`border p-2 position-relative ${!dayData.isCurrentMonth ? 'text-muted bg-light' : ''} ${dayData.hospitalDay?.isOnCall ? 'day-oncall' : ''} ${dayData.hospitalDay?.hasCardioSurgery ? 'day-cardio-surgery' : ''} ${dayData.hospitalDay?.hasThoracicSurgery ? 'day-thoracic-surgery' : ''}`}
                      style={{ 
                        minHeight: '100px', 
                        cursor: 'pointer',
                        backgroundColor: dayData.hospitalDay ? '#f8f9fa' : (dayData.isCurrentMonth ? 'white' : '#f8f9fa')
                      }}
                      onClick={() => handleDayClick(dayData.date)}
                    >
                      <div className="fw-bold">{dayData.dayNumber}</div>
                      
                      {dayData.hospitalDay && (
                        <div className="mt-1">
                          {dayData.hospitalDay.isOnCall && (
                            <Badge bg="danger" className="d-block mb-1" style={{ fontSize: '0.7rem' }}>
                              📞 Εφημερία
                            </Badge>
                          )}
                          {dayData.hospitalDay.isPublicHoliday && (
                            <Badge bg="secondary" className="d-block mb-1" style={{ fontSize: '0.7rem' }}>
                              Αργία
                            </Badge>
                          )}
                          {dayData.hospitalDay.hasCardioSurgery && (
                            <Badge bg="primary" className="d-block mb-1" style={{ fontSize: '0.7rem' }}>
                              ΚΧ
                            </Badge>
                          )}
                          {dayData.hospitalDay.hasThoracicSurgery && (
                            <Badge bg="info" className="d-block mb-1" style={{ fontSize: '0.7rem' }}>
                              ΘΧ
                            </Badge>
                          )}
                        </div>
                      )}
                    </Col>
                  );
                })}
              </Row>
            ))}
          </div>

          {/* Mobile Calendar View */}
          <div className="mobile-calendar-view">
            {calendarDays.filter((day: any) => day !== null).map((dayData: any) => (
              <div 
                key={dayData.date} 
                className={`mobile-calendar-day ${dayData.hospitalDay?.isOnCall ? 'oncall' : ''}`}
                onClick={() => handleDayClick(dayData.date)}
                style={{ cursor: 'pointer' }}
              >
                <div className="mobile-day-left">
                  <div className="mobile-day-number">{dayData.dayNumber}</div>
                  <div className="mobile-day-name">
                    {WEEKDAY_NAMES[new Date(`${dayData.date}T12:00:00`).getDay()]}
                  </div>
                </div>
                
                <div className="mobile-day-content">
                  {dayData.hospitalDay ? (
                    <div className="mobile-day-indicators">
                      {dayData.hospitalDay.isOnCall && (
                        <span className="mobile-indicator" style={{backgroundColor: '#ffebee', color: '#c62828'}}>
                          📞 Εφημερία
                        </span>
                      )}
                      {dayData.hospitalDay.isPublicHoliday && (
                        <span className="mobile-indicator" style={{backgroundColor: '#e0e0e0', color: '#616161'}}>
                          Αργία
                        </span>
                      )}
                      {dayData.hospitalDay.hasCardioSurgery && (
                        <span className="mobile-indicator" style={{backgroundColor: '#e3f2fd', color: '#1976d2'}}>
                          ΚΧ
                        </span>
                      )}
                      {dayData.hospitalDay.hasThoracicSurgery && (
                        <span className="mobile-indicator" style={{backgroundColor: '#e1f5fe', color: '#0277bd'}}>
                          ΘΧ
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="mobile-no-doctors">Πατήστε για ορισμό προγράμματος</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3">
            <small className="text-muted">
              Κάντε κλικ σε οποιαδήποτε ημέρα για να ορίσετε το πρόγραμμα του νοσοκομείου (ημέρες εφημερίας, χειρουργεία, αργίες)
            </small>
          </div>
        </Card.Body>
      </Card>

      {/* Schedule Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedDate ? new Date(selectedDate).toLocaleDateString('el-GR') : ''}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}

          <Form>
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                name="isOnCall"
                label="Ημέρα Εφημερίας"
                checked={scheduleData.isOnCall}
                onChange={handleInputChange}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                name="isPublicHoliday"
                label="Αργία"
                checked={scheduleData.isPublicHoliday}
                onChange={handleInputChange}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                name="hasCardioSurgery"
                label="Ημέρα Χειρουργείου Καρδιοχειρουργικής (ΚΧ)"
                checked={scheduleData.hasCardioSurgery}
                onChange={handleInputChange}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                name="hasThoracicSurgery"
                label="Ημέρα Χειρουργείου Θωρακοχειρουργικής (ΘΧ)"
                checked={scheduleData.hasThoracicSurgery}
                onChange={handleInputChange}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Περιγραφή (Προαιρετικό)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                placeholder="Πρόσθετες σημειώσεις για αυτήν την ημέρα..."
                value={scheduleData.description}
                onChange={handleInputChange}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Ακύρωση
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Αποθήκευση...' : 'Αποθήκευση Προγράμματος'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default HospitalScheduleManager;
