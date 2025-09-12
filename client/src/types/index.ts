export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  role: UserRole;
  specialty?: string;
  rank?: string;
  profilePhoto?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Doctor extends User {
  specialty: string;
  rank: string;
  availability: DayAvailability[];
}

export type UserRole = 'doctor' | 'manager' | 'viewer';

export interface DayAvailability {
  id: string;
  doctorId: string;
  date: string;
  isAvailable: boolean;
  isHoliday: boolean;
  isUnavailable: boolean;
  notes?: string;
}

export interface Schedule {
  id: string;
  date: string;
  doctorIds: string[];
  isFinalized: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface HospitalDay {
  id: string;
  date: string;
  isOnCall: boolean;
  isPublicHoliday: boolean;
  description?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  signup: (userData: SignupData) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  specialty?: string;
  rank?: string;
}

export interface CalendarDay {
  date: string;
  isOnCall: boolean;
  isPublicHoliday: boolean;
  availability: {
    [doctorId: string]: {
      isAvailable: boolean;
      isUnavailable: boolean;
      isHoliday: boolean;
    };
  };
  assignedDoctors?: string[];
}

export interface GenerateScheduleRequest {
  startDate: string;
  endDate: string;
  doctorIds: string[];
  preferences: DayAvailability[];
}

export interface ScheduleGenerationResult {
  success: boolean;
  schedule: Schedule[];
  conflicts?: string[];
  warnings?: string[];
}
