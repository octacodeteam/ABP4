// src/server.ts
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3001);
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
const DB_FILE = path.join(DATA_DIR, 'db.json');
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'troque-este-segredo-em-producao';

app.use(cors());
app.use(express.json({ limit: '1mb' }));

type Role = 'caregiver' | 'patient';
type DoseStatus = 'pending' | 'taken' | 'missed';
type AlertType = 'info' | 'warning' | 'danger';

interface Caregiver {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  createdAt: string;
}

interface Patient {
  id: string;
  caregiverId: string;
  name: string;
  relationship: string;
  pinHash: string;
  createdAt: string;
}

interface Medication {
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

interface PatientPreference {
  patientId: string;
  sleepTime: string;
  wakeTime: string;
  alarmVolume: number;
}

interface DispenseEvent {
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

interface AlertItem {
  id: string;
  patientId: string;
  type: AlertType;
  title: string;
  desc: string;
  createdAt: string;
  resolved: boolean;
}

interface Database {
  caregivers: Caregiver[];
  patients: Patient[];
  medications: Medication[];
  preferences: PatientPreference[];
  events: DispenseEvent[];
  alerts: AlertItem[];
}

interface AuthPayload {
  role: Role;
  caregiverId?: string;
  patientId?: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

function createEmptyDb(): Database {
  return {
    caregivers: [],
    patients: [],
    medications: [],
    preferences: [],
    events: [],
    alerts: [],
  };
}

function ensureDbFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const demoCaregiverId = crypto.randomUUID();
    const demoPatientId = crypto.randomUUID();
    const demoMedicationA = crypto.randomUUID();
    const demoMedicationB = crypto.randomUUID();
    const demoMedicationC = crypto.randomUUID();
    const demoDb: Database = {
      caregivers: [
        {
          id: demoCaregiverId,
          name: 'Cuidador Demo',
          email: 'cuidador@demo.com',
          phone: '11999999999',
          passwordHash: hashSecret('123456'),
          createdAt: new Date().toISOString(),
        },
      ],
      patients: [
        {
          id: demoPatientId,
          caregiverId: demoCaregiverId,
          name: 'Sr. Breno',
          relationship: 'Pai',
          pinHash: hashSecret('1234'),
          createdAt: new Date().toISOString(),
        },
      ],
      medications: [
        {
          id: demoMedicationA,
          patientId: demoPatientId,
          name: 'Losartana',
          dosage: '50mg - 1 comprimido',
          firstDoseTime: '08:00',
          frequencyHours: 12,
          compartment: 1,
          isCritical: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: demoMedicationB,
          patientId: demoPatientId,
          name: 'Vitamina D',
          dosage: '1 cápsula',
          firstDoseTime: '10:00',
          frequencyHours: 24,
          compartment: 2,
          isCritical: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: demoMedicationC,
          patientId: demoPatientId,
          name: 'Aspirina',
          dosage: '100mg - 1 comprimido',
          firstDoseTime: '18:30',
          frequencyHours: 24,
          compartment: 3,
          isCritical: true,
          createdAt: new Date().toISOString(),
        },
      ],
      preferences: [
        {
          patientId: demoPatientId,
          sleepTime: '23:00',
          wakeTime: '06:00',
          alarmVolume: 80,
        },
      ],
      events: [],
      alerts: [
        {
          id: crypto.randomUUID(),
          patientId: demoPatientId,
          type: 'warning',
          title: 'Capacidade Crítica',
          desc: 'A caixa organizadora precisa ser conferida para garantir doses suficientes para o próximo ciclo.',
          createdAt: new Date().toISOString(),
          resolved: false,
        },
      ],
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(demoDb, null, 2), 'utf-8');
  }
}

function readDb(): Database {
  ensureDbFile();
  const raw = fs.readFileSync(DB_FILE, 'utf-8');
  return { ...createEmptyDb(), ...JSON.parse(raw) };
}

function writeDb(db: Database) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

function normalizeEmail(email: string) {
  return String(email || '').trim().toLowerCase();
}

function normalizePhone(phone: string) {
  return String(phone || '').replace(/\D/g, '');
}

function hashSecret(secret: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(secret, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifySecret(secret: string, storedHash: string) {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const candidate = crypto.pbkdf2Sync(secret, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidate, 'hex'));
}

function base64url(input: string) {
  return Buffer.from(input).toString('base64url');
}

function signToken(payload: AuthPayload) {
  const body = base64url(JSON.stringify({ ...payload, iat: Date.now() }));
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(body).digest('base64url');
  return `${body}.${signature}`;
}

function readToken(token: string): AuthPayload | null {
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(body).digest('base64url');
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
  return { role: parsed.role, caregiverId: parsed.caregiverId, patientId: parsed.patientId };
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    res.status(401).json({ message: 'Token ausente.' });
    return;
  }

  try {
    const payload = readToken(token);
    if (!payload) {
      res.status(401).json({ message: 'Token inválido.' });
      return;
    }
    req.auth = payload;
    next();
  } catch {
    res.status(401).json({ message: 'Token inválido.' });
  }
}

function requireCaregiver(req: Request, res: Response, next: NextFunction) {
  if (req.auth?.role !== 'caregiver' || !req.auth.caregiverId) {
    res.status(403).json({ message: 'Acesso permitido apenas para cuidador.' });
    return;
  }
  next();
}

function getRouteParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
}

function assertPatientAccess(req: Request, res: Response, patientId: string): boolean {
  const db = readDb();
  const patient = db.patients.find((item) => item.id === patientId);
  if (!patient) {
    res.status(404).json({ message: 'Paciente não encontrado.' });
    return false;
  }

  if (req.auth?.role === 'caregiver' && req.auth.caregiverId === patient.caregiverId) {
    return true;
  }

  if (req.auth?.role === 'patient' && req.auth.patientId === patient.id) {
    return true;
  }

  res.status(403).json({ message: 'Você não tem acesso a este paciente.' });
  return false;
}

function toPublicCaregiver(caregiver: Caregiver) {
  const { passwordHash, ...safe } = caregiver;
  return safe;
}

function toPublicPatient(patient: Patient) {
  const { pinHash, ...safe } = patient;
  return safe;
}

function parseFrequencyHours(value: unknown) {
  const parsed = Number(value);
  if ([4, 6, 8, 12, 24].includes(parsed)) return parsed;
  return 24;
}

function isHHMM(value: unknown) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function dateAtTime(baseDate: Date, time: string) {
  const [hour, minute] = time.split(':').map(Number);
  const date = new Date(baseDate);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function minutesOfDay(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function generateMedicationSlots(med: Medication, baseDate = new Date()) {
  const start = dateAtTime(baseDate, med.firstDoseTime);
  const slots: Date[] = [];
  const dosesPerDay = Math.max(1, Math.floor(24 / med.frequencyHours));

  for (let i = 0; i < dosesPerDay; i += 1) {
    const slot = new Date(start);
    slot.setHours(slot.getHours() + i * med.frequencyHours);
    slots.push(slot);
  }

  return slots;
}

function buildPatientSchedule(patientId: string) {
  const db = readDb();
  const medications = db.medications.filter((med) => med.patientId === patientId);
  const now = new Date();
  const today = new Date(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const allSlots = medications.flatMap((med) => {
    const todaySlots = generateMedicationSlots(med, today);
    const tomorrowSlots = generateMedicationSlots(med, tomorrow);
    return [...todaySlots, ...tomorrowSlots].map((scheduledFor) => ({
      medicationId: med.id,
      patientId,
      name: med.name,
      dosage: med.dosage,
      compartment: med.compartment,
      isCritical: med.isCritical,
      scheduledFor: scheduledFor.toISOString(),
      time: formatTime(scheduledFor),
      timestamp: scheduledFor.getTime(),
    }));
  });

  return allSlots.sort((a, b) => a.timestamp - b.timestamp);
}

function nextDose(patientId: string) {
  const now = Date.now();
  return buildPatientSchedule(patientId).find((slot) => slot.timestamp >= now) || null;
}

function buildRefillPlan(patientId: string) {
  const db = readDb();
  const meds = db.medications.filter((med) => med.patientId === patientId);
  const grouped = new Map<string, Medication[]>();

  for (const med of meds) {
    const slots = generateMedicationSlots(med, new Date());
    for (const slot of slots) {
      const key = formatTime(slot);
      grouped.set(key, [...(grouped.get(key) || []), med]);
    }
  }

  return [...grouped.entries()]
    .sort(([timeA], [timeB]) => minutesOfDay(timeA) - minutesOfDay(timeB))
    .slice(0, 7)
    .map(([time, slotMeds], index) => ({
      id: index + 1,
      time,
      meds: slotMeds.map((med) => med.name).join(' + '),
      desc: slotMeds.length > 1 ? 'Agrupamento' : 'Dose individual',
      compartment: slotMeds[0]?.compartment || index + 1,
      critical: slotMeds.some((med) => med.isCritical),
    }));
}

function getPreference(patientId: string) {
  const db = readDb();
  const existing = db.preferences.find((item) => item.patientId === patientId);
  return existing || { patientId, sleepTime: '23:00', wakeTime: '06:00', alarmVolume: 80 };
}

function buildHistory(patientId: string) {
  const db = readDb();
  const persisted = db.events.filter((event) => event.patientId === patientId);
  const now = new Date();
  const schedule = buildPatientSchedule(patientId)
    .filter((slot) => slot.timestamp < now.getTime())
    .slice(-8)
    .map((slot, index) => ({
      id: `auto-${slot.medicationId}-${slot.scheduledFor}`,
      patientId,
      medicationId: slot.medicationId,
      name: slot.name,
      dosage: slot.dosage,
      compartment: slot.compartment,
      scheduledFor: slot.scheduledFor,
      dispensedAt: index % 5 === 0 ? null : slot.scheduledFor,
      status: index % 5 === 0 ? 'missed' as DoseStatus : 'taken' as DoseStatus,
      createdAt: slot.scheduledFor,
    }));

  return [...persisted, ...schedule]
    .sort((a, b) => new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime())
    .slice(0, 20);
}

function buildAlerts(patientId: string) {
  const db = readDb();
  const alerts = db.alerts.filter((alert) => alert.patientId === patientId && !alert.resolved);
  const next = nextDose(patientId);
  const meds = db.medications.filter((med) => med.patientId === patientId);

  const generated: AlertItem[] = [];
  if (!next && meds.length === 0) {
    generated.push({
      id: 'setup-required',
      patientId,
      type: 'warning',
      title: 'Nenhum medicamento cadastrado',
      desc: 'Cadastre ao menos um medicamento para iniciar a automação do dispenser.',
      createdAt: new Date().toISOString(),
      resolved: false,
    });
  }

  const repeatedCompartments = meds.reduce<Record<number, number>>((acc, med) => {
    acc[med.compartment] = (acc[med.compartment] || 0) + 1;
    return acc;
  }, {});

  Object.entries(repeatedCompartments).forEach(([compartment, count]) => {
    if (count > 1) {
      generated.push({
        id: `shared-compartment-${compartment}`,
        patientId,
        type: 'info',
        title: 'Compartimento compartilhado',
        desc: `O compartimento ${compartment} possui ${count} medicamentos agrupados no planejamento atual.`,
        createdAt: new Date().toISOString(),
        resolved: false,
      });
    }
  });

  return [...generated, ...alerts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Servidor rodando liso!', app: 'MedCare IoT' });
});

app.post('/api/auth/caregiver/register', (req: Request, res: Response) => {
  const name = String(req.body.name || '').trim();
  const email = normalizeEmail(req.body.email);
  const phone = normalizePhone(req.body.phone);
  const password = String(req.body.password || '');

  if (!name || !email || !phone || password.length < 6) {
    res.status(400).json({ message: 'Informe nome, email, telefone e senha com pelo menos 6 caracteres.' });
    return;
  }

  const db = readDb();
  if (db.caregivers.some((caregiver) => caregiver.email === email)) {
    res.status(409).json({ message: 'Já existe um cuidador cadastrado com este email.' });
    return;
  }

  if (db.caregivers.some((caregiver) => caregiver.phone === phone)) {
    res.status(409).json({ message: 'Já existe um cuidador cadastrado com este telefone.' });
    return;
  }

  const caregiver: Caregiver = {
    id: crypto.randomUUID(),
    name,
    email,
    phone,
    passwordHash: hashSecret(password),
    createdAt: new Date().toISOString(),
  };

  db.caregivers.push(caregiver);
  writeDb(db);

  res.status(201).json({
    token: signToken({ role: 'caregiver', caregiverId: caregiver.id }),
    user: toPublicCaregiver(caregiver),
    role: 'caregiver',
  });
});

app.post('/api/auth/caregiver/login', (req: Request, res: Response) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');
  const db = readDb();
  const caregiver = db.caregivers.find((item) => item.email === email);

  if (!caregiver || !verifySecret(password, caregiver.passwordHash)) {
    res.status(401).json({ message: 'Email ou senha inválidos.' });
    return;
  }

  res.json({
    token: signToken({ role: 'caregiver', caregiverId: caregiver.id }),
    user: toPublicCaregiver(caregiver),
    role: 'caregiver',
  });
});

app.post('/api/auth/patient/login', (req: Request, res: Response) => {
  const caregiverPhone = normalizePhone(req.body.caregiverPhone);
  const pin = String(req.body.pin || '');
  const db = readDb();
  const caregiver = db.caregivers.find((item) => item.phone === caregiverPhone);

  if (!caregiver) {
    res.status(401).json({ message: 'Telefone do cuidador ou PIN inválido.' });
    return;
  }

  const patient = db.patients.find((item) => item.caregiverId === caregiver.id && verifySecret(pin, item.pinHash));
  if (!patient) {
    res.status(401).json({ message: 'Telefone do cuidador ou PIN inválido.' });
    return;
  }

  res.json({
    token: signToken({ role: 'patient', patientId: patient.id, caregiverId: caregiver.id }),
    user: toPublicPatient(patient),
    caregiver: toPublicCaregiver(caregiver),
    role: 'patient',
  });
});

app.get('/api/me', requireAuth, (req: Request, res: Response) => {
  const db = readDb();
  if (req.auth?.role === 'caregiver') {
    const caregiver = db.caregivers.find((item) => item.id === req.auth?.caregiverId);
    if (!caregiver) {
      res.status(404).json({ message: 'Cuidador não encontrado.' });
      return;
    }
    res.json({ role: 'caregiver', user: toPublicCaregiver(caregiver) });
    return;
  }

  const patient = db.patients.find((item) => item.id === req.auth?.patientId);
  if (!patient) {
    res.status(404).json({ message: 'Paciente não encontrado.' });
    return;
  }
  res.json({ role: 'patient', user: toPublicPatient(patient) });
});

app.get('/api/patients', requireAuth, requireCaregiver, (req: Request, res: Response) => {
  const db = readDb();
  const patients = db.patients
    .filter((patient) => patient.caregiverId === req.auth?.caregiverId)
    .map(toPublicPatient);
  res.json(patients);
});

app.post('/api/patients', requireAuth, requireCaregiver, (req: Request, res: Response) => {
  const name = String(req.body.name || '').trim();
  const relationship = String(req.body.relationship || '').trim();
  const pin = String(req.body.pin || '').replace(/\D/g, '');

  if (!name || !relationship || pin.length !== 4) {
    res.status(400).json({ message: 'Informe nome, parentesco e PIN numérico com 4 dígitos.' });
    return;
  }

  const db = readDb();
  const patient: Patient = {
    id: crypto.randomUUID(),
    caregiverId: req.auth!.caregiverId!,
    name,
    relationship,
    pinHash: hashSecret(pin),
    createdAt: new Date().toISOString(),
  };

  db.patients.push(patient);
  db.preferences.push({ patientId: patient.id, sleepTime: '23:00', wakeTime: '06:00', alarmVolume: 80 });
  writeDb(db);

  res.status(201).json(toPublicPatient(patient));
});

app.get('/api/patients/:patientId/dashboard', requireAuth, (req: Request, res: Response) => {
  const patientId = getRouteParam(req.params.patientId);
  if (!assertPatientAccess(req, res, patientId)) return;

  const db = readDb();
  const patient = db.patients.find((item) => item.id === patientId)!;
  const meds = db.medications.filter((med) => med.patientId === patientId);
  res.json({
    patient: toPublicPatient(patient),
    nextMedication: nextDose(patientId),
    refillPlan: buildRefillPlan(patientId),
    medicationsCount: meds.length,
    alertsCount: buildAlerts(patientId).filter((alert) => alert.type !== 'info').length,
  });
});

app.get('/api/patients/:patientId/medications', requireAuth, (req: Request, res: Response) => {
  const patientId = getRouteParam(req.params.patientId);
  if (!assertPatientAccess(req, res, patientId)) return;

  const db = readDb();
  res.json(db.medications.filter((med) => med.patientId === patientId));
});

app.post('/api/patients/:patientId/medications', requireAuth, requireCaregiver, (req: Request, res: Response) => {
  const patientId = getRouteParam(req.params.patientId);
  if (!assertPatientAccess(req, res, patientId)) return;

  const name = String(req.body.name || '').trim();
  const dosage = String(req.body.dosage || '').trim();
  const firstDoseTime = String(req.body.firstDoseTime || req.body.time || '').trim();
  const compartment = Number(req.body.compartment);
  const frequencyHours = parseFrequencyHours(req.body.frequencyHours);
  const isCritical = Boolean(req.body.isCritical);

  if (!name || !dosage || !isHHMM(firstDoseTime) || !Number.isInteger(compartment) || compartment < 1 || compartment > 7) {
    res.status(400).json({ message: 'Informe medicamento, dosagem, horário válido e compartimento entre 1 e 7.' });
    return;
  }

  const db = readDb();
  const medication: Medication = {
    id: crypto.randomUUID(),
    patientId,
    name,
    dosage,
    firstDoseTime,
    frequencyHours,
    compartment,
    isCritical,
    createdAt: new Date().toISOString(),
  };

  db.medications.push(medication);
  writeDb(db);
  res.status(201).json(medication);
});

app.get('/api/patients/:patientId/history', requireAuth, (req: Request, res: Response) => {
  const patientId = getRouteParam(req.params.patientId);
  if (!assertPatientAccess(req, res, patientId)) return;
  res.json(buildHistory(patientId));
});

app.get('/api/patients/:patientId/alerts', requireAuth, (req: Request, res: Response) => {
  const patientId = getRouteParam(req.params.patientId);
  if (!assertPatientAccess(req, res, patientId)) return;
  res.json(buildAlerts(patientId));
});

app.get('/api/patients/:patientId/preferences', requireAuth, (req: Request, res: Response) => {
  const patientId = getRouteParam(req.params.patientId);
  if (!assertPatientAccess(req, res, patientId)) return;
  res.json(getPreference(patientId));
});

app.put('/api/patients/:patientId/preferences', requireAuth, (req: Request, res: Response) => {
  const patientId = getRouteParam(req.params.patientId);
  if (!assertPatientAccess(req, res, patientId)) return;

  const sleepTime = String(req.body.sleepTime || '23:00');
  const wakeTime = String(req.body.wakeTime || '06:00');
  const alarmVolume = Number(req.body.alarmVolume ?? 80);

  if (!isHHMM(sleepTime) || !isHHMM(wakeTime) || Number.isNaN(alarmVolume) || alarmVolume < 0 || alarmVolume > 100) {
    res.status(400).json({ message: 'Preferências inválidas.' });
    return;
  }

  const db = readDb();
  const existingIndex = db.preferences.findIndex((item) => item.patientId === patientId);
  const preference: PatientPreference = { patientId, sleepTime, wakeTime, alarmVolume };

  if (existingIndex >= 0) db.preferences[existingIndex] = preference;
  else db.preferences.push(preference);

  writeDb(db);
  res.json(preference);
});

app.post('/api/dispense', (req: Request, res: Response) => {
  const db = readDb();
  const patientId = String(req.body.patientId || '');
  const compartment = Number(req.body.compartment || req.body.compartimento || 1);
  const patient = db.patients.find((item) => item.id === patientId) || db.patients[0];

  if (!patient) {
    res.status(404).json({ message: 'Nenhum paciente cadastrado para dispensação.' });
    return;
  }

  const medication = db.medications.find((med) => med.patientId === patient.id && med.compartment === compartment)
    || db.medications.find((med) => med.patientId === patient.id)
    || null;

  const event: DispenseEvent = {
    id: crypto.randomUUID(),
    patientId: patient.id,
    medicationId: medication?.id || null,
    name: medication?.name || 'Dispensação manual',
    dosage: medication?.dosage || 'Dose manual',
    compartment,
    scheduledFor: new Date().toISOString(),
    dispensedAt: new Date().toISOString(),
    status: 'taken',
    createdAt: new Date().toISOString(),
  };

  db.events.push(event);
  writeDb(db);

  console.log('Comando de dispensação recebido do App/ESP32!', { patientId: patient.id, compartment });

  res.status(200).json({
    success: true,
    command: 'GIRAR_MOTOR',
    angulo: 45,
    compartment,
    event,
  });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ message: 'Erro interno no servidor.' });
});

ensureDbFile();
app.listen(PORT, () => {
  console.log(`🚀 Backend MedCare IoT iniciado na porta ${PORT}`);
});
