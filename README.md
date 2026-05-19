# MedCare IoT — ABP4 integrado

Projeto com frontend React/Vite, backend Express/TypeScript, banco PostgreSQL via Prisma e firmware ESP32 para dispenser de remédios com 8 compartimentos.

## Regra principal atual

- O cuidador cadastra remédios.
- O cuidador **não escolhe compartimento**.
- O sistema calcula as dosagens automaticamente.
- Medicamentos com o mesmo horário ficam no mesmo compartimento.
- O ciclo tem 24h a partir do horário em que o paciente acorda.
- O dispenser físico tem 8 compartimentos.
- Se o plano passar de 8 dosagens, o sistema avisa que não cabe.

## Banco local

Use PostgreSQL com usuário `postgres` e senha `123`.

Crie o banco pelo pgAdmin:

```sql
CREATE DATABASE medcare_iot;
```

Ou suba via Docker:

```bash
cd backend
docker compose up -d
```

## Backend

```bash
cd backend
npm install
copy .env.example .env
npx prisma generate
npx prisma migrate dev --name init_medcare_iot
npm run dev
```

Backend: http://localhost:3001

## Frontend

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Frontend: http://localhost:3000

## ESP32

Código em:

```txt
arduino/medcare_esp32_dispenser.ino
```

Ajuste no arquivo:

```cpp
WIFI_SSID
WIFI_PASSWORD
API_BASE_URL
DEVICE_CODE
DEVICE_TOKEN
```

Para teste local, `API_BASE_URL` deve apontar para o IP do computador rodando o backend, por exemplo:

```cpp
const char* API_BASE_URL = "http://192.168.0.10:3001/api";
```

O primeiro paciente cadastrado cria automaticamente o dispositivo `esp32-001` com token `123`.
