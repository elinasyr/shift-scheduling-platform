import React, { useState, useEffect } from 'react';
import { Navbar, Nav, Container, Badge, Dropdown } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { getDoctors } from '../services/api';
import { Doctor } from '../types';
import { useDoctor } from '../context/DoctorContext';

const NavigationBar: React.FC = () => {
  const { currentDoctor, currentDoctorId, setCurrentDoctorId, loading } = useDoctor();
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
  
  // Fetch all doctors for the dropdown
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const doctors = await getDoctors();
        setAllDoctors(doctors);
      } catch (error) {
        console.error('Error fetching doctors:', error);
      }
    };
    
    fetchDoctors();
  }, []);
  
  // Handle changing the current doctor
  const handleDoctorChange = (doctorId: number) => {
    setCurrentDoctorId(doctorId);
  };
  
  return (
    <Navbar bg="dark" variant="dark" expand="lg">
      <Container>
        <Navbar.Brand as={Link} to="/">Doctor Scheduling</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/">Calendar</Nav.Link>
            <Nav.Link as={Link} to="/doctors">Doctors</Nav.Link>
            <Nav.Link as={Link} to="/manager">Manager Dashboard</Nav.Link>
          </Nav>
          <Nav>
            {!loading && currentDoctor && (
              <Dropdown align="end">
                <Dropdown.Toggle variant="dark" id="dropdown-doctor">
                  <span className="me-2">Dr. {currentDoctor.lastName}</span>
                  <Badge bg={currentDoctor.rank === 'intern' ? 'info' : 
                           currentDoctor.rank === 'resident' ? 'primary' : 
                           currentDoctor.rank === 'attending' ? 'success' : 'secondary'}>
                    {currentDoctor.rank}
                  </Badge>
                </Dropdown.Toggle>
                
                <Dropdown.Menu>
                  <Dropdown.Header>Switch Doctor</Dropdown.Header>
                  {allDoctors.map(doctor => (
                    <Dropdown.Item 
                      key={doctor.id} 
                      onClick={() => handleDoctorChange(doctor.id)}
                      active={doctor.id === currentDoctorId}
                    >
                      Dr. {doctor.firstName} {doctor.lastName} ({doctor.rank})
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default NavigationBar;
