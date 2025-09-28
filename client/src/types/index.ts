export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  role: UserRole;
  specialty?: string;
  rank?: Rank;
  rotationType?: RotationType;
  category?: Category;
  isNew?: boolean;
  profilePhoto?: string;
  isApproved?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Doctor extends User {
  specialty: string;
  rotationType: RotationType;
  category: Category;
  availability: DayAvailability[];
}

export type UserRole = 'doctor' | 'manager' | 'viewer';

export type RotationType = 'outside' | 'visiting' | 'internal' | 'abroad';

export type Rank = 'junior' | 'senior';

export type Category = 'doctor' | 'manager' | 'viewer';

export type Specialty = 'cardiology' | 'thoracic' | 'general';

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
  hasCardioSurgery?: boolean;
  hasThoracicSurgery?: boolean;
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
  password: string;
  confirmPassword: string;
}

export interface CalendarDay {
  date: string;
  isOnCall: boolean;
  isPublicHoliday: boolean;
  hasCardioSurgery?: boolean;
  hasThoracicSurgery?: boolean;
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

export interface ApprovalData {
  role: UserRole;
  specialty: Specialty;
  rank: Rank;
  rotationType: RotationType;
  isNew?: boolean;
}
