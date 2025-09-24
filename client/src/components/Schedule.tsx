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
      alert('Failed to download schedule. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const getDoctorName = (doctorId: string) => {
    const doctor = doctors.find(d => d.id === doctorId);
    return doctor ? `${doctor.firstName} ${doctor.lastName}` : 'Unknown Doctor';
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
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
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
      hospitalDay?.isOnCall ? 'on-call' : ''
    ].filter(Boolean).join(' ');

    return (
      <div key={dateStr} className={dayClasses}>
        <div className="day-header">
          <span className="day-number">{date.getDate()}</span>
          <div className="day-indicators">
            {hospitalDay?.isPublicHoliday && (
              <Badge bg="danger" className="me-1" title="Public Holiday">🏛️</Badge>
            )}
            {hospitalDay?.isOnCall && (
              <Badge bg="warning" className="me-1" title="On-Call Day">📞</Badge>
            )}
          </div>
        </div>
        <div className="day-content">
          {daySchedule?.doctorIds.map(doctorId => {
            const doctor = doctors.find(d => d.id === doctorId);
            const doctorName = doctor ? doctor.lastName : 'Unknown';
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
            <div className="no-assignment">No assignments</div>
          )}
        </div>
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
      <div className="calendar-view">
        <div className="calendar-header">
          <div className="weekday">Sun</div>
          <div className="weekday">Mon</div>
          <div className="weekday">Tue</div>
          <div className="weekday">Wed</div>
          <div className="weekday">Thu</div>
          <div className="weekday">Fri</div>
          <div className="weekday">Sat</div>
        </div>
        <div className="calendar-grid">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="calendar-week">
              {week.map((day, dayIndex) => renderCalendarDay(day))}
            </div>
          ))}
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
            <th>Date</th>
            <th>Day</th>
            <th>Assigned Doctors</th>
            <th>Special Notes</th>
          </tr>
        </thead>
        <tbody>
          {sortedSchedule.map((shift) => {
            const hospitalDay = getHospitalDay(shift.date);
            return (
              <tr key={shift.id} className={isUserOnCall(shift.date) ? 'user-assigned-row' : ''}>
                <td>{new Date(shift.date).toLocaleDateString()}</td>
                <td>{new Date(shift.date).toLocaleDateString('en-US', { weekday: 'long' })}</td>
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
                              <Badge bg="primary" className="ms-2">You</Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-muted">No assignments</span>
                  )}
                </td>
                <td>
                  {hospitalDay?.isPublicHoliday && (
                    <Badge bg="danger" className="me-1">Holiday</Badge>
                  )}
                  {hospitalDay?.isOnCall && (
                    <Badge bg="warning" className="me-1">On-Call</Badge>
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
    return <LoadingSpinner message="Loading schedule..." />;
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const hasSchedule = schedule.length > 0;

  return (
    <div>
      <Row className="mb-4">
        <Col>
          <h2>Schedule</h2>
          <p className="text-muted">
            {user?.role === 'viewer' 
              ? 'View the official shift schedule'
              : 'View the shift schedule'
            }
          </p>
        </Col>
      </Row>

      {user?.role === 'viewer' && !hasSchedule && (
        <Alert variant="info" className="text-center">
          <div className="py-5">
            <h4>No Schedule Available</h4>
            <p className="mb-0">
              The official shift schedule is not yet available. Please check back later when the schedule has been finalized by the management team.
            </p>
          </div>
        </Alert>
      )}

      {(user?.role !== 'viewer' || hasSchedule) && (
        <>
          <Card className="dashboard-card mb-4">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center">
                <Button variant="outline-primary" onClick={prevMonth} className="me-3">
                  ← Previous
                </Button>
                <h4 className="mb-0">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h4>
                <Button variant="outline-primary" onClick={nextMonth} className="ms-3">
                  Next →
                </Button>
              </div>
              <div className="d-flex align-items-center">
                <ButtonGroup className="me-3">
                  <Button 
                    variant={viewMode === 'calendar' ? 'primary' : 'outline-primary'}
                    onClick={() => setViewMode('calendar')}
                  >
                    Calendar
                  </Button>
                  <Button 
                    variant={viewMode === 'list' ? 'primary' : 'outline-primary'}
                    onClick={() => setViewMode('list')}
                  >
                    List
                  </Button>
                </ButtonGroup>
                {hasSchedule && (
                  <Button 
                    variant="success" 
                    onClick={handleDownload}
                    disabled={downloading}
                  >
                    {downloading ? 'Downloading...' : 'Download PDF'}
                  </Button>
                )}
              </div>
            </Card.Header>
          </Card>

          <Card className="dashboard-card">
            <Card.Body>
              {hasSchedule ? (
                viewMode === 'calendar' ? renderCalendarView() : renderListView()
              ) : (
                <Alert variant="warning">
                  <h5>No Schedule Generated</h5>
                  <p>No schedule has been generated for this month yet.</p>
                  {user?.role === 'manager' && (
                    <p>
                      You can generate a schedule from the{' '}
                      <a href="/manager" className="alert-link">Manager Dashboard</a>.
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
                <h5 className="mb-0">Schedule Legend</h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <div className="mb-2">
                      <Badge bg="danger" className="me-2">🏛️</Badge>
                      <span>Public Holiday</span>
                    </div>
                    <div className="mb-2">
                      <Badge bg="warning" className="me-2">📞</Badge>
                      <span>On-Call Day</span>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="mb-2">
                      <span className="calendar-day-sample user-assigned me-2"></span>
                      <span>Your assignments</span>
                    </div>
                    <div className="mb-2">
                      <span className="calendar-day-sample today me-2"></span>
                      <span>Today</span>
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
          background-color: #f8d7da;
        }
        
        .calendar-day.on-call {
          background-color: #fff3cd;
        }
        
        .day-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.25rem;
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
