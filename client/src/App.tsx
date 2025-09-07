import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import NavigationBar from './components/NavigationBar';
import DoctorCalendar from './components/DoctorCalendar';
import DoctorsList from './components/DoctorsList';
import ManagerDashboard from './components/ManagerDashboard';
import { DoctorProvider } from './context/DoctorContext';

function App() {
  return (
    <DoctorProvider>
      <Router>
        <div className="App">
          <NavigationBar />
          <div className="content-container">
            <Routes>
              <Route path="/" element={<DoctorCalendar />} />
              <Route path="/doctors" element={<DoctorsList />} />
              <Route path="/manager" element={<ManagerDashboard />} />
            </Routes>
          </div>
        </div>
      </Router>
    </DoctorProvider>
  );
}

export default App;
