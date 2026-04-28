import type { AlertItem, Caregiver, DashboardData, HistoryEvent, Medication, Patient, PatientPreference, Session } from './types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new ApiError(payload?.message || 'Erro ao comunicar com o servidor.', response.status);
  }

  return payload as T;
}

export const api = {
  registerCaregiver(data: { name: string; email: string; phone: string; password: string }) {
    return apiRequest<Session>('/api/auth/caregiver/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  loginCaregiver(data: { email: string; password: string }) {
    return apiRequest<Session>('/api/auth/caregiver/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  loginPatient(data: { caregiverPhone: string; pin: string }) {
    return apiRequest<Session>('/api/auth/patient/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getPatients(token: string) {
    return apiRequest<Patient[]>('/api/patients', {}, token);
  },

  createPatient(token: string, data: { name: string; relationship: string; pin: string }) {
    return apiRequest<Patient>('/api/patients', {
      method: 'POST',
      body: JSON.stringify(data),
    }, token);
  },

  getDashboard(token: string, patientId: string) {
    return apiRequest<DashboardData>(`/api/patients/${patientId}/dashboard`, {}, token);
  },

  getMedications(token: string, patientId: string) {
    return apiRequest<Medication[]>(`/api/patients/${patientId}/medications`, {}, token);
  },

  createMedication(token: string, patientId: string, data: {
    name: string;
    dosage: string;
    firstDoseTime: string;
    frequencyHours: number;
    compartment: number;
    isCritical: boolean;
  }) {
    return apiRequest<Medication>(`/api/patients/${patientId}/medications`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, token);
  },

  getHistory(token: string, patientId: string) {
    return apiRequest<HistoryEvent[]>(`/api/patients/${patientId}/history`, {}, token);
  },

  getAlerts(token: string, patientId: string) {
    return apiRequest<AlertItem[]>(`/api/patients/${patientId}/alerts`, {}, token);
  },

  getPreferences(token: string, patientId: string) {
    return apiRequest<PatientPreference>(`/api/patients/${patientId}/preferences`, {}, token);
  },

  updatePreferences(token: string, patientId: string, data: PatientPreference) {
    return apiRequest<PatientPreference>(`/api/patients/${patientId}/preferences`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, token);
  },

  dispense(token: string, data: { patientId: string; compartment: number }) {
    return apiRequest<{ success: boolean; command: string; angulo: number }>(`/api/dispense`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, token);
  },
};

export { ApiError, API_URL };
