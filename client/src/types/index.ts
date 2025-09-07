export enum DoctorRank {
  INTERN = 'intern',
  RESIDENT = 'resident',
  ATTENDING = 'attending',
  CONSULTANT = 'consultant'
}

export enum DoctorCategory {
  JUNIOR = 'junior',
  SENIOR = 'senior'
}

export enum AvailabilityStatus {
  AVAILABLE = 'available',
  UNAVAILABLE = 'unavailable',
  PREFERRED = 'preferred'
}

export enum HolidayType {
  REGULAR = 'regular',
  NATIONAL = 'national',
  RELIGIOUS = 'religious',
  SPECIAL = 'special'
}

export interface Doctor {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  rank: DoctorRank;
  category: DoctorCategory;
  maturityLevel: number;
}

export interface Hospital {
  id: number;
  name: string;
  location?: string;
}

export interface Shift {
  id: number;
  date: string;
  doctor: {
    id: number;
    name: string;
    rank: DoctorRank;
  };
  hospital: {
    id: number;
    name: string;
  };
  isOverride: boolean;
}

export interface Availability {
  doctorId: number;
  startDate: string;
  endDate: string;
  availability: {
    [date: string]: AvailabilityStatus;
  };
}

export interface Holiday {
  id: number;
  date: string;
  name: string;
  type: HolidayType;
  description?: string;
}

export interface RuleViolation {
  rule: string;
  description: string;
  severity: string;
}
