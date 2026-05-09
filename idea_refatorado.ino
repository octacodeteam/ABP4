// ============================================================================
//  MedCare IoT - ESP32 + NEMA 17 + A4988
//  Projeto ABP - Dispenser automático de remédios com 8 compartimentos
// ============================================================================
//
//  IMPORTANTE SOBRE A NOVA REGRA DO SISTEMA
//  ----------------------------------------
//  O compartimento NÃO representa um remédio fixo.
//  O compartimento representa uma DOSAGEM/HORÁRIO calculada pelo backend.
//
//  Exemplo físico:
//  Compartimento 1 -> 06:00 -> Ritalina + Tadalafila
//  Compartimento 2 -> 10:00 -> Ritalina
//  Compartimento 3 -> 12:00 -> Tadalafila
//
//  O cuidador cadastra os remédios no app.
//  O backend monta o plano de abastecimento.
//  O ESP32 só precisa saber: qual compartimento liberar e em qual horário.
//
// ============================================================================

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "time.h"

// ============================================================================
//  1. CONFIGURAÇÕES DE REDE E BACKEND
// ============================================================================

const char* WIFI_SSID = "NOME_DA_REDE";
const char* WIFI_PASSWORD = "SENHA_DA_REDE";

// URL do backend Express. Em teste local, use o IP do computador na rede.
// Exemplo: "http://192.168.0.10:3001/api"
const char* API_BASE_URL = "http://192.168.0.10:3001/api";

// Deve bater com o deviceCode criado no backend para o paciente.
// O primeiro paciente criado recebe, por padrão, o dispositivo esp32-001.
const char* DEVICE_CODE = "esp32-001";

// Deve bater com DEFAULT_DEVICE_TOKEN do backend/.env.
// Para ABP local, estamos usando "123".
const char* DEVICE_TOKEN = "123";

// ============================================================================
//  2. NTP - HORÁRIO LOCAL
// ============================================================================

const char* NTP_SERVER = "pool.ntp.org";
const long GMT_OFFSET_SEC = -10800; // Brasil UTC-3
const int DAYLIGHT_OFFSET_SEC = 0;

// ============================================================================
//  3. HARDWARE CONFORME A IMAGEM DO DISPENSER
// ============================================================================

#define NUM_COMPARTIMENTOS 8

// Driver A4988 / DRV8825 para motor NEMA 17
#define STEP_PIN 18
#define DIR_PIN 19
#define ENABLE_PIN 21

// Sensor infravermelho no funil/coletor.
// Ajuste conforme seu módulo: muitos sensores retornam LOW quando detectam.
#define IR_SENSOR_PIN 34
#define IR_DETECTED_LEVEL LOW

// Sensor de som/microfone opcional. Para simplificar, fica como redundância.
#define MIC_SENSOR_PIN 35

// LED e buzzer de alerta
#define LED_PIN 2
#define BUZZER_PIN 23

// Sensor de posição zero opcional. Se não existir, deixe -1.
// Recomendado fisicamente para homing. Sem ele, posicione manualmente no C1.
#define HOME_SENSOR_PIN -1

// Motor comum NEMA 17: 200 passos por volta.
// Se o A4988 estiver em 1/16 microstep: 200 * 16 = 3200 micropassos/volta.
#define STEPS_PER_REVOLUTION 3200
#define STEPS_PER_COMPARTMENT (STEPS_PER_REVOLUTION / NUM_COMPARTIMENTOS) // 400

// Velocidade do motor. Quanto menor o delay, mais rápido o motor gira.
#define STEP_DELAY_MICROS 900

// ============================================================================
//  4. TEMPORIZAÇÃO
// ============================================================================

#define HEARTBEAT_INTERVAL_MS 30000
#define SYNC_CYCLE_INTERVAL_MS 60000
#define COMMAND_POLL_INTERVAL_MS 10000
#define DOSE_DETECTION_TIMEOUT_MS 30000
#define SCHEDULE_CHECK_INTERVAL_MS 1000

// ============================================================================
//  5. ESTRUTURAS DO CICLO ATIVO
// ============================================================================

struct SlotDose {
  String slotId;
  int compartment;       // 1 a 8
  int hour;              // 0 a 23
  int minute;            // 0 a 59
  String scheduledTime;  // HH:MM
  String status;         // PENDING, COMMAND_SENT, RELEASED...
  String itemsText;      // Ex: Ritalina + Tadalafila
  bool executed;         // Evita liberar duas vezes no mesmo ciclo em RAM
};

#define MAX_SLOTS 8
SlotDose slots[MAX_SLOTS];
int totalSlots = 0;
String activeCycleId = "";

int currentCompartment = 1; // assumimos início no compartimento 1
unsigned long lastHeartbeat = 0;
unsigned long lastCycleSync = 0;
unsigned long lastCommandPoll = 0;
unsigned long lastScheduleCheck = 0;

// ============================================================================
//  6. FUNÇÕES DE TEMPO
// ============================================================================

bool getCurrentHourMinute(int &hour, int &minute) {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    Serial.println("[NTP] Falha ao obter horário atual.");
    return false;
  }
  hour = timeinfo.tm_hour;
  minute = timeinfo.tm_min;
  return true;
}

bool parseHHMM(const String& value, int &hour, int &minute) {
  if (value.length() < 5) return false;
  hour = value.substring(0, 2).toInt();
  minute = value.substring(3, 5).toInt();
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

// ============================================================================
//  7. WI-FI
// ============================================================================

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.printf("[WiFi] Conectando em %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Conectado.");
    Serial.print("[WiFi] IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[WiFi] Não conectado. Tentará novamente no loop.");
  }
}

// ============================================================================
//  8. HTTP AUXILIAR
// ============================================================================

void addDeviceHeaders(HTTPClient &http) {
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Token", DEVICE_TOKEN);
}

String deviceUrl(const String& path) {
  return String(API_BASE_URL) + "/device/" + DEVICE_CODE + path;
}

// ============================================================================
//  9. MOTOR DE PASSO / CARROSSEL
// ============================================================================

void enableMotor(bool enable) {
  // A4988 normalmente habilita com LOW e desabilita com HIGH.
  digitalWrite(ENABLE_PIN, enable ? LOW : HIGH);
}

void stepMotor(long steps, bool clockwise) {
  digitalWrite(DIR_PIN, clockwise ? HIGH : LOW);
  enableMotor(true);

  for (long i = 0; i < steps; i++) {
    digitalWrite(STEP_PIN, HIGH);
    delayMicroseconds(STEP_DELAY_MICROS);
    digitalWrite(STEP_PIN, LOW);
    delayMicroseconds(STEP_DELAY_MICROS);
  }

  enableMotor(false);
}

void rotateToCompartment(int targetCompartment) {
  if (targetCompartment < 1 || targetCompartment > NUM_COMPARTIMENTOS) {
    Serial.printf("[MOTOR] Compartimento inválido: %d\n", targetCompartment);
    return;
  }

  int delta = targetCompartment - currentCompartment;
  if (delta < 0) delta += NUM_COMPARTIMENTOS;

  long steps = (long)delta * STEPS_PER_COMPARTMENT;

  Serial.printf("[MOTOR] Atual C%d -> Alvo C%d | Delta=%d | Steps=%ld\n", currentCompartment, targetCompartment, delta, steps);

  if (steps > 0) {
    stepMotor(steps, true);
  }

  currentCompartment = targetCompartment;
}

void runHomingIfAvailable() {
  if (HOME_SENSOR_PIN < 0) {
    Serial.println("[HOMING] Sem sensor de home. Posicione manualmente no compartimento 1 antes de ligar.");
    currentCompartment = 1;
    return;
  }

  pinMode(HOME_SENSOR_PIN, INPUT_PULLUP);
  enableMotor(true);
  digitalWrite(DIR_PIN, HIGH);

  Serial.println("[HOMING] Procurando posição zero...");
  long maxSteps = STEPS_PER_REVOLUTION + 200;
  for (long i = 0; i < maxSteps; i++) {
    if (digitalRead(HOME_SENSOR_PIN) == LOW) {
      Serial.println("[HOMING] Posição zero encontrada. Definindo compartimento atual como 1.");
      currentCompartment = 1;
      enableMotor(false);
      return;
    }
    digitalWrite(STEP_PIN, HIGH);
    delayMicroseconds(STEP_DELAY_MICROS);
    digitalWrite(STEP_PIN, LOW);
    delayMicroseconds(STEP_DELAY_MICROS);
  }

  enableMotor(false);
  Serial.println("[HOMING] Não encontrou home. Usando compartimento 1 como referência manual.");
  currentCompartment = 1;
}

// ============================================================================
//  10. BUZZER / LED / SENSOR
// ============================================================================

void beep(int times) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    tone(BUZZER_PIN, 1200, 250);
    delay(300);
    digitalWrite(LED_PIN, LOW);
    delay(200);
  }
}

bool doseDetected() {
  // Sensor IR detecta passagem/queda da dose no funil ou no copo coletor.
  return digitalRead(IR_SENSOR_PIN) == IR_DETECTED_LEVEL;
}

bool waitDoseDetection() {
  unsigned long start = millis();
  while (millis() - start < DOSE_DETECTION_TIMEOUT_MS) {
    if (doseDetected()) {
      Serial.println("[SENSOR] Dose detectada pelo sensor IR.");
      return true;
    }
    delay(100);
  }
  Serial.println("[SENSOR] Timeout: dose não detectada.");
  return false;
}

// ============================================================================
//  11. EVENTOS PARA O BACKEND
// ============================================================================

void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(deviceUrl("/heartbeat"));
  addDeviceHeaders(http);

  DynamicJsonDocument doc(256);
  doc["currentCompartment"] = currentCompartment;
  doc["firmware"] = "medcare-esp32-nema17-v1";

  String body;
  serializeJson(doc, body);

  int code = http.POST(body);
  Serial.printf("[HTTP] heartbeat -> %d\n", code);
  http.end();
}

void reportEvent(const String& eventType, const String& refillSlotId, const String& message = "") {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(deviceUrl("/events"));
  addDeviceHeaders(http);

  DynamicJsonDocument doc(512);
  doc["eventType"] = eventType;
  if (refillSlotId.length() > 0) doc["refillSlotId"] = refillSlotId;
  doc["payload"]["message"] = message;
  doc["payload"]["currentCompartment"] = currentCompartment;

  String body;
  serializeJson(doc, body);

  int code = http.POST(body);
  Serial.printf("[HTTP] evento %s -> %d\n", eventType.c_str(), code);
  http.end();
}

void acknowledgeCommand(const String& commandId, bool ok, const String& errorMessage = "") {
  if (WiFi.status() != WL_CONNECTED || commandId.length() == 0) return;

  HTTPClient http;
  http.begin(deviceUrl("/commands/" + commandId + "/ack"));
  addDeviceHeaders(http);

  DynamicJsonDocument doc(256);
  doc["ok"] = ok;
  if (!ok) doc["errorMessage"] = errorMessage;

  String body;
  serializeJson(doc, body);
  int code = http.POST(body);
  Serial.printf("[HTTP] ack comando %s -> %d\n", commandId.c_str(), code);
  http.end();
}

// ============================================================================
//  12. SINCRONIZAÇÃO DO CICLO ATIVO
// ============================================================================

void clearSlots() {
  totalSlots = 0;
  activeCycleId = "";
  for (int i = 0; i < MAX_SLOTS; i++) {
    slots[i] = SlotDose();
  }
}

void fetchActiveCycle() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(deviceUrl("/active-cycle"));
  addDeviceHeaders(http);

  int code = http.GET();
  Serial.printf("[HTTP] active-cycle -> %d\n", code);

  if (code != 200) {
    http.end();
    return;
  }

  String payload = http.getString();
  DynamicJsonDocument doc(8192);
  DeserializationError err = deserializeJson(doc, payload);
  if (err) {
    Serial.println("[JSON] Erro lendo active-cycle.");
    http.end();
    return;
  }

  bool active = doc["active"] | false;
  if (!active) {
    Serial.println("[CICLO] Nenhum ciclo ativo.");
    clearSlots();
    http.end();
    return;
  }

  clearSlots();
  activeCycleId = doc["cycleId"].as<String>();

  JsonArray arr = doc["slots"].as<JsonArray>();
  for (JsonObject item : arr) {
    if (totalSlots >= MAX_SLOTS) break;

    SlotDose &slot = slots[totalSlots];
    slot.slotId = item["id"].as<String>();
    slot.compartment = item["compartment"].as<int>();
    slot.scheduledTime = item["scheduledTime"].as<String>();
    slot.status = item["status"].as<String>();
    slot.itemsText = item["itemsText"].as<String>();
    slot.executed = slot.status == "TAKEN" || slot.status == "MISSED" || slot.status == "FAILED";
    parseHHMM(slot.scheduledTime, slot.hour, slot.minute);

    Serial.printf("[CICLO] Slot %s | C%d | %s | %s\n", slot.slotId.c_str(), slot.compartment, slot.scheduledTime.c_str(), slot.itemsText.c_str());
    totalSlots++;
  }

  http.end();
}

// ============================================================================
//  13. EXECUÇÃO DE DOSE
// ============================================================================

void executeSlot(SlotDose &slot, bool manual) {
  Serial.printf("[DOSE] Liberando C%d | %s | %s\n", slot.compartment, slot.scheduledTime.c_str(), slot.itemsText.c_str());

  rotateToCompartment(slot.compartment);
  reportEvent("SLOT_RELEASED", slot.slotId, manual ? "Liberação manual" : "Liberação por horário");

  beep(3);

  bool detected = waitDoseDetection();
  if (detected) {
    reportEvent("DOSE_TAKEN", slot.slotId, "Dose detectada/retirada.");
    slot.status = "TAKEN";
  } else {
    reportEvent("DOSE_MISSED", slot.slotId, "Sensor não confirmou retirada dentro do tempo.");
    slot.status = "MISSED";
  }

  slot.executed = true;
}

void checkScheduledSlots() {
  int hour, minute;
  if (!getCurrentHourMinute(hour, minute)) return;

  for (int i = 0; i < totalSlots; i++) {
    SlotDose &slot = slots[i];
    if (slot.executed) continue;
    if (slot.status != "PENDING" && slot.status != "COMMAND_SENT" && slot.status != "RELEASED") continue;

    if (slot.hour == hour && slot.minute == minute) {
      executeSlot(slot, false);
      return;
    }
  }
}

// ============================================================================
//  14. COMANDOS MANUAIS DO BACKEND
// ============================================================================

void pollNextCommand() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(deviceUrl("/commands/next"));
  addDeviceHeaders(http);

  int code = http.GET();
  if (code != 200) {
    Serial.printf("[HTTP] commands/next -> %d\n", code);
    http.end();
    return;
  }

  String payload = http.getString();
  DynamicJsonDocument doc(2048);
  if (deserializeJson(doc, payload)) {
    http.end();
    return;
  }

  bool hasCommand = doc["hasCommand"] | false;
  if (!hasCommand) {
    http.end();
    return;
  }

  JsonObject command = doc["command"];
  String commandId = command["id"].as<String>();
  JsonObject commandPayload = command["payload"];

  int compartment = commandPayload["compartment"].as<int>();
  String refillSlotId = commandPayload["refillSlotId"].as<String>();

  Serial.printf("[COMANDO] Manual: %s -> C%d\n", commandId.c_str(), compartment);

  bool found = false;
  for (int i = 0; i < totalSlots; i++) {
    if (slots[i].slotId == refillSlotId) {
      executeSlot(slots[i], true);
      found = true;
      break;
    }
  }

  if (!found) {
    // Mesmo se o slot não estiver no cache, executa o compartimento solicitado.
    SlotDose temp;
    temp.slotId = refillSlotId;
    temp.compartment = compartment;
    temp.scheduledTime = "manual";
    temp.itemsText = "Dose manual";
    executeSlot(temp, true);
  }

  acknowledgeCommand(commandId, true);
  http.end();
}

// ============================================================================
//  15. SETUP E LOOP
// ============================================================================

void setup() {
  Serial.begin(115200);
  delay(300);

  pinMode(STEP_PIN, OUTPUT);
  pinMode(DIR_PIN, OUTPUT);
  pinMode(ENABLE_PIN, OUTPUT);
  pinMode(IR_SENSOR_PIN, INPUT);
  pinMode(MIC_SENSOR_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  enableMotor(false);
  digitalWrite(LED_PIN, LOW);

  connectWiFi();
  configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER);

  runHomingIfAvailable();

  reportEvent("BOOT", "", "ESP32 iniciado.");
  sendHeartbeat();
  fetchActiveCycle();

  lastHeartbeat = millis();
  lastCycleSync = millis();
  lastCommandPoll = millis();
  lastScheduleCheck = millis();

  Serial.println("[SISTEMA] MedCare ESP32 pronto.");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  unsigned long now = millis();

  if (now - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
    sendHeartbeat();
    lastHeartbeat = now;
  }

  if (now - lastCycleSync >= SYNC_CYCLE_INTERVAL_MS) {
    fetchActiveCycle();
    lastCycleSync = now;
  }

  if (now - lastCommandPoll >= COMMAND_POLL_INTERVAL_MS) {
    pollNextCommand();
    lastCommandPoll = now;
  }

  if (now - lastScheduleCheck >= SCHEDULE_CHECK_INTERVAL_MS) {
    checkScheduledSlots();
    lastScheduleCheck = now;
  }
}
