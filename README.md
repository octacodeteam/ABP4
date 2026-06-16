# MedCare IoT — ABP4

Sistema integrado para controle de um dispenser automático de medicamentos com **frontend React/Vite**, **backend Express/TypeScript**, **PostgreSQL com Prisma**, comunicação **MQTT** e firmware para **ESP32**.

O projeto permite que o cuidador cadastre medicamentos e horários. O sistema calcula automaticamente o plano de abastecimento dos compartimentos e envia comandos ao ESP32 para liberar a dose no horário correto.

## Link do vídeo
https://youtu.be/gk5ULvB5E4A

---

## Visão geral do projeto

* O cuidador cadastra os remédios do paciente.
* O cuidador não escolhe manualmente os compartimentos.
* O sistema agrupa medicamentos que devem ser tomados no mesmo horário.
* O ciclo considera 24 horas a partir do horário em que o paciente acorda.
* O dispenser físico possui 8 compartimentos.
* Se o plano passar de 8 dosagens no ciclo, o sistema avisa que não cabe.
* O ESP32 recebe comandos via MQTT para liberar o compartimento correto.
* O backend recebe eventos do ESP32 sobre queda/passagem e retirada da dose.

---

## Tecnologias utilizadas

### Frontend

* React
* Vite
* TypeScript
* Tailwind CSS
* Lucide React
* Motion React

### Backend

* Node.js
* Express
* TypeScript
* Prisma ORM
* PostgreSQL
* JWT
* MQTT

### Hardware / IoT

* ESP32
* Motor de passo 28BYJ-48
* Driver 2PH124959A / ULN2003
* 2 sensores infravermelhos
* Buzzer
* LCD 16x2 I2C
* Fonte externa 5V
* Broker MQTT público

---

## Estrutura esperada

```txt
ABP4/
├── backend/
│   ├── prisma/
│   ├── src/
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   ├── .env.example
│   └── package.json
│
└── arduino/
    └── medcare_esp32_dispenser.ino
````

---

## Banco de dados

Use PostgreSQL com a configuração local padrão:

```txt
Usuário: postgres
Senha: 123
Banco: medcare_iot
Porta: 5432
```

Crie o banco:

```sql
CREATE DATABASE medcare_iot;
```

---

## Backend

Entre na pasta:

```bash
cd backend
```

Instale as dependências:

```bash
npm install
```

Crie o arquivo `.env`:

Windows:

```bash
copy .env.example .env
```

Linux/macOS:

```bash
cp .env.example .env
```

Exemplo de `.env`:

```env
PORT=3001
DATABASE_URL="postgresql://postgres:123@localhost:5432/medcare_iot?schema=public"
JWT_SECRET="medcare-dev-secret"
MQTT_BROKER_URL=mqtt://broker.hivemq.com:1883
MQTT_TOPIC_PREFIX=medcare/abp4/grupo01
```

Gere o Prisma Client:

```bash
npx prisma generate
```

Aplique as migrations:

```bash
npx prisma migrate dev
```

Se precisar sincronizar direto com o banco:

```bash
npx prisma db push
```

Rode o backend:

```bash
npm run dev
```

URL padrão:

```txt
http://localhost:3001
```

---

## Frontend

Entre na pasta:

```bash
cd frontend
```

Instale as dependências:

```bash
npm install
```

Crie o arquivo `.env`:

Windows:

```bash
copy .env.example .env
```

Linux/macOS:

```bash
cp .env.example .env
```

Variável esperada:

```env
VITE_API_BASE_URL=http://localhost:3001
```

Não coloque `/api` no final da variável. O arquivo `src/api.ts` já monta as rotas com `/api/...`.

Rode:

```bash
npm run dev
```

URL padrão:

```txt
http://localhost:3000
```

---

## Rotas principais

### App

```txt
POST   /api/auth/caregiver/register
POST   /api/auth/caregiver/login
POST   /api/auth/patient/login
GET    /api/me

GET    /api/patients
POST   /api/patients

GET    /api/patients/:patientId/dashboard
GET    /api/patients/:patientId/medications
POST   /api/patients/:patientId/medications
DELETE /api/patients/:patientId/medications/:medicationId

GET    /api/patients/:patientId/refill-plan
POST   /api/patients/:patientId/refill-cycles/confirm
POST   /api/patients/:patientId/dispense

GET    /api/patients/:patientId/history
GET    /api/patients/:patientId/alerts
PATCH  /api/alerts/:alertId/resolve

GET    /api/patients/:patientId/preferences
PUT    /api/patients/:patientId/preferences
```

### IoT / MQTT

```txt
GET  /api/iot/devices
GET  /api/iot/devices/:deviceCode/state
POST /api/iot/devices/:deviceCode/commands/buzzer-test
POST /api/iot/devices/:deviceCode/commands/confirm-removal
POST /api/iot/devices/:deviceCode/commands/release-dose
```

Exemplo para liberar o compartimento 4 no PowerShell:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3001/api/iot/devices/esp32-001/commands/release-dose" `
  -ContentType "application/json" `
  -Body '{"compartment":4}'
```

---

## MQTT

Configuração padrão:

```txt
Broker: broker.hivemq.com
Porta: 1883
Prefixo: medcare/abp4/grupo01
Device: esp32-001
```

Tópicos:

```txt
Eventos:  medcare/abp4/grupo01/esp32-001/events
Status:   medcare/abp4/grupo01/esp32-001/status
Comandos: medcare/abp4/grupo01/esp32-001/commands
```

Comandos aceitos pelo ESP32:

```json
{ "type": "BUZZER_TEST" }
```

```json
{ "type": "RELEASE_DOSE" }
```

```json
{ "type": "RELEASE_DOSE", "compartment": 4 }
```

```json
{ "type": "CONFIRM_REMOVAL" }
```

Eventos publicados pelo ESP32:

```txt
DOSE_PASSED_DISPENSER
DOSE_WAITING_REMOVAL
DOSE_REMOVED_FROM_RECIPIENT
```

---

## Agendador automático

O backend possui um scheduler que verifica periodicamente os slots pendentes.

Fluxo:

```txt
1. O cuidador confirma o abastecimento.
2. O ciclo fica ACTIVE.
3. O backend procura RefillSlots com status PENDING.
4. Quando scheduledAt chega no minuto atual, o backend envia RELEASE_DOSE via MQTT.
5. O slot passa para COMMAND_SENT.
6. Quando o ESP32 detecta a passagem, o slot pode virar RELEASED.
7. Quando o ESP32 detecta retirada, o slot pode virar TAKEN.
```

Condições para disparar automaticamente:

```txt
RefillCycle.status = ACTIVE
RefillSlot.status = PENDING
RefillSlot.scheduledAt dentro do minuto atual
```

---

## Arduino / ESP32

Arquivo esperado:

```txt
arduino/medcare_esp32_dispenser.ino
```

### Bibliotecas da Arduino IDE

Instale pelo Library Manager:

```txt
PubSubClient
ArduinoJson
LiquidCrystal_I2C
```

### Instalar placa ESP32

Na Arduino IDE, abra:

```txt
File > Preferences
```

Em `Additional Boards Manager URLs`, adicione:

```txt
https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
```

Depois:

```txt
Tools > Board > Boards Manager
```

Pesquise:

```txt
esp32
```

Instale:

```txt
esp32 by Espressif Systems
```

Placa recomendada:

```txt
ESP32 Dev Module
```

Velocidade de upload recomendada:

```txt
115200
```

### Configurações no `.ino`

Ajuste:

```cpp
const char* WIFI_SSID = "NOME_DO_WIFI";
const char* WIFI_PASSWORD = "SENHA_DO_WIFI";

const char* MQTT_HOST = "broker.hivemq.com";
const int MQTT_PORT = 1883;

const char* MQTT_TOPIC_PREFIX = "medcare/abp4/grupo01";
const char* DEVICE_CODE = "esp32-001";
```

Nunca suba senha real do Wi-Fi para o GitHub.

Antes de commitar, troque por:

```cpp
const char* WIFI_PASSWORD = "COLOQUE_SUA_SENHA_AQUI";
```

---

## Ligações do hardware

### Motor 28BYJ-48 com driver 2PH124959A / ULN2003

Ordem funcional usada no projeto:

```txt
ESP32 GPIO17 -> IN1
ESP32 GPIO5  -> IN2
ESP32 GPIO18 -> IN3
ESP32 GPIO19 -> IN4
```

Alimentação:

```txt
Fonte externa 5V + -> VCC do driver
Fonte externa 5V - -> GND do driver
GND do ESP32       -> GND do driver
```

O motor fica no conector branco do driver.

O GND da fonte externa e o GND do ESP32 precisam estar conectados juntos.

### Sensor IR 1 — passagem da dose

```txt
IR1 VCC -> 3V3 do ESP32
IR1 GND -> GND do ESP32
IR1 OUT -> GPIO34
```

### Sensor IR 2 — retirada da dose

```txt
IR2 VCC -> 3V3 do ESP32
IR2 GND -> GND do ESP32
IR2 OUT -> GPIO35
```

### Buzzer

```txt
Buzzer + -> GPIO23
Buzzer - -> GND
```

### LCD 16x2 I2C

```txt
LCD SDA -> GPIO21
LCD SCL -> GPIO22
LCD VCC -> 3V3 ou 5V
LCD GND -> GND
```

Endereços comuns:

```txt
0x27
0x3F
```

---

## Fluxo de teste recomendado

1. Abra o PostgreSQL e confirme que o banco `medcare_iot` existe.
2. Rode o backend com `npm run dev`.
3. Rode o frontend com `npm run dev`.
4. Grave o código no ESP32.
5. Abra o Serial Monitor em `115200`.
6. Confirme que o ESP32 conectou no Wi-Fi e no MQTT.
7. Cadastre cuidador, paciente e medicamentos.
8. Confirme o abastecimento.
9. Clique em `Dispensar agora`.
10. O motor deve girar para o compartimento da próxima dose.
11. Passe uma bolinha/remédio no IR1.
12. O backend deve receber `DOSE_PASSED_DISPENSER`.
13. Passe a mão no IR2.
14. O backend deve receber `DOSE_REMOVED_FROM_RECIPIENT`.
15. O frontend deve atualizar status do dispositivo e da dose.

---

## Problemas comuns

### ESP32 não aparece na porta COM

Verifique:

```txt
Cabo USB apenas de carga
Driver USB ausente
Porta USB com problema
```

Drivers comuns:

```txt
CH340 / CH341
CP2102
CH9102
```

### Backend não conecta no MQTT na rede da faculdade

Algumas redes bloqueiam a porta 1883.

Alternativas:

```txt
Usar hotspot do celular
Usar notebook em rede própria
Testar WebSocket MQTT, se configurado no backend
```

### LCD não mostra texto

Teste:

```txt
Endereço 0x27
Endereço 0x3F
Ajuste do potenciômetro azul
SDA no GPIO21
SCL no GPIO22
```

### Motor vibra mas não gira

Verifique:

```txt
Fonte 5V com corrente suficiente
GND comum entre fonte e ESP32
Ordem dos pinos IN1 a IN4
```

Neste projeto, a ordem funcional foi:

```txt
GPIO17 -> IN1
GPIO5  -> IN2
GPIO18 -> IN3
GPIO19 -> IN4
```

---

## Cuidados antes de subir para o GitHub

Não suba arquivos com senhas ou dados locais.

Confira o `.gitignore`:

```gitignore
node_modules/
.env
dist/
build/
.DS_Store
.vscode/
*.log
```

Se algum `.env` já foi adicionado ao Git por engano:

```bash
git rm --cached backend/.env
git rm --cached frontend/.env
```

---

## Comandos Git

Verificar estado:

```bash
git status
```

Adicionar arquivos:

```bash
git add .
```

Criar commit:

```bash
git commit -m "Atualiza integração IoT, README e configurações do ESP32"
```

Conferir remoto:

```bash
git remote -v
```

Se o remoto ainda não existir:

```bash
git remote add origin https://github.com/octacodeteam/ABP4.git
```

Garantir branch principal:

```bash
git branch -M main
```

Se o repositório remoto já tem commits:

```bash
git pull origin main --allow-unrelated-histories
```

Enviar:

```bash
git push -u origin main
```

Depois dos próximos commits:

```bash
git add .
git commit -m "Mensagem do commit"
git push
```

---

## Equipe

Projeto acadêmico desenvolvido para a ABP4, integrando software web, banco de dados e protótipo físico com ESP32.
