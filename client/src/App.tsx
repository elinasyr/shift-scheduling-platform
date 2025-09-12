import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import Dashboard from './components/Dashboard';
import Calendar from './components/Calendar';
import Profile from './components/Profile';
import DoctorsList from './components/manager/DoctorsList';
import ManagerDashboard from './components/manager/ManagerDashboard';
import Schedule from './components/Schedule';
import LoadingSpinner from './components/common/LoadingSpinner';

const App: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  // If not authenticated, show login/signup routes
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Calendar />} />
        <Route path="/profile" element={<Profile />} />
        
        {/* Routes for doctors and managers */}
        {(user.role === 'doctor' || user.role === 'manager') && (
          <>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/schedule" element={<Schedule />} />
          </>
        )}
        
        {/* Manager-only routes */}
        {user.role === 'manager' && (
          <>
            <Route path="/doctors" element={<DoctorsList />} />
            <Route path="/manager" element={<ManagerDashboard />} />
          </>
        )}
        
        {/* Viewer-only sees schedule when available */}
        {user.role === 'viewer' && (
          <Route path="/schedule" element={<Schedule />} />
        )}
        
        {/* Redirect to appropriate page based on role */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

export default App;
