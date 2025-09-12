import React, { useState } from 'react';
import { Card, Form, Button, Row, Col, Image, Alert } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../services/api';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    specialty: user?.specialty || '',
    rank: user?.rank || ''
  });

  const handleChange = (e: React.ChangeEvent<any>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    try {
      setError('');
      setLoading(true);
      
      await api.updateProfile(formData);
      setMessage('Profile updated successfully!');
      setEditing(false);
      
      // Reload the page to refresh user data
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      specialty: user?.specialty || '',
      rank: user?.rank || ''
    });
    setEditing(false);
    setError('');
    setMessage('');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      await api.uploadProfilePhoto(file);
      setMessage('Profile photo updated successfully!');
      
      // Reload to refresh the photo
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setError('Failed to upload photo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Row className="mb-4">
        <Col>
          <h2>Profile</h2>
          <p className="text-muted">Manage your account information</p>
        </Col>
      </Row>

      {message && <Alert variant="success">{message}</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}

      <Row>
        <Col md={8}>
          <Card className="dashboard-card">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Personal Information</h5>
              {!editing ? (
                <Button variant="outline-primary" onClick={() => setEditing(true)}>
                  Edit Profile
                </Button>
              ) : (
                <div>
                  <Button variant="outline-secondary" onClick={handleCancel} className="me-2">
                    Cancel
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              )}
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleSubmit}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>First Name</Form.Label>
                      <Form.Control
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        disabled={!editing}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Last Name</Form.Label>
                      <Form.Control
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        disabled={!editing}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Email Address</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={!editing}
                    required
                  />
                </Form.Group>

                {(user?.role === 'doctor' || user?.role === 'manager') && (
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Specialty</Form.Label>
                        <Form.Control
                          type="text"
                          name="specialty"
                          value={formData.specialty}
                          onChange={handleChange}
                          disabled={!editing}
                          placeholder="e.g., Cardiology, Surgery"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Rank</Form.Label>
                        <Form.Control
                          type="text"
                          name="rank"
                          value={formData.rank}
                          onChange={handleChange}
                          disabled={!editing}
                          placeholder="e.g., Resident, Attending"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                )}

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Username</Form.Label>
                      <Form.Control
                        type="text"
                        value={user?.username || ''}
                        disabled
                        className="bg-light"
                      />
                      <Form.Text className="text-muted">
                        Username cannot be changed
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Role</Form.Label>
                      <Form.Control
                        type="text"
                        value={user?.role || ''}
                        disabled
                        className="bg-light"
                      />
                      <Form.Text className="text-muted">
                        Role is managed by administrators
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="dashboard-card">
            <Card.Header>
              <h5 className="mb-0">Profile Photo</h5>
            </Card.Header>
            <Card.Body className="text-center">
              {user?.profilePhoto ? (
                <Image 
                  src={user.profilePhoto} 
                  roundedCircle 
                  width={120} 
                  height={120}
                  className="mb-3"
                />
              ) : (
                <div 
                  className="bg-light rounded-circle d-flex align-items-center justify-content-center mb-3 mx-auto"
                  style={{ width: '120px', height: '120px' }}
                >
                  <span className="text-muted fs-3">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </span>
                </div>
              )}
              
              <Form.Group>
                <Form.Label htmlFor="photoUpload" className="btn btn-outline-primary btn-sm">
                  {loading ? 'Uploading...' : 'Change Photo'}
                </Form.Label>
                <Form.Control
                  type="file"
                  id="photoUpload"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  style={{ display: 'none' }}
                  disabled={loading}
                />
              </Form.Group>
              
              <small className="text-muted d-block mt-2">
                Supported formats: JPG, PNG, GIF<br />
                Max size: 5MB
              </small>
            </Card.Body>
          </Card>

          <Card className="dashboard-card mt-3">
            <Card.Header>
              <h5 className="mb-0">Account Information</h5>
            </Card.Header>
            <Card.Body>
              <p className="mb-2">
                <strong>Member since:</strong><br />
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
              </p>
              <p className="mb-2">
                <strong>Last updated:</strong><br />
                {user?.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : 'Unknown'}
              </p>
              <p className="mb-0">
                <strong>User ID:</strong><br />
                <small className="text-muted">{user?.id}</small>
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Profile;
