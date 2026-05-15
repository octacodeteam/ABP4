# Backend MedCare IoT

Backend Express + Prisma + PostgreSQL.

## Subir banco

Opção 1: pgAdmin/PostgreSQL local

- Usuário: postgres
- Senha: 123
- Banco: medcare_iot

```sql
CREATE DATABASE medcare_iot;
```

Opção 2: Docker

```bash
docker compose up -d
```

## Rodar backend

```bash
npm install
copy .env.example .env
npx prisma generate
npx prisma migrate dev --name init_medcare_iot
npm run dev
```

## Endpoints principais

### App

- POST /api/auth/caregiver/register
- POST /api/auth/caregiver/login
- POST /api/auth/patient/login
- GET /api/patients
- POST /api/patients
- GET /api/patients/:patientId/dashboard
- GET /api/patients/:patientId/medications
- POST /api/patients/:patientId/medications
- GET /api/patients/:patientId/refill-plan
- POST /api/patients/:patientId/refill-cycles/confirm
- POST /api/patients/:patientId/dispense
- GET /api/patients/:patientId/history
- GET /api/patients/:patientId/alerts
- PATCH /api/alerts/:alertId/resolve
- GET /api/patients/:patientId/preferences
- PUT /api/patients/:patientId/preferences

### ESP32

Todas as rotas do ESP32 usam o cabeçalho:

```txt
X-Device-Token: 123
```

- POST /api/device/:deviceCode/heartbeat
- GET /api/device/:deviceCode/active-cycle
- GET /api/device/:deviceCode/commands/next
- POST /api/device/:deviceCode/commands/:commandId/ack
- POST /api/device/:deviceCode/events
