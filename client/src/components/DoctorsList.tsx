import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Form, InputGroup, Button, Row, Col } from 'react-bootstrap';
import { getDoctors } from '../services/api';
import { Doctor, DoctorRank, DoctorCategory } from '../types';

const DoctorsList: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [rankFilter, setRankFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<keyof Doctor>('lastName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  useEffect(() => {
    const fetchDoctors = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await getDoctors();
        setDoctors(data);
      } catch (err) {
        console.error('Error fetching doctors:', err);
        setError('Failed to load doctors. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDoctors();
  }, []);
  
  const getBadgeVariant = (rank: DoctorRank) => {
    switch (rank) {
      case DoctorRank.INTERN:
        return 'info';
      case DoctorRank.RESIDENT:
        return 'primary';
      case DoctorRank.ATTENDING:
        return 'success';
      case DoctorRank.CONSULTANT:
        return 'warning';
      default:
        return 'secondary';
    }
  };
  
  const getCategoryBadgeVariant = (category: DoctorCategory) => {
    switch (category) {
      case DoctorCategory.JUNIOR:
        return 'secondary';
      case DoctorCategory.SENIOR:
        return 'dark';
      default:
        return 'light';
    }
  };
  
  const handleSort = (field: keyof Doctor) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };
  
  const getSortIcon = (field: keyof Doctor) => {
    if (sortBy !== field) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };
  
  const filteredDoctors = doctors.filter(doctor => {
    const matchesSearch = 
      `${doctor.firstName} ${doctor.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.email.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesRank = rankFilter === 'all' || doctor.rank === rankFilter;
    const matchesCategory = categoryFilter === 'all' || doctor.category === categoryFilter;
    
    return matchesSearch && matchesRank && matchesCategory;
  });
  
  const sortedDoctors = [...filteredDoctors].sort((a, b) => {
    let valueA = a[sortBy];
    let valueB = b[sortBy];
    
    if (typeof valueA === 'string' && typeof valueB === 'string') {
      if (sortDirection === 'asc') {
        return valueA.localeCompare(valueB);
      } else {
        return valueB.localeCompare(valueA);
      }
    }
    
    if (sortDirection === 'asc') {
      return valueA > valueB ? 1 : -1;
    } else {
      return valueA < valueB ? 1 : -1;
    }
  });
  
  return (
    <Card>
      <Card.Header>
        <h4>Doctors Management</h4>
      </Card.Header>
      <Card.Body>
        <Row className="mb-3">
          <Col md={4}>
            <Form.Group>
              <InputGroup>
                <InputGroup.Text>Search</InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search by name or email"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Select
                value={rankFilter}
                onChange={(e) => setRankFilter(e.target.value)}
              >
                <option value="all">All Ranks</option>
                <option value={DoctorRank.INTERN}>Intern</option>
                <option value={DoctorRank.RESIDENT}>Resident</option>
                <option value={DoctorRank.ATTENDING}>Attending</option>
                <option value={DoctorRank.CONSULTANT}>Consultant</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value={DoctorCategory.JUNIOR}>Junior</option>
                <option value={DoctorCategory.SENIOR}>Senior</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={2}>
            <Button variant="primary" className="w-100">
              Add Doctor
            </Button>
          </Col>
        </Row>
        
        {loading ? (
          <p>Loading doctors...</p>
        ) : error ? (
          <p className="text-danger">{error}</p>
        ) : (
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th onClick={() => handleSort('id')}>ID {getSortIcon('id')}</th>
                <th onClick={() => handleSort('firstName')}>First Name {getSortIcon('firstName')}</th>
                <th onClick={() => handleSort('lastName')}>Last Name {getSortIcon('lastName')}</th>
                <th onClick={() => handleSort('email')}>Email {getSortIcon('email')}</th>
                <th onClick={() => handleSort('rank')}>Rank {getSortIcon('rank')}</th>
                <th onClick={() => handleSort('category')}>Category {getSortIcon('category')}</th>
                <th onClick={() => handleSort('maturityLevel')}>Maturity Level {getSortIcon('maturityLevel')}</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedDoctors.length > 0 ? (
                sortedDoctors.map((doctor) => (
                  <tr key={doctor.id}>
                    <td>{doctor.id}</td>
                    <td>{doctor.firstName}</td>
                    <td>{doctor.lastName}</td>
                    <td>{doctor.email}</td>
                    <td>
                      <Badge bg={getBadgeVariant(doctor.rank)}>
                        {doctor.rank}
                      </Badge>
                    </td>
                    <td>
                      <Badge bg={getCategoryBadgeVariant(doctor.category)}>
                        {doctor.category}
                      </Badge>
                    </td>
                    <td>{doctor.maturityLevel}</td>
                    <td>
                      <Button variant="outline-primary" size="sm" className="me-1">
                        View
                      </Button>
                      <Button variant="outline-secondary" size="sm">
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center">
                    No doctors found matching the filters.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
};

export default DoctorsList;
