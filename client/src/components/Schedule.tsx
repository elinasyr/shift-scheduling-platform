import React, { useState, useEffect } from 'react';
import { Card, Button, Row, Col, Alert, Table, Badge, ButtonGroup } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { Schedule as ScheduleType, Doctor, HospitalDay } from '../types';
import * as api from '../services/api';
import LoadingSpinner from './common/LoadingSpinner';

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
    loadScheduleData();
  }, [currentDate]);

  const loadScheduleData = async () => {
    try {
      setLoading(true);
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

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

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const blob = await api.downloadSchedule(startDateStr, endDateStr);
      
      // Check if the blob is actually a PDF or fallback text
      const contentType = blob.type;
      const fileName = contentType.includes('pdf') 
        ? `schedule-${startDateStr}-to-${endDateStr}.pdf`
        : `schedule-${startDateStr}-to-${endDateStr}.txt`;
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
      
    } catch (error) {
      console.error('Failed to download schedule:', error);
      alert('Αποτυχία λήψης προγράμματος εφημεριών. Παρακαλώ δοκιμάστε ξανά.');
    } finally {
      setDownloading(false);
    }
  };

  const getDoctorName = (doctorId: string) => {
    const doctor = doctors.find(d => d.id === doctorId);
    return doctor ? `${doctor.firstName} ${doctor.lastName}` : 'Άγνωστος Ειδικευόμενος';
  };

  const getDoctorSpecialty = (doctorId: string) => {
    const doctor = doctors.find(d => d.id === doctorId);
    return doctor?.specialty || '';
  };

  const getHospitalDay = (date: string) => {
    return hospitalDays.find(hd => hd.date === date);
  };

  const getScheduleForDate = (date: string) => {
    return schedule.find(s => s.date === date);
  };

  const isUserOnCall = (date: string) => {
    if (!user || user.role === 'viewer') return false;
    const daySchedule = getScheduleForDate(date);
    if (daySchedule && daySchedule.doctorIds.length > 0) {
      console.log('Checking user on call:', {
        userId: user.id,
        userIdType: typeof user.id,
        doctorIds: daySchedule.doctorIds,
        doctorIdsTypes: daySchedule.doctorIds.map(id => typeof id),
        date: date
      });
    }
    // Convert both to strings to ensure proper comparison
    return daySchedule?.doctorIds.includes(String(user.id)) || false;
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7; // Shift Sunday (0) to the end of the week
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days in the month - use local date creation to avoid timezone issues
    for (let day = 1; day <= daysInMonth; day++) {
      // Create date using local timezone to avoid shifting
      const date = new Date(year, month, day, 12, 0, 0); // Set to noon to avoid timezone issues
      days.push(date);
    }
    
    return days;
  };

  const renderCalendarDay = (date: Date | null) => {
    if (!date) {
      return <div className="calendar-day empty"></div>;
    }

    // Format date as YYYY-MM-DD using local timezone
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const daySchedule = getScheduleForDate(dateStr);
    const hospitalDay = getHospitalDay(dateStr);
    const isUserAssigned = isUserOnCall(dateStr);
    const isToday = date.toDateString() === new Date().toDateString();

    const dayClasses = [
      'calendar-day',
      isToday ? 'today' : '',
      isUserAssigned ? 'user-assigned' : '',
      hospitalDay?.isPublicHoliday ? 'holiday' : '',
      hospitalDay?.isOnCall ? 'on-call' : '',
      hospitalDay?.hasCardioSurgery ? 'cardio-surgery' : '',
      hospitalDay?.hasThoracicSurgery ? 'thoracic-surgery' : ''
    ].filter(Boolean).join(' ');

    return (
      <div key={dateStr} className={dayClasses}>
        <div className="day-header">
          <span className="day-number">{date.getDate()}</span>
          <div className="day-indicators">
            {hospitalDay?.isPublicHoliday && (
              <Badge bg="secondary" className="me-1" title="Αργία">🏛️</Badge>
            )}
            {hospitalDay?.isOnCall && (
              <Badge bg="danger" className="me-1" title="Ημέρα Εφημερίας">📞</Badge>
            )}
            {hospitalDay?.hasCardioSurgery && (
              <Badge bg="primary" className="me-1" title="ΚΧ (Καρδιοχειρουργική)" style={{backgroundColor: '#1976d2'}}>♥</Badge>
            )}
            {hospitalDay?.hasThoracicSurgery && (
              <Badge bg="info" className="me-1" title="ΘΧ (Θωρακοχειρουργική)" style={{backgroundColor: '#0277bd'}}>🫁</Badge>
            )}
          </div>
        </div>
        <div className="day-content">
          {daySchedule?.doctorIds.map(doctorId => {
            const doctor = doctors.find(d => d.id === doctorId);
            const doctorName = doctor ? doctor.lastName : 'Άγνωστος';
            const isCurrentUser = user?.id === doctorId || String(user?.id) === String(doctorId);
            return (
              <div 
                key={doctorId} 
                className={`doctor-assignment ${isCurrentUser ? 'current-user' : ''}`}
                title={getDoctorName(doctorId)}
              >
                {doctorName}
              </div>
            );
          })}
          {(!daySchedule || daySchedule.doctorIds.length === 0) && (
            <div className="no-assignment">Χωρίς αναθέσεις</div>
          )}
        </div>
      </div>
    );
  };

  const renderMobileScheduleView = () => {
    const days = getDaysInMonth().filter(day => day !== null) as Date[];
    const today = new Date();
    
    return (
      <div className="mobile-calendar-view">
        {days.map((day) => {
          const dateStr = day.toISOString().split('T')[0];
          const scheduleForDay = getScheduleForDate(dateStr);
          const hospitalDay = getHospitalDay(dateStr);
          const isToday = day.toDateString() === today.toDateString();
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          const isUserOnCallDay = isUserOnCall(dateStr);
          
          let dayClasses = 'mobile-calendar-day';
          if (isToday) dayClasses += ' today';
          if (isWeekend) dayClasses += ' weekend';
          if (hospitalDay?.isOnCall) dayClasses += ' oncall';
          if (hospitalDay?.isPublicHoliday) dayClasses += ' holiday';
          if (hospitalDay?.hasCardioSurgery) dayClasses += ' cardio-surgery';
          if (hospitalDay?.hasThoracicSurgery) dayClasses += ' thoracic-surgery';

          const dayNames = ['Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ', 'Κυρ'];
          const assignedDoctors = scheduleForDay?.doctorIds || [];

          return (
            <div key={dateStr} className={dayClasses}>
              <div className="mobile-day-left">
                <div className="mobile-day-number">{day.getDate()}</div>
                <div className="mobile-day-name">{dayNames[day.getDay()]}</div>
              </div>
              
              <div className="mobile-day-content">
                <div className="mobile-day-indicators">
                  {hospitalDay?.isOnCall && <span className="mobile-indicator" style={{backgroundColor: '#ffebee', color: '#c62828'}}>📞 Εφημερία</span>}
                  {hospitalDay?.isPublicHoliday && <span className="mobile-indicator" style={{backgroundColor: '#e0e0e0', color: '#616161'}}>Αργία</span>}
                  {hospitalDay?.hasCardioSurgery && <span className="mobile-indicator" style={{backgroundColor: '#e3f2fd', color: '#1976d2'}}>ΚΧ</span>}
                  {hospitalDay?.hasThoracicSurgery && <span className="mobile-indicator" style={{backgroundColor: '#e1f5fe', color: '#0277bd'}}>ΘΧ</span>}
                  {scheduleForDay && !scheduleForDay.isFinalized && <span className="mobile-indicator" style={{backgroundColor: '#fff3e0', color: '#ef6c00'}}>Προσχέδιο</span>}
                  {scheduleForDay?.isFinalized && <span className="mobile-indicator" style={{backgroundColor: '#e8f5e8', color: '#2e7d32'}}>Τελικό</span>}
                </div>
                
                {assignedDoctors.length > 0 ? (
                  <div className="mobile-available-doctors">
                    {assignedDoctors.map((doctorId) => {
                      const doctor = doctors.find(d => String(d.id) === String(doctorId));
                      const isCurrentUser = user?.id === doctorId || String(user?.id) === String(doctorId);
                      return doctor ? (
                        <span 
                          key={doctorId} 
                          className={`mobile-doctor-chip ${isCurrentUser ? 'current-user' : ''}`}
                        >
                          {doctor.firstName} {doctor.lastName}
                        </span>
                      ) : null;
                    })}
                  </div>
                ) : (
                  <div className="mobile-no-doctors">Δεν έχουν ανατεθεί ειδικευόμενοι</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderCalendarView = () => {
    const days = getDaysInMonth();
    const weeks = [];
    
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return (
      <div className="desktop-calendar-view">
        <div className="calendar-view">
          <div className="calendar-header">
            {['Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ', 'Κυρ'].map(dayName => (
              <div key={dayName} className="weekday">
                {dayName}
              </div>
            ))}
          </div>
          <div className="calendar-grid">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="calendar-week">
                {week.map((day, dayIndex) => renderCalendarDay(day))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderListView = () => {
    const visibleSchedule = user?.role === 'viewer' 
      ? schedule.filter(s => s.isFinalized) 
      : schedule;

    // Sort by date
    const sortedSchedule = [...visibleSchedule].sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    return (
      <Table responsive striped>
        <thead>
          <tr>
            <th>Ημερομηνία</th>
            <th>Ημέρα</th>
            <th>Ανατεθέντες Ειδικευόμενοι</th>
            <th>Ειδικές Σημειώσεις</th>
          </tr>
        </thead>
        <tbody>
          {sortedSchedule.map((shift) => {
            const hospitalDay = getHospitalDay(shift.date);
            return (
              <tr key={shift.id} className={isUserOnCall(shift.date) ? 'user-assigned-row' : ''}>
                <td>{new Date(shift.date).toLocaleDateString('el-GR')}</td>
                <td>{new Date(shift.date).toLocaleDateString('el-GR', { weekday: 'long' })}</td>
                <td>
                  {shift.doctorIds.length > 0 ? (
                    <div>
                      {shift.doctorIds.map((doctorId, index) => {
                        const isCurrentUser = user?.id === doctorId || String(user?.id) === String(doctorId);
                        return (
                          <div key={doctorId} className="mb-1">
                            <strong className={isCurrentUser ? 'text-primary' : ''}>
                              {getDoctorName(doctorId)}
                            </strong>
                            {getDoctorSpecialty(doctorId) && (
                              <Badge bg="secondary" className="ms-2">
                                {getDoctorSpecialty(doctorId)}
                              </Badge>
                            )}
                            {isCurrentUser && (
                              <Badge bg="primary" className="ms-2">Εσείς</Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-muted">Χωρίς αναθέσεις</span>
                  )}
                </td>
                <td>
                  {hospitalDay?.isPublicHoliday && (
                    <Badge bg="secondary" className="me-1">Αργία</Badge>
                  )}
                  {hospitalDay?.isOnCall && (
                    <Badge bg="danger" className="me-1">📞 Εφημερία</Badge>
                  )}
                  {hospitalDay?.description && (
                    <small className="text-muted">{hospitalDay.description}</small>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    );
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  if (loading) {
    return <LoadingSpinner message="Φόρτωση προγράμματος εφημεριών..." />;
  }

  const monthNames = [
    'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος',
    'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'
  ];

  const hasSchedule = schedule.length > 0;

  return (
    <div className='box-around'>
      <Row className="mb-4">
        <Col>
          <h2>Πρόγραμμα Εφημεριών</h2>
          <p className="text-muted">
            {user?.role === 'viewer' 
              ? 'Προβολή του επίσημου προγράμματος εφημεριών'
              : 'Προβολή του προγράμματος εφημεριών'
            }
          </p>
        </Col>
      </Row>

      {user?.role === 'viewer' && !hasSchedule && (
        <Alert variant="info" className="text-center">
          <div className="py-5">
            <h4>Δεν υπάρχει Διαθέσιμο Πρόγραμμα</h4>
            <p className="mb-0">
              Το επίσημο πρόγραμμα εφημεριών δεν είναι ακόμα διαθέσιμο. Παρακαλώ ελέγξτε ξανά αργότερα όταν το πρόγραμμα θα έχει οριστικοποιηθεί από την ομάδα διαχείρισης.
            </p>
          </div>
        </Alert>
      )}

      {(user?.role !== 'viewer' || hasSchedule) && (
        <>
          <Card className="dashboard-card mb-4">
            <Card.Header>
              <div className="d-block d-lg-flex justify-content-between align-items-center">
                {/* Month navigation */}
                <div className="d-flex align-items-center justify-content-center mb-3 mb-lg-0">
                  <Button variant="outline-primary" onClick={prevMonth} className="me-2" size="sm">
                    ← Προηγ
                  </Button>
                  <h5 className="mb-0 mx-2 text-center">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </h5>
                  <Button variant="outline-primary" onClick={nextMonth} className="ms-2" size="sm">
                    Επόμ →
                  </Button>
                </div>
                
                {/* View controls */}
                <div className="d-flex flex-column flex-sm-row gap-2 justify-content-center">
                  <ButtonGroup className="flex-fill">
                    <Button 
                      variant={viewMode === 'calendar' ? 'primary' : 'outline-primary'}
                      onClick={() => setViewMode('calendar')}
                      size="sm"
                    >
                      Ημερολόγιο
                    </Button>
                    <Button 
                      variant={viewMode === 'list' ? 'primary' : 'outline-primary'}
                      onClick={() => setViewMode('list')}
                      size="sm"
                    >
                      Λίστα
                    </Button>
                  </ButtonGroup>
                  {hasSchedule && (
                    <Button 
                      variant="success" 
                      onClick={handleDownload}
                      disabled={downloading}
                      className="flex-fill"
                      size="sm"
                    >
                      {downloading ? 'Λήψη...' : 'Λήψη PDF'}
                    </Button>
                  )}
                </div>
              </div>
            </Card.Header>
          </Card>

          <Card className="dashboard-card">
            <Card.Body>
              {hasSchedule ? (
                viewMode === 'calendar' ? (
                  <>
                    {renderMobileScheduleView()}
                    {renderCalendarView()}
                  </>
                ) : renderListView()
              ) : (
                <Alert variant="warning">
                  <h5>Δεν Έχει Δημιουργηθεί Πρόγραμμα</h5>
                  <p>Δεν έχει δημιουργηθεί ακόμα πρόγραμμα για αυτόν τον μήνα.</p>
                  {user?.role === 'manager' && (
                    <p>
                      Μπορείτε να δημιουργήσετε πρόγραμμα από το{' '}
                      <a href="/manager" className="alert-link">Πίνακα Διαχείρισης</a>.
                    </p>
                  )}
                </Alert>
              )}
            </Card.Body>
          </Card>
        </>
      )}

      {hasSchedule && user?.role !== 'viewer' && (
        <Row className="mt-4">
          <Col>
            <Card className="dashboard-card">
              <Card.Header>
                <h5 className="mb-0">Υπόμνημα Προγράμματος</h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <div className="mb-2">
                      <Badge bg="secondary" className="me-2">🏛️</Badge>
                      <span>Αργία</span>
                    </div>
                    <div className="mb-2">
                      <Badge bg="danger" className="me-2">📞</Badge>
                      <span>Ημέρα Εφημερίας</span>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="mb-2">
                      <span className="calendar-day-sample user-assigned me-2"></span>
                      <span>Οι αναθέσεις σας</span>
                    </div>
                    <div className="mb-2">
                      <span className="calendar-day-sample today me-2"></span>
                      <span>Σήμερα</span>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        .calendar-view {
          font-size: 0.85rem;
        }
        
        .calendar-header {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 1px;
          margin-bottom: 1px;
        }
        
        .weekday {
          padding: 0.5rem;
          text-align: center;
          font-weight: bold;
          background-color: #f8f9fa;
          border: 1px solid #dee2e6;
        }
        
        .calendar-grid {
          display: grid;
          gap: 1px;
        }
        
        .calendar-week {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 1px;
        }
        
        .calendar-day {
          min-height: 100px;
          border: 1px solid #dee2e6;
          background-color: white;
          padding: 0.25rem;
          display: flex;
          flex-direction: column;
        }
        
        /* Mobile responsive styles for Schedule calendar */
        @media (max-width: 768px) {
          .calendar-view {
            font-size: 0.7rem;
          }
          
          .weekday {
            padding: 0.25rem;
            font-size: 0.7rem;
          }
          
          .calendar-day {
            min-height: 60px;
            padding: 0.15rem;
          }
          
          .day-number {
            font-size: 0.75rem !important;
          }
          
          .doctor-assignment {
            font-size: 0.65rem !important;
            padding: 0.1rem 0.2rem !important;
          }
          
          .day-indicators .badge {
            font-size: 0.6rem !important;
            padding: 0.05rem 0.2rem !important;
          }
        }
        
        @media (max-width: 480px) {
          .calendar-view {
            font-size: 0.65rem;
          }
          
          .weekday {
            padding: 0.2rem;
            font-size: 0.65rem;
          }
          
          .calendar-day {
            min-height: 50px;
            padding: 0.1rem;
          }
          
          .day-number {
            font-size: 0.7rem !important;
          }
          
          .doctor-assignment {
            font-size: 0.6rem !important;
            padding: 0.05rem 0.15rem !important;
          }
        }
        
        .calendar-day.empty {
          background-color: #f8f9fa;
          border: 1px solid #e9ecef;
        }
        
        .calendar-day.today {
          border: 2px solid #007bff;
          background-color: #e7f3ff;
        }
        
        .calendar-day.user-assigned {
          background-color: #d1ecf1;
          border: 2px solid #17a2b8;
          box-shadow: 0 0 0 1px #17a2b8;
        }
        
        .calendar-day.holiday {
          background-color: #e0e0e0;
        }
        
        .calendar-day.on-call {
          background-color: #ffebee;
        }
        
        .day-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.25rem;
        }
        
        .day-indicators {
          display: flex;
          flex-wrap: nowrap;
          gap: 2px;
          align-items: center;
        }
        
        .day-number {
          font-weight: bold;
          font-size: 0.9rem;
        }
        
        .day-indicators .badge {
          font-size: 0.7rem;
          padding: 0.1rem 0.3rem;
        }
        
        .day-content {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
        }
        
        .doctor-assignment {
          background-color: #e9ecef;
          border-radius: 0.25rem;
          padding: 0.2rem 0.4rem;
          font-size: 0.75rem;
          text-align: center;
          font-weight: bold;
          border: 1px solid #ced4da;
        }
        
        .doctor-assignment.current-user {
          background-color: #28a745;
          color: white;
          border: 2px solid #1e7e34;
          box-shadow: 0 0 0 1px #1e7e34;
          font-weight: bold;
        }
        
        .no-assignment {
          font-size: 0.7rem;
          color: #6c757d;
          text-align: center;
          font-style: italic;
        }
        
        .user-assigned-row {
          background-color: #d4edda;
        }
        
        .calendar-day-sample {
          display: inline-block;
          width: 20px;
          height: 15px;
          border: 1px solid #dee2e6;
          border-radius: 2px;
        }
        
        .calendar-day-sample.user-assigned {
          background-color: #d1ecf1;
          border: 2px solid #17a2b8;
        }
        
        .calendar-day-sample.today {
          border: 2px solid #007bff;
          background-color: #e7f3ff;
        }
        `
      }} />
    </div>
  );
};

export default Schedule;
