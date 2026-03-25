import { Category, Rank, RotationType, Specialty, UserRole } from '../types';

export const MONTH_NAMES = [
  'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος',
  'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'
];

export const WEEKDAY_NAMES = ['Κυρ', 'Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ'];
export const WEEKDAY_NAMES_MONDAY_FIRST = ['Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ', 'Κυρ'];

export const SPECIALTY_OPTIONS: Array<{ value: Specialty; label: string; shortLabel: string }> = [
  { value: 'cardiology', label: 'Καρδιοχειρουργική', shortLabel: 'ΚΧ' },
  { value: 'thoracic', label: 'Θωρακοχειρουργική', shortLabel: 'ΘΧ' },
  { value: 'general', label: 'Γενική', shortLabel: 'ΓΕΝ' }
];

export const ROTATION_OPTIONS: Array<{ value: RotationType; label: string }> = [
  { value: 'internal', label: 'Κανονικός' },
  { value: 'visiting', label: 'Επισκέπτης από άλλο νοσοκομείο' },
  { value: 'abroad', label: 'Πρακτική στο εξωτερικό' },
  { value: 'outside', label: 'Εκτός Αττικόν' }
];

export const RANK_OPTIONS: Array<{ value: Rank; label: string }> = [
  { value: 'junior', label: 'Μικρός/ή' },
  { value: 'senior', label: 'Μεγάλος/η' }
];

export const CATEGORY_OPTIONS: Array<{ value: Category; label: string }> = [
  { value: 'doctor', label: 'Ειδικευόμενος' },
  { value: 'manager', label: 'Διαχειριστής' },
  { value: 'viewer', label: 'Θεατής' }
];

export const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: 'doctor', label: 'Ειδικευόμενος' },
  { value: 'manager', label: 'Διαχειριστής' },
  { value: 'viewer', label: 'Θεατής' }
];

export const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDisplayDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString('el-GR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

export const formatDisplayDateShort = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString('el-GR', {
    day: 'numeric',
    month: 'short'
  });

export const formatWeekdayLong = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString('el-GR', { weekday: 'long' });

export const getSpecialtyLabel = (value?: string | null) =>
  SPECIALTY_OPTIONS.find((option) => option.value === value)?.label || 'Δεν έχει οριστεί';

export const getSpecialtyShortLabel = (value?: string | null) =>
  SPECIALTY_OPTIONS.find((option) => option.value === value)?.shortLabel || 'ΓΕΝ';

export const getRotationLabel = (value?: string | null) =>
  ROTATION_OPTIONS.find((option) => option.value === value)?.label || 'Δεν έχει οριστεί';

export const getRankLabel = (value?: string | null) =>
  RANK_OPTIONS.find((option) => option.value === value)?.label || 'Δεν έχει οριστεί';

export const getRoleLabel = (value?: string | null) =>
  ROLE_OPTIONS.find((option) => option.value === value)?.label || 'Θεατής';

export const getCategoryLabel = (value?: string | null) =>
  CATEGORY_OPTIONS.find((option) => option.value === value)?.label || 'Δεν έχει οριστεί';
