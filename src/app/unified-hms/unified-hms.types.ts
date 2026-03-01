export type UnifiedRole =
  | 'Doctor'
  | 'Nurse'
  | 'Lab Technician'
  | 'Service Worker'
  | 'Pharmacist'
  | 'Patient';

export interface PatientRecord {
  id: string;
  fullName: string;
  dob: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  emergencyContact: string;
  medicalHistory: string;
  allergies: string[];
  chronicConditions: string[];
  consentTreatment: boolean;
  consentRemoteCare: boolean;
  consentDataUse: boolean;
  documents: string[];
}

export interface AppointmentSlot {
  id: string;
  doctorName: string;
  location: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  teleconsult: boolean;
  overbookingAllowed: boolean;
}

export type QueueType = 'Walk-in' | 'Appointment' | 'Emergency';

export interface QueueEntry {
  id: string;
  token: string;
  patientId?: string;
  patientName: string;
  queueType: QueueType;
  status: 'Waiting' | 'In Progress' | 'Done' | 'No-Show';
  emergencyFlag: boolean;
  noShowCount: number;
}
