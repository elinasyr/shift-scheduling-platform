import axios from 'axios';
import { Doctor, Availability, Shift, Holiday, AvailabilityStatus } from '../types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Create an axios instance with CORS configuration
const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Doctor services
export const getDoctors = async (): Promise<Doctor[]> => {
  const response = await apiClient.get(`/api/doctors`);
  return response.data;
};

export const getDoctor = async (id: number): Promise<Doctor> => {
  const response = await apiClient.get(`/api/doctors/${id}`);
  return response.data;
};

export const createDoctor = async (doctor: Omit<Doctor, 'id'>): Promise<Doctor> => {
  const response = await apiClient.post(`/api/doctors`, doctor);
  return response.data;
};

// Availability services
export const getDoctorAvailability = async (
  doctorId: number,
  startDate?: string,
  endDate?: string
): Promise<Availability> => {
  let params: any = {};
  
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  
  const response = await apiClient.get(`/api/availability/${doctorId}`, { params });
  return response.data;
};

export const setDoctorAvailability = async (
  doctorId: number,
  date: string,
  status: AvailabilityStatus
): Promise<{ success: boolean }> => {
  const response = await apiClient.post(`/api/availability/${doctorId}`, {
    date,
    status
  });
  return response.data;
};

// Shift services
export const getShifts = async (
  startDate?: string,
  endDate?: string,
  doctorId?: number,
  hospitalId?: number
): Promise<Shift[]> => {
  const params: any = {};
  
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  if (doctorId) params.doctorId = doctorId;
  if (hospitalId) params.hospitalId = hospitalId;
  
  const response = await apiClient.get(`/api/shifts`, { params });
  return response.data;
};

export const createShift = async (
  doctorId: number,
  hospitalId: number,
  date: string,
  isOverride: boolean = false
): Promise<Shift> => {
  const response = await apiClient.post(`/api/shifts`, {
    doctorId,
    hospitalId,
    date,
    isOverride
  });
  return response.data;
};

export const deleteShift = async (
  shiftId: number
): Promise<{ success: boolean }> => {
  const response = await apiClient.delete(`/api/shifts/${shiftId}`);
  return response.data;
};

export const clearAllShifts = async (
  year?: number,
  month?: number,
  hospitalId?: number
): Promise<{ success: boolean, deleted_count: number }> => {
  const params: any = {};
  
  if (year) params.year = year;
  if (month) params.month = month;
  if (hospitalId) params.hospitalId = hospitalId;
  
  const response = await apiClient.delete('/api/shifts/clear', { params });
  return response.data;
};

// Holiday services
export const getHolidays = async (
  startDate?: string,
  endDate?: string
): Promise<Holiday[]> => {
  const params: any = {};
  
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  
  const response = await apiClient.get(`/api/holidays`, { params });
  return response.data;
};

// Schedule services
export const generateSchedule = async (
  year?: number,
  month?: number,
  hospitalId?: number
): Promise<any> => {
  const response = await apiClient.post(`/api/schedule/generate`, {
    year,
    month,
    hospitalId
  });
  return response.data;
};

export const validateSchedule = async (
  year?: number,
  month?: number,
  hospitalId?: number
): Promise<{ valid: boolean, violations: any[] }> => {
  const params: any = {};
  
  if (year) params.year = year;
  if (month) params.month = month;
  if (hospitalId) params.hospitalId = hospitalId;
  
  const response = await apiClient.get(`/api/schedule/validate`, { params });
  return response.data;
};
