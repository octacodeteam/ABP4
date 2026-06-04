// ============================================================================
// MedCare IoT - ESP32 + 28BYJ-48 + 2 IR + Buzzer + LCD I2C + MQTT
// ============================================================================
//
// Ligações usadas:
//
// MOTOR / DRIVER:
// GPIO17 -> IN1
// GPIO5  -> IN2
// GPIO18 -> IN3
// GPIO19 -> IN4
//
// Driver VCC -> +5V da fonte externa
// Driver GND -> GND da fonte externa
// Driver GND -> GND do ESP32
//
// IR1:
// VCC -> 3V3
// GND -> GND
// OUT -> GPIO34
//
// IR2:
// VCC -> 3V3
// GND -> GND
// OUT -> GPIO35
//
// Buzzer:
// + -> GPIO23
// - -> GND
//
// LCD I2C:
// SDA -> GPIO21
// SCL -> GPIO22
// VCC -> 3V3 ou 5V
// GND -> GND
//
// ============================================================================

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// ============================================================================
// WI-FI E MQTT
// ============================================================================

const char* WIFI_SSID = "CLARO_2GF963B4";
const char* WIFI_PASSWORD = "1FF963B4";

const char* MQTT_HOST = "broker.hivemq.com";
const int MQTT_PORT = 1883;

const char* MQTT_TOPIC_PREFIX = "medcare/abp4/grupo01";
const char* DEVICE_CODE = "esp32-001";

// ============================================================================
// PINOS
// ============================================================================

// Ordem ajustada conforme seu teste físico.
// Seu motor funcionou com IN1/IN4 e IN2/IN3 trocados.
#define MOTOR_IN1 17
#define MOTOR_IN2 5
#define MOTOR_IN3 18
#define MOTOR_IN4 19

#define IR_PASSAGEM_PIN 34
#define IR_RETIRADA_PIN 35

#define BUZZER_PIN 23

// LCD I2C.
// Se não funcionar com 0x27, troque para 0x3F.
LiquidCrystal_I2C lcd(0x27, 16, 2);

// ============================================================================
// CONFIGURAÇÕES
// ============================================================================

// 28BYJ-48 em meio passo costuma usar ~4096 passos por volta.
#define STEPS_PER_REVOLUTION 4096

// Seu disco tem 8 posições.
#define NUM_COMPARTIMENTOS 8

// Cada compartimento corresponde a 1/8 de volta.
#define STEPS_PER_COMPARTMENT (STEPS_PER_REVOLUTION / NUM_COMPARTIMENTOS)

// Se o motor vibrar ou perder força, aumente para 4, 5, 6 ou 8.
#define STEP_DELAY_MS 3

// A maioria dos sensores IR fica LOW quando detecta.
// Se ficar invertido, troque LOW por HIGH.
#define IR_DETECTED_LEVEL LOW

#define IR_DEBOUNCE_MS 250
#define BUZZER_TIME_MS 350

#define WIFI_RETRY_INTERVAL_MS 5000
#define MQTT_RETRY_INTERVAL_MS 5000
#define HEARTBEAT_INTERVAL_MS 10000

// true = ao ligar, o motor gira 1 compartimento para teste.
// false = motor só gira por comando MQTT.
#define ENABLE_STARTUP_MOTOR_TEST true

// ============================================================================
// SEQUÊNCIA DO MOTOR
// ============================================================================

int stepSequence[8][4] = {
  {1, 0, 0, 0},
  {1, 1, 0, 0},
  {0, 1, 0, 0},
  {0, 1, 1, 0},
  {0, 0, 1, 0},
  {0, 0, 1, 1},
  {0, 0, 0, 1},
  {1, 0, 0, 1}
};

// ============================================================================
// ESTADOS
// ============================================================================

WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

bool aguardandoRetirada = false;
bool buzzerLigado = false;

unsigned long buzzerInicioMs = 0;
unsigned long lastWifiTryMs = 0;
unsigned long lastMqttTryMs = 0;
unsigned long lastHeartbeatMs = 0;
unsigned long lastIrPassagemMs = 0;
unsigned long lastIrRetiradaMs = 0;
unsigned long eventSequence = 0;

int currentCompartment = 1;

// ============================================================================
// LCD
// ============================================================================

void showLcd(String line1, String line2) {
  lcd.clear();

  lcd.setCursor(0, 0);
  lcd.print(line1.substring(0, 16));

  lcd.setCursor(0, 1);
  lcd.print(line2.substring(0, 16));
}

// ============================================================================
// MOTOR
// ============================================================================

void setMotorStep(int index) {
  digitalWrite(MOTOR_IN1, stepSequence[index][0]);
  digitalWrite(MOTOR_IN2, stepSequence[index][1]);
  digitalWrite(MOTOR_IN3, stepSequence[index][2]);
  digitalWrite(MOTOR_IN4, stepSequence[index][3]);
}

void desligarMotor() {
  digitalWrite(MOTOR_IN1, LOW);
  digitalWrite(MOTOR_IN2, LOW);
  digitalWrite(MOTOR_IN3, LOW);
  digitalWrite(MOTOR_IN4, LOW);
}

void girarPassos(int passos, bool horario) {
  for (int i = 0; i < passos; i++) {
    int index;

    if (horario) {
      index = i % 8;
    } else {
      index = 7 - (i % 8);
    }

    setMotorStep(index);
    delay(STEP_DELAY_MS);
  }

  desligarMotor();
}

void girarUmCompartimento() {
  Serial.println("[MOTOR] Girando 1 compartimento.");

  showLcd("Liberando dose", "Motor girando");

  girarPassos(STEPS_PER_COMPARTMENT, true);

  currentCompartment++;

  if (currentCompartment > NUM_COMPARTIMENTOS) {
    currentCompartment = 1;
  }

  Serial.print("[MOTOR] Compartimento atual: ");
  Serial.println(currentCompartment);

  showLcd("Dose liberada", "Aguardando IR1");
}

void girarParaCompartimento(int targetCompartment) {
  if (targetCompartment < 1 || targetCompartment > NUM_COMPARTIMENTOS) {
    girarUmCompartimento();
    return;
  }

  int delta = targetCompartment - currentCompartment;

  if (delta < 0) {
    delta += NUM_COMPARTIMENTOS;
  }

  Serial.print("[MOTOR] Indo do compartimento ");
  Serial.print(currentCompartment);
  Serial.print(" para ");
  Serial.println(targetCompartment);

  showLcd("Movendo para", "Comp " + String(targetCompartment));

  girarPassos(delta * STEPS_PER_COMPARTMENT, true);

  currentCompartment = targetCompartment;

  showLcd("Dose liberada", "Aguardando IR1");
}

// ============================================================================
// BUZZER
// ============================================================================

void ligarBuzzer() {
  tone(BUZZER_PIN, 3000);
  buzzerLigado = true;
  buzzerInicioMs = millis();
}

void desligarBuzzerSeNecessario() {
  if (buzzerLigado && millis() - buzzerInicioMs >= BUZZER_TIME_MS) {
    noTone(BUZZER_PIN);
    buzzerLigado = false;
  }
}

// ============================================================================
// MQTT - TÓPICOS
// ============================================================================

String topicEvents() {
  return String(MQTT_TOPIC_PREFIX) + "/" + DEVICE_CODE + "/events";
}

String topicStatus() {
  return String(MQTT_TOPIC_PREFIX) + "/" + DEVICE_CODE + "/status";
}

String topicCommands() {
  return String(MQTT_TOPIC_PREFIX) + "/" + DEVICE_CODE + "/commands";
}

// ============================================================================
// MQTT - PUBLICAÇÃO
// ============================================================================

void publishJson(String topic, JsonDocument& doc, bool retained = false) {
  if (!mqttClient.connected()) {
    Serial.println("[MQTT] Nao conectado. Publicacao ignorada.");
    return;
  }

  String payload;
  serializeJson(doc, payload);

  bool ok = mqttClient.publish(topic.c_str(), payload.c_str(), retained);

  Serial.print("[MQTT] Publicando em ");
  Serial.print(topic);
  Serial.print(" -> ");
  Serial.println(ok ? "OK" : "FALHOU");

  Serial.println(payload);
}

void publishEvent(const char* type, const char* message) {
  StaticJsonDocument<512> doc;

  doc["deviceCode"] = DEVICE_CODE;
  doc["type"] = type;
  doc["message"] = message;
  doc["sequence"] = ++eventSequence;
  doc["millis"] = millis();
  doc["currentCompartment"] = currentCompartment;
  doc["aguardandoRetirada"] = aguardandoRetirada;
  doc["irPassagem"] = digitalRead(IR_PASSAGEM_PIN);
  doc["irRetirada"] = digitalRead(IR_RETIRADA_PIN);

  publishJson(topicEvents(), doc, false);
}

void publishStatus(const char* message) {
  StaticJsonDocument<512> doc;

  doc["deviceCode"] = DEVICE_CODE;
  doc["status"] = "ONLINE";
  doc["message"] = message;
  doc["millis"] = millis();
  doc["currentCompartment"] = currentCompartment;
  doc["aguardandoRetirada"] = aguardandoRetirada;
  doc["irPassagem"] = digitalRead(IR_PASSAGEM_PIN);
  doc["irRetirada"] = digitalRead(IR_RETIRADA_PIN);
  doc["freeHeap"] = ESP.getFreeHeap();

  publishJson(topicStatus(), doc, true);
}

// ============================================================================
// SENSORES IR
// ============================================================================

void processarIrPassagem() {
  int leitura = digitalRead(IR_PASSAGEM_PIN);

  if (leitura != IR_DETECTED_LEVEL) {
    return;
  }

  if (millis() - lastIrPassagemMs < IR_DEBOUNCE_MS) {
    return;
  }

  lastIrPassagemMs = millis();

  if (aguardandoRetirada) {
    return;
  }

  Serial.println("[IR1] Dose passou pelo dispenser.");

  aguardandoRetirada = true;

  ligarBuzzer();
  showLcd("Dose passou", "Retire no copo");

  publishEvent("DOSE_PASSED_DISPENSER", "Sensor IR 1 detectou passagem da dose.");
  publishEvent("DOSE_WAITING_REMOVAL", "Dose aguardando retirada.");
  publishStatus("Dose passou pelo dispenser; aguardando retirada.");
}

void processarIrRetirada() {
  int leitura = digitalRead(IR_RETIRADA_PIN);

  if (leitura != IR_DETECTED_LEVEL) {
    return;
  }

  if (millis() - lastIrRetiradaMs < IR_DEBOUNCE_MS) {
    return;
  }

  lastIrRetiradaMs = millis();

  if (!aguardandoRetirada) {
    Serial.println("[IR2] Movimento detectado, mas nao havia dose aguardando.");
    return;
  }

  Serial.println("[IR2] Dose retirada do recipiente.");

  aguardandoRetirada = false;

  ligarBuzzer();
  showLcd("Dose retirada", "Obrigado!");

  publishEvent("DOSE_REMOVED_FROM_RECIPIENT", "Sensor IR 2 detectou retirada.");
  publishStatus("Dose retirada do recipiente.");
}

// ============================================================================
// COMANDOS MQTT
// ============================================================================

void handleMqttMessage(char* topic, byte* payload, unsigned int length) {
  String body;

  for (unsigned int i = 0; i < length; i++) {
    body += (char)payload[i];
  }

  Serial.print("[MQTT] Comando recebido em ");
  Serial.print(topic);
  Serial.print(": ");
  Serial.println(body);

  StaticJsonDocument<512> doc;
  DeserializationError err = deserializeJson(doc, body);

  if (err) {
    Serial.println("[MQTT] JSON invalido no comando.");
    return;
  }

  const char* type = doc["type"] | "";

  if (strcmp(type, "BUZZER_TEST") == 0) {
    ligarBuzzer();
    showLcd("Teste buzzer", "MQTT");
    publishEvent("BUZZER_TEST_EXECUTED", "Buzzer testado via MQTT.");
    return;
  }

  if (strcmp(type, "RELEASE_DOSE") == 0) {
    int compartment = doc["compartment"] | 0;

    if (compartment >= 1 && compartment <= NUM_COMPARTIMENTOS) {
      girarParaCompartimento(compartment);
    } else {
      girarUmCompartimento();
    }

    publishEvent("DOSE_RELEASE_COMMAND_EXECUTED", "Motor executou liberacao de dose.");
    return;
  }

  if (strcmp(type, "CONFIRM_REMOVAL") == 0) {
    aguardandoRetirada = false;

    ligarBuzzer();
    showLcd("Retirada", "confirmada app");

    publishEvent("DOSE_REMOVED_FROM_RECIPIENT", "Retirada confirmada pelo aplicativo.");
    publishStatus("Retirada confirmada pelo aplicativo.");
    return;
  }

  Serial.println("[MQTT] Comando desconhecido.");
}

// ============================================================================
// WI-FI
// ============================================================================

void ensureWifiConnected() {
  static bool wifiStartRequested = false;
  static unsigned long wifiStartRequestedAt = 0;

  if (WiFi.status() == WL_CONNECTED) {
    if (wifiStartRequested) {
      Serial.println("[WiFi] Conectado.");
      Serial.print("[WiFi] IP: ");
      Serial.println(WiFi.localIP());

      showLcd("WiFi conectado", WiFi.localIP().toString());
    }

    wifiStartRequested = false;
    return;
  }

  if (wifiStartRequested && millis() - wifiStartRequestedAt < 15000) {
    return;
  }

  if (millis() - lastWifiTryMs < WIFI_RETRY_INTERVAL_MS) {
    return;
  }

  lastWifiTryMs = millis();
  wifiStartRequested = true;
  wifiStartRequestedAt = millis();

  Serial.print("[WiFi] Tentando conectar em: ");
  Serial.println(WIFI_SSID);

  showLcd("Conectando WiFi", WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.disconnect(false);
  delay(200);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

// ============================================================================
// MQTT - CONEXÃO
// ============================================================================

void ensureMqttConnected() {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  if (mqttClient.connected()) {
    return;
  }

  if (millis() - lastMqttTryMs < MQTT_RETRY_INTERVAL_MS) {
    return;
  }

  lastMqttTryMs = millis();

  String clientId = String("medcare-") + DEVICE_CODE + "-" + String((uint32_t)ESP.getEfuseMac(), HEX);

  Serial.print("[MQTT] Conectando em ");
  Serial.print(MQTT_HOST);
  Serial.print(":");
  Serial.println(MQTT_PORT);

  showLcd("Conectando MQTT", MQTT_HOST);

  bool connected = mqttClient.connect(clientId.c_str());

  if (!connected) {
    Serial.print("[MQTT] Falha. Estado: ");
    Serial.println(mqttClient.state());

    showLcd("MQTT falhou", "state " + String(mqttClient.state()));
    return;
  }

  Serial.println("[MQTT] Conectado.");

  showLcd("MQTT conectado", DEVICE_CODE);

  mqttClient.subscribe(topicCommands().c_str());

  Serial.print("[MQTT] Inscrito em: ");
  Serial.println(topicCommands());

  publishStatus("ESP32 conectado ao MQTT.");
}

// ============================================================================
// SETUP
// ============================================================================

void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(MOTOR_IN1, OUTPUT);
  pinMode(MOTOR_IN2, OUTPUT);
  pinMode(MOTOR_IN3, OUTPUT);
  pinMode(MOTOR_IN4, OUTPUT);

  pinMode(IR_PASSAGEM_PIN, INPUT);
  pinMode(IR_RETIRADA_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  desligarMotor();
  digitalWrite(BUZZER_PIN, LOW);

  Wire.begin(21, 22);

  lcd.init();
  lcd.backlight();
  showLcd("MedCare IoT", "Iniciando...");

  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);

  mqttClient.setServer(MQTT_HOST, MQTT_PORT);
  mqttClient.setCallback(handleMqttMessage);
  mqttClient.setBufferSize(1024);

  Serial.println("==========================================");
  Serial.println("MedCare IoT iniciado.");
  Serial.println("Comandos MQTT aceitos:");
  Serial.println("{\"type\":\"BUZZER_TEST\"}");
  Serial.println("{\"type\":\"RELEASE_DOSE\"}");
  Serial.println("{\"type\":\"RELEASE_DOSE\", \"compartment\": 3}");
  Serial.println("{\"type\":\"CONFIRM_REMOVAL\"}");
  Serial.println("==========================================");

  ensureWifiConnected();

  if (ENABLE_STARTUP_MOTOR_TEST) {
    delay(3000);

    Serial.println("[TESTE] Girando motor automaticamente ao iniciar.");

    girarUmCompartimento();

    publishEvent("STARTUP_MOTOR_TEST_EXECUTED", "Motor girou automaticamente no inicio.");
  }
}

// ============================================================================
// LOOP
// ============================================================================

void loop() {
  ensureWifiConnected();
  ensureMqttConnected();

  if (mqttClient.connected()) {
    mqttClient.loop();
  }

  processarIrPassagem();
  processarIrRetirada();
  desligarBuzzerSeNecessario();

  if (mqttClient.connected() && millis() - lastHeartbeatMs >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeatMs = millis();
    publishStatus("Heartbeat do ESP32.");
  }

  delay(20);
}