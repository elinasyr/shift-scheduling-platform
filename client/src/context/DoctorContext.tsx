import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { getDoctor } from '../services/api';
import { Doctor } from '../types';

interface DoctorContextType {
  currentDoctorId: number;
  setCurrentDoctorId: React.Dispatch<React.SetStateAction<number>>;
  currentDoctor: Doctor | null;
  loading: boolean;
}

const DoctorContext = createContext<DoctorContextType | undefined>(undefined);

export const DoctorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Get the current doctor ID from localStorage or default to 1
  const [currentDoctorId, setCurrentDoctorId] = useState<number>(() => {
    const savedId = localStorage.getItem('currentDoctorId');
    return savedId ? parseInt(savedId, 10) : 1;
  });
  
  const [currentDoctor, setCurrentDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Fetch current doctor details whenever currentDoctorId changes
  useEffect(() => {
    const fetchCurrentDoctor = async () => {
      setLoading(true);
      try {
        const doctor = await getDoctor(currentDoctorId);
        setCurrentDoctor(doctor);
        // Save to localStorage for persistence
        localStorage.setItem('currentDoctorId', currentDoctorId.toString());
      } catch (error) {
        console.error('Error fetching current doctor:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCurrentDoctor();
  }, [currentDoctorId]);
  
  return (
    <DoctorContext.Provider value={{ currentDoctorId, setCurrentDoctorId, currentDoctor, loading }}>
      {children}
    </DoctorContext.Provider>
  );
};

export const useDoctor = () => {
  const context = useContext(DoctorContext);
  if (context === undefined) {
    throw new Error('useDoctor must be used within a DoctorProvider');
  }
  return context;
};
