import axios from 'axios';
import { User, SignupData, Doctor, DayAvailability, Schedule, HospitalDay, GenerateScheduleRequest, ScheduleGenerationResult, ApprovalData } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const setAuthToken = (token: string | null) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

// Authentication APIs
export const login = async (email: string, password: string) => {
  const response = await apiClient.post('/auth/login', { email, password });
  return response.data;
};

export const signup = async (userData: SignupData) => {
  const response = await apiClient.post('/auth/signup', userData);
  return response.data;
};

export const getCurrentUser = async (): Promise<User> => {
  const response = await apiClient.get('/auth/me');
  return response.data;
};

// Doctor APIs - Updated to match existing backend
export const getAllDoctors = async (): Promise<Doctor[]> => {
  const response = await apiClient.get('/doctors');
  // Map backend data to frontend types
  return response.data.map((doctor: any) => ({
    id: doctor.id.toString(),
    firstName: doctor.firstName,
    lastName: doctor.lastName,
    email: doctor.email,
    username: doctor.username,
    role: doctor.role, // Now mapped correctly in backend
    specialty: doctor.specialty,
    rank: doctor.rank,
    rotationType: doctor.rotationType,
    category: doctor.category,
    isNew: doctor.isNew,
    profilePhoto: doctor.profilePhoto || '',
    availability: [], // Empty for now, will be loaded separately
    createdAt: doctor.createdAt,
    updatedAt: doctor.updatedAt
  }));
};

export const getDoctorById = async (id: string): Promise<Doctor> => {
  const response = await apiClient.get(`/doctors/${id}`);
  const doctor = response.data;
  return {
    id: doctor.id.toString(),
    firstName: doctor.firstName,
    lastName: doctor.lastName,
    email: doctor.email,
    username: doctor.username,
    role: doctor.role,
    specialty: doctor.specialty,
    rank: doctor.rank,
    rotationType: doctor.rotationType,
    category: doctor.category,
    isNew: doctor.isNew,
    profilePhoto: doctor.profilePhoto || '',
    availability: [],
    createdAt: doctor.createdAt,
    updatedAt: doctor.updatedAt
  };
};

export const updateDoctor = async (id: string, doctorData: Partial<Doctor>): Promise<Doctor> => {
  const response = await apiClient.put(`/doctors/${id}`, doctorData);
  const doctor = response.data;
  return {
    id: doctor.id.toString(),
    firstName: doctor.firstName,
    lastName: doctor.lastName,
    email: doctor.email,
    username: doctor.username,
    role: doctor.role,
    specialty: doctor.specialty,
    rank: doctor.rank,
    rotationType: doctor.rotationType,
    category: doctor.category,
    isNew: doctor.isNew,
    profilePhoto: doctor.profilePhoto || '',
    availability: [],
    createdAt: doctor.createdAt,
    updatedAt: doctor.updatedAt
  };
};

export const deleteDoctor = async (id: string): Promise<void> => {
  await apiClient.delete(`/doctors/${id}`);
};

// Availability APIs - Updated to match existing backend
export const getDoctorAvailability = async (doctorId: string, startDate: string, endDate: string): Promise<DayAvailability[]> => {
  try {
    const response = await apiClient.get(`/availability/${doctorId}`, {
      params: { startDate, endDate }
    });
    
    console.log('Backend availability response:', response.data);
    
    // Convert backend format to frontend format
    const availability: DayAvailability[] = [];
    const backendData = response.data.availability || {};
    
    console.log('Doctor availability data - backendData:', backendData);
    console.log('backendData keys:', Object.keys(backendData));
    
    // Generate all days in the range - ensure proper date parsing
    // Parse dates manually to avoid timezone issues
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
    
    const start = new Date(startYear, startMonth - 1, startDay); // month is 0-based
    const end = new Date(endYear, endMonth - 1, endDay); // month is 0-based
    
    // console.log('Date range:', { startDate, endDate, start, end });

    // Use a proper while loop to avoid date increment issues
    const currentDate = new Date(start);
    while (currentDate <= end) {
      // console.log('Processing date:', currentDate, 'vs end:', end);
      // Format date as YYYY-MM-DD without timezone issues
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
      const status = (backendData[dateStr] || 'available').toLowerCase();
      
      console.log(`Date ${dateStr}: status=${status}`);
      
      availability.push({
        id: `${doctorId}-${dateStr}`,
        doctorId: doctorId,
        date: dateStr,
        isAvailable: status === 'available',
        isHoliday: status === 'holiday',
        isUnavailable: status === 'unavailable'
      });
      
      // Increment the date for next iteration
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    const unavailableCount = availability.filter(a => a.isUnavailable).length;
    const availableCount = availability.filter(a => a.isAvailable).length;
    const holidayCount = availability.filter(a => a.isHoliday).length;
    console.log(`Doctor ${doctorId} availability summary: ${availableCount} available, ${unavailableCount} unavailable, ${holidayCount} holidays out of ${availability.length} total days`);
    
    return availability;
  } catch (error) {
    console.error('Failed to load doctor availability:', error);
    return [];
  }
};

export const updateDoctorAvailability = async (doctorId: string, availability: DayAvailability[]): Promise<DayAvailability[]> => {
  try {
    // Update each day individually
    for (const day of availability) {
      let status = 'available';
      if (day.isUnavailable) status = 'unavailable';
      else if (day.isHoliday) status = 'holiday';
      else if (!day.isAvailable) status = 'unavailable';
      
      await apiClient.post(`/availability/${doctorId}`, {
        date: day.date,
        status: status
      });
    }
    return availability;
  } catch (error) {
    console.error('Failed to update availability:', error);
    throw error;
  }
};

export const getAllAvailability = async (startDate: string, endDate: string): Promise<{ [doctorId: string]: DayAvailability[] }> => {
  try {
    // Get all doctors first
    const doctors = await getAllDoctors();
    const allAvailability: { [doctorId: string]: DayAvailability[] } = {};
    
    // Get availability for each doctor
    console.log('Fetching availability for all doctors from', startDate, 'to', endDate);
    for (const doctor of doctors) {
      allAvailability[doctor.id] = await getDoctorAvailability(doctor.id, startDate, endDate);
    }
    
    return allAvailability;
  } catch (error) {
    console.error('Failed to load all availability:', error);
    return {};
  }
};

// Schedule APIs - Updated to work with existing shifts endpoint
export const generateSchedule = async (request: GenerateScheduleRequest): Promise<ScheduleGenerationResult> => {
  try {
    const response = await apiClient.post('/schedule/generate', {
      startDate: request.startDate,
      endDate: request.endDate,
      doctorIds: request.doctorIds
    });
    
    return {
      success: response.data.success || true,
      schedule: [], // Will be populated by getSchedule call
      conflicts: response.data.conflicts || [],
      warnings: response.data.warnings || []
    };
  } catch (error) {
    console.error('Failed to generate schedule:', error);
    return {
      success: false,
      schedule: [],
      conflicts: ['Failed to generate schedule'],
      warnings: []
    };
  }
};

export const getSchedule = async (startDate: string, endDate: string): Promise<Schedule[]> => {
  try {
    const response = await apiClient.get('/shifts', {
      params: { startDate, endDate }
    });
    
    // Group shifts by date
    const shiftsByDate: { [date: string]: any[] } = {};
    response.data.forEach((shift: any) => {
      const date = shift.date;
      if (!shiftsByDate[date]) {
        shiftsByDate[date] = [];
      }
      shiftsByDate[date].push(shift);
    });
    
    // Convert to Schedule format
    return Object.entries(shiftsByDate).map(([date, shifts]) => ({
      id: `schedule-${date}`,
      date: date,
      doctorIds: shifts.map(shift => shift.doctor_id.toString()),
      isFinalized: !shifts.some(shift => shift.is_override), // If any shift is override, it's not finalized
      createdBy: '1', // Default creator
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
  } catch (error) {
    console.error('Failed to load schedule:', error);
    return [];
  }
};

export const updateSchedule = async (date: string, doctorIds: string[]): Promise<Schedule> => {
  try {
    const response = await apiClient.put('/schedule/edit', {
      date,
      doctorIds: doctorIds.map(id => parseInt(id))
    });
    
    return {
      id: `schedule-${date}`,
      date: date,
      doctorIds: doctorIds,
      isFinalized: false,
      createdBy: '1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Failed to update schedule:', error);
    throw error;
  }
};

export const finalizeSchedule = async (startDate: string, endDate: string): Promise<void> => {
  try {
    await apiClient.post('/schedule/save', {
      startDate,
      endDate
    });
  } catch (error) {
    console.error('Failed to finalize schedule:', error);
    throw error;
  }
};

export const downloadSchedule = async (startDate: string, endDate: string): Promise<Blob> => {
  try {
    const response = await apiClient.get('/schedule/download', {
      params: { startDate, endDate },
      responseType: 'blob',
      headers: {
        'Accept': 'application/pdf, application/octet-stream, text/plain'
      }
    });
    
    // If the response is very small, it might be an error message
    if (response.data.size < 100) {
      throw new Error('Invalid PDF response');
    }
    
    return response.data;
  } catch (error) {
    console.error('Schedule download not available, creating fallback:', error);
    
    // Create a more detailed text file as fallback
    try {
      const scheduleData = await getSchedule(startDate, endDate);
      const doctors = await getAllDoctors();
      const doctorMap = doctors.reduce((map, doctor) => {
        map[doctor.id] = `${doctor.firstName} ${doctor.lastName} (${doctor.specialty})`;
        return map;
      }, {} as { [id: string]: string });
      
      let textContent = `SCHEDULE REPORT\n`;
      textContent += `Period: ${startDate} to ${endDate}\n`;
      textContent += `Generated: ${new Date().toLocaleDateString()}\n\n`;
      
      if (scheduleData.length === 0) {
        textContent += 'No schedule data available for this period.\n';
      } else {
        scheduleData.forEach(s => {
          textContent += `${new Date(s.date).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}:\n`;
          
          if (s.doctorIds.length === 0) {
            textContent += '  No assignments\n';
          } else {
            s.doctorIds.forEach(doctorId => {
              const doctorName = doctorMap[doctorId] || `Doctor ID: ${doctorId}`;
              textContent += `  - ${doctorName}\n`;
            });
          }
          textContent += '\n';
        });
      }
      
      return new Blob([textContent], { type: 'text/plain' });
    } catch (fallbackError) {
      console.error('Failed to create fallback:', fallbackError);
      const errorContent = `Failed to generate schedule report.\nPeriod: ${startDate} to ${endDate}\nPlease contact support.`;
      return new Blob([errorContent], { type: 'text/plain' });
    }
  }
};

// Hospital Days APIs
export const getHospitalDays = async (startDate: string, endDate: string): Promise<HospitalDay[]> => {
  try {
    const response = await apiClient.get('/hospital-days', {
      params: { startDate, endDate }
    });
    
    return response.data.map((day: any) => ({
      id: day.id.toString(),
      date: day.date,
      isOnCall: day.isOnCall,
      isPublicHoliday: day.isPublicHoliday,
      description: day.description
    }));
  } catch (error) {
    console.error('Failed to load hospital days:', error);
    return [];
  }
};

export const updateHospitalDay = async (date: string, data: Partial<HospitalDay>): Promise<HospitalDay> => {
  try {
    const response = await apiClient.post('/hospital-days', {
      date,
      isOnCall: data.isOnCall,
      isPublicHoliday: data.isPublicHoliday,
      description: data.description
    });
    return response.data;
  } catch (error) {
    console.error('Failed to update hospital day:', error);
    throw error;
  }
};

// Profile APIs
export const updateProfile = async (userData: Partial<User>): Promise<User> => {
  try {
    const response = await apiClient.put('/profile', userData);
    return response.data;
  } catch (error) {
    console.error('Failed to update profile:', error);
    throw error;
  }
};

export const uploadProfilePhoto = async (file: File): Promise<string> => {
  // TODO: Implement photo upload endpoint on backend
  console.log('Photo upload not yet implemented on backend');
  return '/placeholder-avatar.png';
};

// Doctor Approval APIs
export const getPendingDoctors = async (): Promise<User[]> => {
  try {
    const response = await apiClient.get('/doctors/pending');
    return response.data;
  } catch (error) {
    console.error('Failed to get pending doctors:', error);
    throw error;
  }
};

export const approveDoctor = async (doctorId: string, approvalData: ApprovalData): Promise<User> => {
  try {
    const response = await apiClient.post(`/doctors/${doctorId}/approve`, approvalData);
    return response.data.user;
  } catch (error) {
    console.error('Failed to approve doctor:', error);
    throw error;
  }
};

// Hospital Schedule APIs
export const getHospitalSchedule = async (startDate: string, endDate: string): Promise<HospitalDay[]> => {
  try {
    const response = await apiClient.get('/hospital-schedule', {
      params: { startDate, endDate }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to get hospital schedule:', error);
    throw error;
  }
};

export const updateHospitalSchedule = async (scheduleData: Partial<HospitalDay>): Promise<HospitalDay> => {
  try {
    const response = await apiClient.post('/hospital-schedule', scheduleData);
    return response.data.hospitalDay;
  } catch (error) {
    console.error('Failed to update hospital schedule:', error);
    throw error;
  }
};

export default apiClient;
