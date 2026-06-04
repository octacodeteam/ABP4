import mqtt, { MqttClient } from 'mqtt';
import { EventEmitter } from 'node:events';

export type DeviceEvent = {
  deviceCode: string;
  type: string;
  message?: string;
  sequence?: number;
  millis?: number;
  irState?: number;
  waitingRemoval?: boolean;
  source?: string;
  receivedAt: string;
  raw: unknown;
};

export type DeviceState = {
  deviceCode: string;
  online: boolean;
  lastStatus?: unknown;
  lastEvent?: DeviceEvent;
  waitingRemoval: boolean;
  dosePassed: boolean;
  doseRemoved: boolean;
  updatedAt: string;
};

type MqttBridgeConfig = {
  brokerUrl: string;
  topicPrefix: string;
};

export class MqttBridge extends EventEmitter {
  private client?: MqttClient;
  private readonly states = new Map<string, DeviceState>();

  constructor(private readonly config: MqttBridgeConfig) {
    super();
  }
  
  connect(): void {
  console.log('[MQTT] Broker configurado:', this.config.brokerUrl);
  console.log('[MQTT] Prefixo configurado:', this.config.topicPrefix);
  this.client = mqtt.connect(this.config.brokerUrl, {
    clientId: `medcare-backend-${Date.now()}`,
    reconnectPeriod: 3000,
    connectTimeout: 15000,
    keepalive: 30,
    clean: true,
  });

  this.client.on('connect', () => {
    console.log('[MQTT] Backend conectado ao broker.');

    const eventsTopic = `${this.config.topicPrefix}/+/events`;
    const statusTopic = `${this.config.topicPrefix}/+/status`;

    this.client?.subscribe(eventsTopic, (error) => {
      if (error) {
        console.error('[MQTT] Erro ao assinar tópico de eventos:', error);
        return;
      }

      console.log(`[MQTT] Subscrito em: ${eventsTopic}`);
    });

    this.client?.subscribe(statusTopic, (error) => {
      if (error) {
        console.error('[MQTT] Erro ao assinar tópico de status:', error);
        return;
      }

      console.log(`[MQTT] Subscrito em: ${statusTopic}`);
    });
  });

  this.client.on('message', (topic, payload) => {
    try {
      this.handleMessage(topic, payload);
    } catch (error) {
      console.error('[MQTT] Erro processando mensagem:', error);
      console.error('[MQTT] Tópico:', topic);
      console.error('[MQTT] Payload:', payload.toString('utf8'));
    }
  });

  this.client.on('error', (error) => {
    console.error('[MQTT] Erro detalhado:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      raw: error,
    });
  });

  this.client.on('offline', () => {
    console.warn('[MQTT] Backend ficou offline do broker.');
  });

  this.client.on('close', () => {
    console.warn('[MQTT] Conexão MQTT fechada. Tentando reconectar...');
  });

  this.client.on('reconnect', () => {
    console.log('[MQTT] Tentando reconectar ao broker...');
  });
}

  getDeviceState(deviceCode: string): DeviceState | null {
    return this.states.get(deviceCode) ?? null;
  }

  getAllStates(): DeviceState[] {
    return Array.from(this.states.values());
  }

  publishCommand(deviceCode: string, command: Record<string, unknown>): void {
    if (!this.client?.connected) {
      throw new Error('MQTT não está conectado.');
    }

    const topic = `${this.config.topicPrefix}/${deviceCode}/commands`;
    const payload = JSON.stringify(command);

    this.client.publish(topic, payload, { qos: 0, retain: false });
  }

  private handleMessage(topic: string, payload: Buffer): void {
    const parsed = this.safeParseJson(payload);

    const topicParts = topic.split('/');
    const deviceCode = topicParts[topicParts.length - 2];
    const kind = topicParts[topicParts.length - 1];

    if (!deviceCode) return;

    if (kind === 'status') {
      this.handleStatus(deviceCode, parsed);
      return;
    }

    if (kind === 'events') {
      this.handleEvent(deviceCode, parsed);
    }
  }

  private handleStatus(deviceCode: string, raw: unknown): void {
  const data = this.asRecord(raw);

  const current = this.ensureState(deviceCode);

  current.online = true;
  current.lastStatus = raw;
  current.updatedAt = new Date().toISOString();

  if (typeof data.waitingRemoval === 'boolean') {
    current.waitingRemoval = data.waitingRemoval;
  }

  if (typeof data.aguardandoRetirada === 'boolean') {
    current.waitingRemoval = data.aguardandoRetirada;
  }

  this.states.set(deviceCode, current);
  this.emit('state', current);
}

  private handleEvent(deviceCode: string, raw: unknown): void {
  const data = this.asRecord(raw);

  const waitingRemovalValue =
    typeof data.waitingRemoval === 'boolean'
      ? data.waitingRemoval
      : typeof data.aguardandoRetirada === 'boolean'
        ? data.aguardandoRetirada
        : undefined;

  const event: DeviceEvent = {
    deviceCode,
    type: String(data.type ?? 'UNKNOWN'),
    message: typeof data.message === 'string' ? data.message : undefined,
    sequence: typeof data.sequence === 'number' ? data.sequence : undefined,
    millis: typeof data.millis === 'number' ? data.millis : undefined,
    irState: typeof data.irState === 'number' ? data.irState : undefined,
    waitingRemoval: waitingRemovalValue,
    source: typeof data.source === 'string' ? data.source : undefined,
    receivedAt: new Date().toISOString(),
    raw,
  };

  const current = this.ensureState(deviceCode);

  current.online = true;
  current.lastEvent = event;
  current.updatedAt = event.receivedAt;

  if (event.type === 'DOSE_PASSED_DISPENSER') {
    current.dosePassed = true;
    current.doseRemoved = false;
    current.waitingRemoval = true;
  }

  if (event.type === 'DOSE_WAITING_REMOVAL') {
    current.waitingRemoval = true;
  }

  if (event.type === 'DOSE_REMOVED_FROM_RECIPIENT') {
    current.doseRemoved = true;
    current.waitingRemoval = false;
  }

  if (typeof waitingRemovalValue === 'boolean') {
    current.waitingRemoval = waitingRemovalValue;
  }

  this.states.set(deviceCode, current);

  this.emit('event', event);
  this.emit('state', current);

  console.log('[MQTT] Evento recebido:', event);
}

  private ensureState(deviceCode: string): DeviceState {
    return (
      this.states.get(deviceCode) ?? {
        deviceCode,
        online: false,
        waitingRemoval: false,
        dosePassed: false,
        doseRemoved: false,
        updatedAt: new Date().toISOString(),
      }
    );
  }

  private safeParseJson(payload: Buffer): unknown {
    try {
      return JSON.parse(payload.toString('utf8'));
    } catch {
      return { rawText: payload.toString('utf8') };
    }
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    return {};
  }
}

export const mqttBridge = new MqttBridge({
  brokerUrl: process.env.MQTT_BROKER_URL ?? 'mqtt://broker.hivemq.com:1883',
  topicPrefix: process.env.MQTT_TOPIC_PREFIX ?? 'medcare/abp4/grupo01',
});