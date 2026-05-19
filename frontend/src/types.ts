export type Role = 'caregiver' | 'patient';
export type SlotStatus = 'PREVIEW' | 'PENDING' | 'COMMAND_SENT' | 'RELEASED' | 'TAKEN' | 'MISSED' | 'FAILED';
export type AlertType = 'INFO' | 'WARNING' | 'DANGER' | 'info' | 'warning' | 'danger';

export interface Caregiver {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Patient {
  id: string;
  caregiverId: string;
  name: string;
  relationship: string;
  createdAt: string;
  updatedAt?: string;
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
  instructions?: string | null;
  firstDoseTime: string;
  frequencyHours: number;
  isCritical: boolean;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Device {
  id: string;
  patientId: string;
  deviceCode: string;
  name: string;
  status: 'ONLINE' | 'OFFLINE';
  currentCompartment: number;
  compartmentsCount: number;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface RefillSlotItem {
  medicationId: string;
  name: string;
  dosage: string;
  isCritical?: boolean;
}

export interface RefillSlot {
  id: string;
  compartment: number;
  scheduledAt: string;
  scheduledTime: string;
  status: SlotStatus | string;
  items: RefillSlotItem[];
  itemsText: string;
  critical: boolean;
}

export interface RefillPlan {
  fits: boolean;
  maxCompartments: number;
  requiredCompartments: number;
  overflowCount: number;
  cycleStart: string;
  cycleEnd: string;
  wakeTime: string;
  slots: RefillSlot[];
  warning: string | null;
}

export interface ActiveCycle {
  id: string;
  status: string;
  cycleStart: string;
  cycleEnd: string;
  confirmedAt: string | null;
}

export interface DashboardData {
  patient: Patient;
  device: Device | null;
  activeCycle: ActiveCycle | null;
  nextSlot: RefillSlot | null;
  refillPlan: RefillPlan;
  medicationsCount: number;
  alertsCount: number;
}

export interface HistoryEvent {
  id: string;
  patientId: string;
  refillCycleId: string;
  compartment: number;
  scheduledAt: string;
  scheduledTime: string;
  releasedAt: string | null;
  confirmedAt: string | null;
  status: SlotStatus | string;
  statusLabel: string;
  items: RefillSlotItem[];
  itemsText: string;
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
