import type {
  AlertItem,
  Caregiver,
  DashboardData,
  HistoryEvent,
  Medication,
  Patient,
  PatientPreference,
  RefillPlan,
  Session,
} from './types';

/**
 * Arquivo central de comunicação com o backend.
 *
 * A ideia é simples: nenhum componente da interface precisa saber a URL completa
 * das rotas. As telas chamam funções como api.loginCaregiver() ou
 * api.getDashboard(), e este arquivo monta o fetch corretamente.
 */
const API_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:3001';

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Função genérica para chamar o backend.
 *
 * Ela faz três coisas para todas as telas:
 * 1. adiciona Content-Type: application/json;
 * 2. adiciona Authorization: Bearer <token> quando a rota precisa de login;
 * 3. transforma erro do backend em mensagem legível para o usuário.
 */
async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers || {});

  // Só colocamos JSON automaticamente quando o body não é FormData.
  // Hoje o projeto usa JSON, mas isso deixa pronto para upload futuro.
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new ApiError(payload?.message || 'Erro ao comunicar com o servidor.', response.status);
  }

  return payload as T;
}

export const api = {
  /** Cadastro e login do cuidador. */
  registerCaregiver(data: { name: string; email: string; phone: string; password: string }) {
    return apiRequest<Session>('/api/auth/caregiver/register', { method: 'POST', body: JSON.stringify(data) });
  },

  loginCaregiver(data: { email: string; password: string }) {
    return apiRequest<Session>('/api/auth/caregiver/login', { method: 'POST', body: JSON.stringify(data) });
  },

  /** Login simplificado do paciente: telefone do cuidador + PIN. */
  loginPatient(data: { caregiverPhone: string; pin: string }) {
    return apiRequest<Session>('/api/auth/patient/login', { method: 'POST', body: JSON.stringify(data) });
  },

  /** Valida uma sessão que estava salva no localStorage. */
  getMe(token: string) {
    return apiRequest<{ role: Session['role']; user: Caregiver | Patient }>('/api/me', {}, token);
  },

  /** Pacientes do cuidador logado. */
  getPatients(token: string) {
    return apiRequest<Patient[]>('/api/patients', {}, token);
  },

  createPatient(token: string, data: { name: string; relationship: string; pin: string }) {
    return apiRequest<Patient>('/api/patients', { method: 'POST', body: JSON.stringify(data) }, token);
  },

  /** Dashboard principal: próxima dose, plano, dispositivo, alertas e contadores. */
  getDashboard(token: string, patientId: string) {
    return apiRequest<DashboardData>(`/api/patients/${patientId}/dashboard`, {}, token);
  },

  /** Medicamentos. O cuidador não escolhe compartimento; o backend calcula depois. */
  getMedications(token: string, patientId: string) {
    return apiRequest<Medication[]>(`/api/patients/${patientId}/medications`, {}, token);
  },

  createMedication(token: string, patientId: string, data: {
    name: string;
    dosage: string;
    instructions?: string;
    firstDoseTime: string;
    frequencyHours: number;
    isCritical: boolean;
  }) {
    return apiRequest<Medication>(`/api/patients/${patientId}/medications`, { method: 'POST', body: JSON.stringify(data) }, token);
  },

  deleteMedication(token: string, patientId: string, medicationId: string) {
    return apiRequest<void>(`/api/patients/${patientId}/medications/${medicationId}`, { method: 'DELETE' }, token);
  },

  /** Prévia calculada do abastecimento automático em até 8 compartimentos. */
  getRefillPlan(token: string, patientId: string) {
    return apiRequest<RefillPlan>(`/api/patients/${patientId}/refill-plan`, {}, token);
  },

  /** Confirma que o cuidador abasteceu fisicamente o dispenser. */
  confirmRefillPlan(token: string, patientId: string) {
    return apiRequest<{ id: string; status: string }>(`/api/patients/${patientId}/refill-cycles/confirm`, { method: 'POST' }, token);
  },

  /** Cria um comando manual para o ESP32 liberar um compartimento. */
  dispenseNext(token: string, patientId: string, refillSlotId?: string) {
    return apiRequest<{ success: boolean; message: string }>(`/api/patients/${patientId}/dispense`, {
      method: 'POST',
      body: JSON.stringify({ refillSlotId }),
    }, token);
  },

  /** Histórico real dos slots/ciclos salvos no banco. */
  getHistory(token: string, patientId: string) {
    return apiRequest<HistoryEvent[]>(`/api/patients/${patientId}/history`, {}, token);
  },

  /** Alertas reais e alertas gerados pelas regras do backend. */
  getAlerts(token: string, patientId: string) {
    return apiRequest<AlertItem[]>(`/api/patients/${patientId}/alerts`, {}, token);
  },

  resolveAlert(token: string, alertId: string) {
    return apiRequest<AlertItem>(`/api/alerts/${alertId}/resolve`, { method: 'PATCH' }, token);
  },

  /** Preferências do paciente: início do dia, horário de dormir e volume. */
  getPreferences(token: string, patientId: string) {
    return apiRequest<PatientPreference>(`/api/patients/${patientId}/preferences`, {}, token);
  },

  updatePreferences(token: string, patientId: string, data: PatientPreference) {
    return apiRequest<PatientPreference>(`/api/patients/${patientId}/preferences`, { method: 'PUT', body: JSON.stringify(data) }, token);
  },
};

export { ApiError, API_URL };
