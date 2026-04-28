export type Role = 'caregiver' | 'patient';
export type DoseStatus = 'pending' | 'taken' | 'missed';
export type AlertType = 'info' | 'warning' | 'danger';

export interface Caregiver {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
}

export interface Patient {
  id: string;
  caregiverId: string;
  name: string;
  relationship: string;
  createdAt: string;
}

export interface Session {
  token: string;
  role: Role;
  user: Caregiver | Patient;
  caregiver?: Caregiver;
}

export interface Medication {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  firstDoseTime: string;
  frequencyHours: number;
  compartment: number;
  isCritical: boolean;
  createdAt: string;
}

export interface NextMedication {
  medicationId: string;
  patientId: string;
  name: string;
  dosage: string;
  compartment: number;
  isCritical: boolean;
  scheduledFor: string;
  time: string;
  timestamp: number;
}

export interface RefillSlot {
  id: number;
  time: string;
  meds: string;
  desc: string;
  compartment: number;
  critical: boolean;
}

export interface DashboardData {
  patient: Patient;
  nextMedication: NextMedication | null;
  refillPlan: RefillSlot[];
  medicationsCount: number;
  alertsCount: number;
}

export interface HistoryEvent {
  id: string;
  patientId: string;
  medicationId: string | null;
  name: string;
  dosage: string;
  compartment: number;
  scheduledFor: string;
  dispensedAt: string | null;
  status: DoseStatus;
  createdAt: string;
}

export interface AlertItem {
  id: string;
  patientId: string;
  type: AlertType;
  title: string;
  desc: string;
  createdAt: string;
  resolved: boolean;
}

export interface PatientPreference {
  patientId: string;
  sleepTime: string;
  wakeTime: string;
  alarmVolume: number;
}
