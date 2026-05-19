import crypto from 'crypto';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { mqttBridge } from './iot/mqttBridge';
import { createIotRouter } from './iot/iotRoutes';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = Number(process.env.PORT || 3001);
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'troque-este-segredo-em-producao';
const DEFAULT_DEVICE_TOKEN = process.env.DEFAULT_DEVICE_TOKEN || '123';
const COMPARTMENTS_COUNT = 8;
const MINUTES_PER_DAY = 24 * 60;
const DEVICE_OFFLINE_AFTER_MINUTES = 5;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
mqttBridge.connect();
app.use('/api/iot', createIotRouter(mqttBridge));

type Role = 'caregiver' | 'patient';

interface AuthPayload {
  role: Role;
  caregiverId?: string;
  patientId?: string;
}

interface PublicMedication {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  instructions: string | null;
  firstDoseTime: string;
  frequencyHours: number;
  isCritical: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface PlanItem {
  medicationId: string;
  name: string;
  dosage: string;
  isCritical: boolean;
}

interface PlanSlot {
  id: string;
  compartment: number;
  scheduledAt: string;
  scheduledTime: string;
  status: string;
  items: PlanItem[];
  itemsText: string;
  critical: boolean;
}

interface PlanPreview {
  fits: boolean;
  maxCompartments: number;
  requiredCompartments: number;
  overflowCount: number;
  cycleStart: string;
  cycleEnd: string;
  wakeTime: string;
  slots: PlanSlot[];
  warning: string | null;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
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
  if (hash.length !== candidate.length) return false;
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

function getRouteParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
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

async function assertPatientAccess(req: Request, res: Response, patientId: string): Promise<boolean> {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });

  if (!patient) {
    res.status(404).json({ message: 'Paciente não encontrado.' });
    return false;
  }

  if (req.auth?.role === 'caregiver' && req.auth.caregiverId === patient.caregiverId) return true;
  if (req.auth?.role === 'patient' && req.auth.patientId === patient.id) return true;

  res.status(403).json({ message: 'Você não tem acesso a este paciente.' });
  return false;
}

function toPublicCaregiver(caregiver: any) {
  const { passwordHash, ...safe } = caregiver;
  return safe;
}

function toPublicPatient(patient: any) {
  const { pinHash, ...safe } = patient;
  return safe;
}

function toPublicDevice(device: any) {
  if (!device) return null;
  const { deviceTokenHash, ...safe } = device;
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

function minutesOfDay(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

function timeFromRelativeMinute(wakeTime: string, relativeMinute: number) {
  const absolute = (minutesOfDay(wakeTime) + relativeMinute) % MINUTES_PER_DAY;
  const hour = Math.floor(absolute / 60);
  const minute = absolute % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function dateAtTime(baseDate: Date, time: string) {
  const [hour, minute] = time.split(':').map(Number);
  const date = new Date(baseDate);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function getCycleBaseDate() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function mapSlotStatus(status: string) {
  const labels: Record<string, string> = {
    PENDING: 'Pendente',
    COMMAND_SENT: 'Comando enviado',
    RELEASED: 'Liberado',
    TAKEN: 'Retirado',
    MISSED: 'Não retirado',
    FAILED: 'Falhou',
  };
  return labels[status] || status;
}

async function getPreference(patientId: string) {
  const existing = await prisma.patientPreference.findUnique({ where: { patientId } });
  if (existing) return existing;

  return prisma.patientPreference.create({
    data: {
      patientId,
      wakeTime: '06:00',
      sleepTime: '22:00',
      alarmVolume: 80,
    },
  });
}

async function getOrCreateDefaultDevice(patientId: string) {
  const existing = await prisma.device.findFirst({ where: { patientId } });
  if (existing) return existing;

  const devicesCount = await prisma.device.count();
  const deviceCode = devicesCount === 0 ? 'esp32-001' : `esp32-${String(devicesCount + 1).padStart(3, '0')}`;

  return prisma.device.create({
    data: {
      patientId,
      deviceCode,
      deviceTokenHash: hashSecret(DEFAULT_DEVICE_TOKEN),
      name: 'Dispenser principal',
      status: 'OFFLINE',
      currentCompartment: 1,
      compartmentsCount: COMPARTMENTS_COUNT,
    },
  });
}

function buildPlanFromMedications(medications: PublicMedication[], wakeTime: string, cycleStart: Date): PlanPreview {
  const grouped = new Map<number, PlanItem[]>();
  const wakeMinute = minutesOfDay(wakeTime);

  for (const med of medications) {
    if (!med.active) continue;

    const firstMinute = minutesOfDay(med.firstDoseTime);
    const firstRelativeMinute = (firstMinute - wakeMinute + MINUTES_PER_DAY) % MINUTES_PER_DAY;
    const frequencyMinutes = med.frequencyHours * 60;

    // O ciclo é 24h a partir do horário em que o paciente acorda.
    // Exemplo: wakeTime 06:00 => ciclo 06:00 de hoje até 05:59 de amanhã.
    for (let relativeMinute = firstRelativeMinute; relativeMinute < MINUTES_PER_DAY; relativeMinute += frequencyMinutes) {
      const item: PlanItem = {
        medicationId: med.id,
        name: med.name,
        dosage: med.dosage,
        isCritical: med.isCritical,
      };
      grouped.set(relativeMinute, [...(grouped.get(relativeMinute) || []), item]);
    }
  }

  const entries = [...grouped.entries()].sort(([a], [b]) => a - b);
  const fits = entries.length <= COMPARTMENTS_COUNT;

  const slots: PlanSlot[] = entries.map(([relativeMinute, items], index) => {
    const scheduledAt = addMinutes(cycleStart, relativeMinute);
    const scheduledTime = timeFromRelativeMinute(wakeTime, relativeMinute);
    return {
      id: `preview-${relativeMinute}`,
      compartment: index + 1,
      scheduledAt: scheduledAt.toISOString(),
      scheduledTime,
      status: 'PREVIEW',
      items,
      itemsText: items.map((item) => item.name).join(' + '),
      critical: items.some((item) => item.isCritical),
    };
  });

  return {
    fits,
    maxCompartments: COMPARTMENTS_COUNT,
    requiredCompartments: entries.length,
    overflowCount: Math.max(0, entries.length - COMPARTMENTS_COUNT),
    cycleStart: cycleStart.toISOString(),
    cycleEnd: addMinutes(cycleStart, MINUTES_PER_DAY).toISOString(),
    wakeTime,
    slots,
    warning: fits ? null : `Este plano exige ${entries.length} compartimentos, mas o dispenser possui apenas ${COMPARTMENTS_COUNT}. Ajuste os horários iniciais/frequências ou divida o abastecimento em mais de um ciclo.`,
  };
}

async function generatePlanPreview(patientId: string): Promise<PlanPreview> {
  const preference = await getPreference(patientId);
  const medications = await prisma.medication.findMany({
    where: { patientId, active: true },
    orderBy: { createdAt: 'asc' },
  });

  const cycleStart = dateAtTime(getCycleBaseDate(), preference.wakeTime);
  return buildPlanFromMedications(medications as PublicMedication[], preference.wakeTime, cycleStart);
}

function mapCycleSlot(slot: any): PlanSlot {
  const items: PlanItem[] = slot.items.map((item: any) => ({
    medicationId: item.medicationId,
    name: item.nameSnapshot,
    dosage: item.dosageSnapshot,
    isCritical: Boolean(item.medication?.isCritical),
  }));

  return {
    id: slot.id,
    compartment: slot.compartmentNumber,
    scheduledAt: slot.scheduledAt.toISOString(),
    scheduledTime: slot.scheduledTime,
    status: slot.status,
    items,
    itemsText: items.map((item) => item.name).join(' + '),
    critical: items.some((item) => item.isCritical),
  };
}

async function getActiveCycle(patientId: string) {
  return prisma.refillCycle.findFirst({
    where: { patientId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    include: {
      device: true,
      slots: {
        orderBy: { compartmentNumber: 'asc' },
        include: {
          items: { include: { medication: true } },
        },
      },
    },
  });
}

async function getNextSlot(patientId: string) {
  const now = new Date();
  const activeCycle = await getActiveCycle(patientId);

  if (activeCycle) {
    return activeCycle.slots.find((slot: any) => (
      ['PENDING', 'COMMAND_SENT', 'RELEASED'].includes(slot.status) && slot.scheduledAt.getTime() >= now.getTime() - 60 * 60 * 1000
    )) || null;
  }

  const preview = await generatePlanPreview(patientId);
  return preview.slots.find((slot) => new Date(slot.scheduledAt).getTime() >= now.getTime()) || preview.slots[0] || null;
}

async function buildDashboard(patientId: string) {
  const [patient, medicationsCount, activeCycle, preview, alerts, device] = await Promise.all([
    prisma.patient.findUnique({ where: { id: patientId } }),
    prisma.medication.count({ where: { patientId, active: true } }),
    getActiveCycle(patientId),
    generatePlanPreview(patientId),
    buildAlerts(patientId),
    prisma.device.findFirst({ where: { patientId } }),
  ]);

  const nextSlot = await getNextSlot(patientId);

  return {
    patient: toPublicPatient(patient),
    device: toPublicDevice(device),
    activeCycle: activeCycle ? {
      id: activeCycle.id,
      status: activeCycle.status,
      cycleStart: activeCycle.cycleStart,
      cycleEnd: activeCycle.cycleEnd,
      confirmedAt: activeCycle.confirmedAt,
    } : null,
    nextSlot: nextSlot ? (typeof (nextSlot as any).scheduledAt === 'string' ? nextSlot : mapCycleSlot(nextSlot)) : null,
    refillPlan: activeCycle ? {
      fits: true,
      maxCompartments: COMPARTMENTS_COUNT,
      requiredCompartments: activeCycle.slots.length,
      overflowCount: 0,
      cycleStart: activeCycle.cycleStart.toISOString(),
      cycleEnd: activeCycle.cycleEnd.toISOString(),
      wakeTime: activeCycle.wakeTime,
      slots: activeCycle.slots.map(mapCycleSlot),
      warning: null,
    } : preview,
    medicationsCount,
    alertsCount: alerts.filter((alert: any) => alert.type !== 'INFO').length,
  };
}

async function buildAlerts(patientId: string) {
  const [persisted, medicationsCount, activeCycle, preview, device] = await Promise.all([
    prisma.alert.findMany({ where: { patientId, resolved: false }, orderBy: { createdAt: 'desc' } }),
    prisma.medication.count({ where: { patientId, active: true } }),
    getActiveCycle(patientId),
    generatePlanPreview(patientId),
    prisma.device.findFirst({ where: { patientId } }),
  ]);

  const generated: any[] = [];
  const now = new Date();

  if (medicationsCount === 0) {
    generated.push({
      id: 'generated-no-medications',
      patientId,
      type: 'WARNING',
      title: 'Nenhum medicamento cadastrado',
      desc: 'Cadastre pelo menos um medicamento para que o sistema consiga montar o plano de abastecimento.',
      createdAt: now,
      resolved: false,
    });
  }

  if (medicationsCount > 0 && !preview.fits) {
    generated.push({
      id: 'generated-plan-overflow',
      patientId,
      type: 'DANGER',
      title: 'Plano não cabe no dispenser',
      desc: preview.warning,
      createdAt: now,
      resolved: false,
    });
  }

  if (medicationsCount > 0 && preview.fits && !activeCycle) {
    generated.push({
      id: 'generated-cycle-not-confirmed',
      patientId,
      type: 'INFO',
      title: 'Abastecimento pendente',
      desc: 'O plano foi calculado, mas o cuidador ainda precisa confirmar que abasteceu fisicamente os 8 compartimentos.',
      createdAt: now,
      resolved: false,
    });
  }

  if (device) {
    const lastSeen = device.lastSeenAt?.getTime() || 0;
    const offline = !lastSeen || now.getTime() - lastSeen > DEVICE_OFFLINE_AFTER_MINUTES * 60 * 1000;
    if (offline) {
      generated.push({
        id: 'generated-device-offline',
        patientId,
        deviceId: device.id,
        type: 'WARNING',
        title: 'Dispenser offline',
        desc: `O dispositivo ${device.deviceCode} ainda não enviou comunicação recente ao backend.`,
        createdAt: now,
        resolved: false,
      });
    }
  }

  return [...generated, ...persisted];
}

async function authenticateDevice(req: Request, res: Response) {
  const deviceCode = getRouteParam(req.params.deviceCode);
  const deviceToken = String(req.headers['x-device-token'] || '');

  const device = await prisma.device.findUnique({ where: { deviceCode } });
  if (!device) {
    res.status(404).json({ message: 'Dispositivo não encontrado.' });
    return null;
  }

  if (!deviceToken || !verifySecret(deviceToken, device.deviceTokenHash)) {
    res.status(401).json({ message: 'Token do dispositivo inválido.' });
    return null;
  }

  return device;
}

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Servidor rodando com PostgreSQL e Prisma.', app: 'MedCare IoT' });
});

app.post('/api/auth/caregiver/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = normalizeEmail(req.body.email);
    const phone = normalizePhone(req.body.phone);
    const password = String(req.body.password || '');

    if (!name || !email || !phone || password.length < 6) {
      res.status(400).json({ message: 'Informe nome, email, telefone e senha com pelo menos 6 caracteres.' });
      return;
    }

    const duplicated = await prisma.caregiver.findFirst({ where: { OR: [{ email }, { phone }] } });
    if (duplicated?.email === email) {
      res.status(409).json({ message: 'Já existe um cuidador cadastrado com este email.' });
      return;
    }
    if (duplicated?.phone === phone) {
      res.status(409).json({ message: 'Já existe um cuidador cadastrado com este telefone.' });
      return;
    }

    const caregiver = await prisma.caregiver.create({
      data: { name, email, phone, passwordHash: hashSecret(password) },
    });

    res.status(201).json({
      token: signToken({ role: 'caregiver', caregiverId: caregiver.id }),
      user: toPublicCaregiver(caregiver),
      role: 'caregiver',
    });
  } catch (err) {
    next(err);
  }
});

app.post('/api/auth/caregiver/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');
    const caregiver = await prisma.caregiver.findUnique({ where: { email } });

    if (!caregiver || !verifySecret(password, caregiver.passwordHash)) {
      res.status(401).json({ message: 'Email ou senha inválidos.' });
      return;
    }

    res.json({
      token: signToken({ role: 'caregiver', caregiverId: caregiver.id }),
      user: toPublicCaregiver(caregiver),
      role: 'caregiver',
    });
  } catch (err) {
    next(err);
  }
});

app.post('/api/auth/patient/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const caregiverPhone = normalizePhone(req.body.caregiverPhone);
    const pin = String(req.body.pin || '').replace(/\D/g, '');

    const caregiver = await prisma.caregiver.findUnique({ where: { phone: caregiverPhone } });
    if (!caregiver) {
      res.status(401).json({ message: 'Telefone do cuidador ou PIN inválido.' });
      return;
    }

    const patients = await prisma.patient.findMany({ where: { caregiverId: caregiver.id } });
    const patient = patients.find((item: any) => verifySecret(pin, item.pinHash));

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
  } catch (err) {
    next(err);
  }
});

app.get('/api/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.auth?.role === 'caregiver') {
      const caregiver = await prisma.caregiver.findUnique({ where: { id: req.auth.caregiverId } });
      if (!caregiver) {
        res.status(404).json({ message: 'Cuidador não encontrado.' });
        return;
      }
      res.json({ role: 'caregiver', user: toPublicCaregiver(caregiver) });
      return;
    }

    const patient = await prisma.patient.findUnique({ where: { id: req.auth?.patientId } });
    if (!patient) {
      res.status(404).json({ message: 'Paciente não encontrado.' });
      return;
    }
    res.json({ role: 'patient', user: toPublicPatient(patient) });
  } catch (err) {
    next(err);
  }
});

app.get('/api/patients', requireAuth, requireCaregiver, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patients = await prisma.patient.findMany({
      where: { caregiverId: req.auth!.caregiverId! },
      orderBy: { createdAt: 'asc' },
    });
    res.json(patients.map(toPublicPatient));
  } catch (err) {
    next(err);
  }
});

app.post('/api/patients', requireAuth, requireCaregiver, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const name = String(req.body.name || '').trim();
    const relationship = String(req.body.relationship || '').trim();
    const pin = String(req.body.pin || '').replace(/\D/g, '');

    if (!name || !relationship || pin.length !== 4) {
      res.status(400).json({ message: 'Informe nome, parentesco e PIN numérico com 4 dígitos.' });
      return;
    }

    const existingPatients = await prisma.patient.findMany({ where: { caregiverId: req.auth!.caregiverId! } });
    const duplicatedPin = existingPatients.some((patient: any) => verifySecret(pin, patient.pinHash));
    if (duplicatedPin) {
      res.status(409).json({ message: 'Este cuidador já possui um paciente com este PIN. Escolha outro PIN.' });
      return;
    }

    const patient = await prisma.patient.create({
      data: {
        caregiverId: req.auth!.caregiverId!,
        name,
        relationship,
        pinHash: hashSecret(pin),
        preference: {
          create: { wakeTime: '06:00', sleepTime: '22:00', alarmVolume: 80 },
        },
      },
    });

    await getOrCreateDefaultDevice(patient.id);
    res.status(201).json(toPublicPatient(patient));
  } catch (err) {
    next(err);
  }
});

app.get('/api/patients/:patientId/dashboard', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = getRouteParam(req.params.patientId);
    if (!(await assertPatientAccess(req, res, patientId))) return;
    res.json(await buildDashboard(patientId));
  } catch (err) {
    next(err);
  }
});

app.get('/api/patients/:patientId/medications', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = getRouteParam(req.params.patientId);
    if (!(await assertPatientAccess(req, res, patientId))) return;

    const meds = await prisma.medication.findMany({ where: { patientId, active: true }, orderBy: { createdAt: 'asc' } });
    res.json(meds);
  } catch (err) {
    next(err);
  }
});

app.post('/api/patients/:patientId/medications', requireAuth, requireCaregiver, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = getRouteParam(req.params.patientId);
    if (!(await assertPatientAccess(req, res, patientId))) return;

    const name = String(req.body.name || '').trim();
    const dosage = String(req.body.dosage || '').trim();
    const instructions = String(req.body.instructions || '').trim() || null;
    const firstDoseTime = String(req.body.firstDoseTime || '').trim();
    const frequencyHours = parseFrequencyHours(req.body.frequencyHours);
    const isCritical = Boolean(req.body.isCritical);

    if (!name || !dosage || !isHHMM(firstDoseTime)) {
      res.status(400).json({ message: 'Informe medicamento, dosagem e horário inicial válido.' });
      return;
    }

    const medication = await prisma.medication.create({
      data: {
        patientId,
        name,
        dosage,
        instructions,
        firstDoseTime,
        frequencyHours,
        isCritical,
        active: true,
      },
    });

    // Quando uma regra de remédio muda, o ciclo ativo antigo deixa de ser confiável.
    // O cuidador deve gerar/confirmar um novo abastecimento físico.
    await prisma.refillCycle.updateMany({
      where: { patientId, status: 'ACTIVE' },
      data: { status: 'CANCELLED' },
    });

    res.status(201).json(medication);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/patients/:patientId/medications/:medicationId', requireAuth, requireCaregiver, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = getRouteParam(req.params.patientId);
    const medicationId = getRouteParam(req.params.medicationId);
    if (!(await assertPatientAccess(req, res, patientId))) return;

    // Segurança: além de validar o paciente, conferimos se o medicamento pertence
    // realmente a esse paciente. Assim um cuidador não consegue inativar remédio
    // de outro paciente apenas chutando um medicationId.
    const medication = await prisma.medication.findFirst({ where: { id: medicationId, patientId } });
    if (!medication) {
      res.status(404).json({ message: 'Medicamento não encontrado para este paciente.' });
      return;
    }

    await prisma.medication.update({
      where: { id: medicationId },
      data: { active: false },
    });

    await prisma.refillCycle.updateMany({ where: { patientId, status: 'ACTIVE' }, data: { status: 'CANCELLED' } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

app.get('/api/patients/:patientId/refill-plan', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = getRouteParam(req.params.patientId);
    if (!(await assertPatientAccess(req, res, patientId))) return;
    res.json(await generatePlanPreview(patientId));
  } catch (err) {
    next(err);
  }
});

app.post('/api/patients/:patientId/refill-cycles/confirm', requireAuth, requireCaregiver, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = getRouteParam(req.params.patientId);
    if (!(await assertPatientAccess(req, res, patientId))) return;

    const preview = await generatePlanPreview(patientId);
    if (!preview.fits) {
      res.status(400).json({ message: preview.warning || 'O plano não cabe no dispenser.' });
      return;
    }
    if (preview.slots.length === 0) {
      res.status(400).json({ message: 'Não há medicamentos ativos para montar o abastecimento.' });
      return;
    }

    const device = await getOrCreateDefaultDevice(patientId);

    const cycle = await prisma.$transaction(async (tx: any) => {
      await tx.refillCycle.updateMany({
        where: { patientId, status: 'ACTIVE' },
        data: { status: 'CANCELLED' },
      });

      return tx.refillCycle.create({
        data: {
          patientId,
          deviceId: device.id,
          cycleStart: new Date(preview.cycleStart),
          cycleEnd: new Date(preview.cycleEnd),
          wakeTime: preview.wakeTime,
          status: 'ACTIVE',
          confirmedAt: new Date(),
          slots: {
            create: preview.slots.map((slot) => ({
              patientId,
              deviceId: device.id,
              compartmentNumber: slot.compartment,
              scheduledAt: new Date(slot.scheduledAt),
              scheduledTime: slot.scheduledTime,
              status: 'PENDING',
              items: {
                create: slot.items.map((item) => ({
                  medicationId: item.medicationId,
                  nameSnapshot: item.name,
                  dosageSnapshot: item.dosage,
                  quantityText: item.dosage,
                })),
              },
            })),
          },
        },
        include: {
          device: true,
          slots: {
            orderBy: { compartmentNumber: 'asc' },
            include: { items: { include: { medication: true } } },
          },
        },
      });
    });

    res.status(201).json({
      id: cycle.id,
      status: cycle.status,
      device: toPublicDevice(cycle.device),
      slots: cycle.slots.map(mapCycleSlot),
    });
  } catch (err) {
    next(err);
  }
});

app.post('/api/patients/:patientId/dispense', requireAuth, requireCaregiver, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = getRouteParam(req.params.patientId);
    if (!(await assertPatientAccess(req, res, patientId))) return;

    const activeCycle = await getActiveCycle(patientId);
    if (!activeCycle) {
      res.status(400).json({ message: 'Confirme o abastecimento antes de enviar comandos ao dispenser.' });
      return;
    }

    const requestedSlotId = String(req.body.refillSlotId || '');
    const slot = requestedSlotId
      ? activeCycle.slots.find((item: any) => item.id === requestedSlotId)
      : activeCycle.slots.find((item: any) => ['PENDING', 'COMMAND_SENT', 'RELEASED'].includes(item.status));

    if (!slot) {
      res.status(404).json({ message: 'Nenhum compartimento pendente encontrado no ciclo ativo.' });
      return;
    }

    const command = await prisma.deviceCommand.create({
      data: {
        deviceId: activeCycle.deviceId,
        patientId,
        refillSlotId: slot.id,
        commandType: 'MANUAL_DISPENSE',
        status: 'PENDING',
        payload: {
          compartment: slot.compartmentNumber,
          refillSlotId: slot.id,
          scheduledAt: slot.scheduledAt.toISOString(),
          anglePerStep: 45,
        },
      },
    });

    await prisma.refillSlot.update({ where: { id: slot.id }, data: { status: 'COMMAND_SENT' } });

    res.status(201).json({
      success: true,
      message: 'Comando criado. O ESP32 executará ao buscar comandos pendentes.',
      command,
    });
  } catch (err) {
    next(err);
  }
});

app.get('/api/patients/:patientId/history', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = getRouteParam(req.params.patientId);
    if (!(await assertPatientAccess(req, res, patientId))) return;

    const slots = await prisma.refillSlot.findMany({
      where: { patientId },
      orderBy: { scheduledAt: 'desc' },
      take: 30,
      include: { items: { include: { medication: true } }, cycle: true },
    });

    res.json(slots.map((slot: any) => ({
      id: slot.id,
      patientId: slot.patientId,
      refillCycleId: slot.refillCycleId,
      compartment: slot.compartmentNumber,
      scheduledAt: slot.scheduledAt,
      scheduledTime: slot.scheduledTime,
      releasedAt: slot.releasedAt,
      confirmedAt: slot.confirmedAt,
      status: slot.status,
      statusLabel: mapSlotStatus(slot.status),
      items: slot.items.map((item: any) => ({
        id: item.id,
        medicationId: item.medicationId,
        name: item.nameSnapshot,
        dosage: item.dosageSnapshot,
      })),
      itemsText: slot.items.map((item: any) => item.nameSnapshot).join(' + '),
      createdAt: slot.createdAt,
    })));
  } catch (err) {
    next(err);
  }
});

app.get('/api/patients/:patientId/alerts', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = getRouteParam(req.params.patientId);
    if (!(await assertPatientAccess(req, res, patientId))) return;
    res.json(await buildAlerts(patientId));
  } catch (err) {
    next(err);
  }
});

app.patch('/api/alerts/:alertId/resolve', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alertId = getRouteParam(req.params.alertId);

    // Apenas alertas persistidos na tabela alerts podem ser resolvidos manualmente.
    // Alertas automáticos, como "sem medicamentos" ou "dispenser offline",
    // não ficam no banco; eles somem quando a causa é corrigida.
    const alert = await prisma.alert.findUnique({ where: { id: alertId } });
    if (!alert) {
      res.status(404).json({ message: 'Alerta não encontrado ou alerta automático não resolvível.' });
      return;
    }

    if (!(await assertPatientAccess(req, res, alert.patientId))) return;

    const updated = await prisma.alert.update({
      where: { id: alert.id },
      data: { resolved: true, resolvedAt: new Date() },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.get('/api/patients/:patientId/preferences', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = getRouteParam(req.params.patientId);
    if (!(await assertPatientAccess(req, res, patientId))) return;
    res.json(await getPreference(patientId));
  } catch (err) {
    next(err);
  }
});

app.put('/api/patients/:patientId/preferences', requireAuth, requireCaregiver, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = getRouteParam(req.params.patientId);
    if (!(await assertPatientAccess(req, res, patientId))) return;

    const wakeTime = String(req.body.wakeTime || '06:00');
    const sleepTime = String(req.body.sleepTime || '22:00');
    const alarmVolume = Number(req.body.alarmVolume ?? 80);

    if (!isHHMM(wakeTime) || !isHHMM(sleepTime) || Number.isNaN(alarmVolume) || alarmVolume < 0 || alarmVolume > 100) {
      res.status(400).json({ message: 'Preferências inválidas.' });
      return;
    }

    const preference = await prisma.patientPreference.upsert({
      where: { patientId },
      create: { patientId, wakeTime, sleepTime, alarmVolume },
      update: { wakeTime, sleepTime, alarmVolume },
    });

    await prisma.refillCycle.updateMany({ where: { patientId, status: 'ACTIVE' }, data: { status: 'CANCELLED' } });
    res.json(preference);
  } catch (err) {
    next(err);
  }
});

app.post('/api/device/:deviceCode/heartbeat', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const device = await authenticateDevice(req, res);
    if (!device) return;

    const updated = await prisma.device.update({
      where: { id: device.id },
      data: {
        status: 'ONLINE',
        lastSeenAt: new Date(),
        currentCompartment: Number(req.body.currentCompartment || device.currentCompartment || 1),
      },
    });

    await prisma.deviceEvent.create({
      data: {
        deviceId: device.id,
        eventType: 'HEARTBEAT',
        payload: req.body || {},
      },
    });

    res.json({ ok: true, device: toPublicDevice(updated) });
  } catch (err) {
    next(err);
  }
});

app.get('/api/device/:deviceCode/active-cycle', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const device = await authenticateDevice(req, res);
    if (!device) return;

    const activeCycle = await prisma.refillCycle.findFirst({
      where: { deviceId: device.id, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      include: {
        slots: {
          orderBy: { compartmentNumber: 'asc' },
          include: { items: { include: { medication: true } } },
        },
      },
    });

    await prisma.deviceEvent.create({
      data: { deviceId: device.id, eventType: 'CYCLE_SYNC', payload: { hasCycle: Boolean(activeCycle) } },
    });

    if (!activeCycle) {
      res.json({ active: false, slots: [] });
      return;
    }

    res.json({
      active: true,
      cycleId: activeCycle.id,
      cycleStart: activeCycle.cycleStart,
      cycleEnd: activeCycle.cycleEnd,
      wakeTime: activeCycle.wakeTime,
      slots: activeCycle.slots.map(mapCycleSlot),
    });
  } catch (err) {
    next(err);
  }
});

app.get('/api/device/:deviceCode/commands/next', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const device = await authenticateDevice(req, res);
    if (!device) return;

    const command = await prisma.deviceCommand.findFirst({
      where: { deviceId: device.id, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });

    if (!command) {
      res.json({ hasCommand: false });
      return;
    }

    const updated = await prisma.deviceCommand.update({
      where: { id: command.id },
      data: { status: 'SENT', sentAt: new Date() },
    });

    res.json({ hasCommand: true, command: updated });
  } catch (err) {
    next(err);
  }
});

app.post('/api/device/:deviceCode/commands/:commandId/ack', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const device = await authenticateDevice(req, res);
    if (!device) return;

    const commandId = getRouteParam(req.params.commandId);
    const ok = Boolean(req.body.ok ?? true);

    const command = await prisma.deviceCommand.findFirst({ where: { id: commandId, deviceId: device.id } });
    if (!command) {
      res.status(404).json({ message: 'Comando não encontrado.' });
      return;
    }

    const updated = await prisma.deviceCommand.update({
      where: { id: command.id },
      data: {
        status: ok ? 'ACKNOWLEDGED' : 'FAILED',
        ackAt: new Date(),
        errorMessage: ok ? null : String(req.body.errorMessage || 'Falha informada pelo dispositivo.'),
      },
    });

    if (command.refillSlotId) {
      await prisma.refillSlot.update({
        where: { id: command.refillSlotId },
        data: { status: ok ? 'RELEASED' : 'FAILED', releasedAt: ok ? new Date() : undefined },
      });
    }

    await prisma.deviceEvent.create({
      data: {
        deviceId: device.id,
        refillSlotId: command.refillSlotId,
        eventType: 'COMMAND_ACK',
        payload: { ok, commandId, body: req.body || {} },
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.post('/api/device/:deviceCode/events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const device = await authenticateDevice(req, res);
    if (!device) return;

    const eventType = String(req.body.eventType || '').toUpperCase();
    const refillSlotId = String(req.body.refillSlotId || '') || null;
    const validEvents = ['BOOT', 'HEARTBEAT', 'CYCLE_SYNC', 'SLOT_RELEASED', 'SENSOR_DETECTED', 'DOSE_TAKEN', 'DOSE_MISSED', 'MOTOR_ERROR'];

    if (!validEvents.includes(eventType)) {
      res.status(400).json({ message: 'Tipo de evento inválido.' });
      return;
    }

    const event = await prisma.deviceEvent.create({
      data: {
        deviceId: device.id,
        refillSlotId,
        eventType: eventType as any,
        payload: req.body.payload || req.body || {},
      },
    });

    if (refillSlotId) {
      if (eventType === 'SLOT_RELEASED') {
        await prisma.refillSlot.update({ where: { id: refillSlotId }, data: { status: 'RELEASED', releasedAt: new Date() } });
      }

      if (eventType === 'SENSOR_DETECTED' || eventType === 'DOSE_TAKEN') {
        await prisma.refillSlot.update({ where: { id: refillSlotId }, data: { status: 'TAKEN', confirmedAt: new Date() } });
      }

      if (eventType === 'DOSE_MISSED' || eventType === 'MOTOR_ERROR') {
        const slot = await prisma.refillSlot.update({
          where: { id: refillSlotId },
          data: { status: eventType === 'MOTOR_ERROR' ? 'FAILED' : 'MISSED' },
          include: { items: true },
        });

        await prisma.alert.create({
          data: {
            patientId: slot.patientId,
            deviceId: device.id,
            refillSlotId: slot.id,
            type: eventType === 'MOTOR_ERROR' ? 'DANGER' : 'WARNING',
            title: eventType === 'MOTOR_ERROR' ? 'Falha no motor' : 'Dose não retirada',
            desc: eventType === 'MOTOR_ERROR'
              ? `O ESP32 informou falha ao liberar o compartimento ${slot.compartmentNumber}.`
              : `O compartimento ${slot.compartmentNumber}, programado para ${slot.scheduledTime}, não teve retirada confirmada.`,
          },
        });
      }
    }

    await prisma.device.update({ where: { id: device.id }, data: { status: 'ONLINE', lastSeenAt: new Date() } });
    res.status(201).json({ ok: true, event });
  } catch (err) {
    next(err);
  }
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ message: 'Erro interno no servidor.' });
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 Backend MedCare IoT iniciado na porta ${PORT}`);
});
