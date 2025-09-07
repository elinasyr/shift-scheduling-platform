import React, { useState, useEffect, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Card, Button, Modal, Form, Alert } from 'react-bootstrap';
import { getShifts, getHolidays, getDoctorAvailability, setDoctorAvailability } from '../services/api';
import { AvailabilityStatus } from '../types';
import { useDoctor } from '../context/DoctorContext';

const DoctorCalendar: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>(AvailabilityStatus.AVAILABLE);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get doctor ID from context
  const { currentDoctorId, currentDoctor } = useDoctor();
  
  const fetchCalendarData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get the current date
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const formattedStartDate = startDate.toISOString().split('T')[0];
      const formattedEndDate = endDate.toISOString().split('T')[0];
      
      // Fetch holidays
      const holidays = await getHolidays(formattedStartDate, formattedEndDate);
      
      // Fetch shifts
      const shifts = await getShifts(formattedStartDate, formattedEndDate);
      
      // Fetch doctor's availability
      const availability = await getDoctorAvailability(currentDoctorId, formattedStartDate, formattedEndDate);
      
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
        title: `Shift: ${shift.doctor.name}`,
        start: shift.date,
        allDay: true,
        className: shift.isOverride ? 'shift-event is-override' : 'shift-event',
        extendedProps: {
          type: 'shift',
          shift
        }
      }));
      
      // Create availability events
      const availabilityEvents: any[] = [];
      if (availability && availability.availability) {
        Object.entries(availability.availability).forEach(([date, status]) => {
          availabilityEvents.push({
            start: date,
            allDay: true,
            display: 'background',
            className: `availability-${status}`,
            extendedProps: {
              type: 'availability',
              status
            }
          });
        });
      }
      
      // Combine all events
      setEvents([...holidayEvents, ...shiftEvents, ...availabilityEvents]);
      
    } catch (err) {
      console.error('Error fetching calendar data:', err);
      setError('Failed to load calendar data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentDoctorId]);
  
  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);
  
  const handleDateClick = (arg: any) => {
    // Don't allow setting availability for past dates
    const clickedDate = new Date(arg.dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // if (clickedDate < today) {
    //   return;
    // }
    
    setSelectedDate(arg.dateStr);
    setShowModal(true);
  };
  
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedDate(null);
  };
  
  const handleSubmitAvailability = async () => {
    if (!selectedDate) return;
    
    try {
      await setDoctorAvailability(currentDoctorId, selectedDate, availabilityStatus);
      fetchCalendarData(); // Refresh calendar data
      handleCloseModal();
    } catch (err) {
      console.error('Error setting availability:', err);
      setError('Failed to update availability. Please try again.');
    }
  };
  
  return (
    <div className="calendar-container">
      <Card>
        <Card.Header>
          <h4>Doctor Schedule Calendar</h4>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <p>Loading calendar data...</p>
          ) : error ? (
            <Alert variant="danger">{error}</Alert>
          ) : (
            <>
              <div className="shift-legend">
                <div className="legend-item">
                  <div className="legend-color color-available"></div>
                  <span>Available</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color color-unavailable"></div>
                  <span>Unavailable</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color color-preferred"></div>
                  <span>Preferred</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color color-holiday"></div>
                  <span>Holiday</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color color-shift"></div>
                  <span>Shift</span>
                </div>
              </div>
              
              <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                events={events}
                dateClick={handleDateClick}
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth'
                }}
                height="auto"
              />
            </>
          )}
        </Card.Body>
      </Card>
      
      {/* Availability Modal */}
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>Set Availability for {selectedDate}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>Availability Status</Form.Label>
              <Form.Select
                value={availabilityStatus}
                onChange={(e) => setAvailabilityStatus(e.target.value as AvailabilityStatus)}
              >
                <option value={AvailabilityStatus.AVAILABLE}>Available</option>
                <option value={AvailabilityStatus.UNAVAILABLE}>Unavailable</option>
                <option value={AvailabilityStatus.PREFERRED}>Preferred</option>
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmitAvailability}>
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default DoctorCalendar;
