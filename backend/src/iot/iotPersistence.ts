import type { PrismaClient } from '@prisma/client';

type Esp32Event = {
  deviceCode: string;
  type: string;
  raw: unknown;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function mapDeviceEventType(type: string) {
  if (type === 'DOSE_PASSED_DISPENSER') {
    return 'SENSOR_DETECTED' as const;
  }

  if (type === 'DOSE_WAITING_REMOVAL') {
    return 'SENSOR_DETECTED' as const;
  }

  if (type === 'DOSE_REMOVED_FROM_RECIPIENT') {
    return 'DOSE_TAKEN' as const;
  }

  if (type === 'BUZZER_TEST_EXECUTED') {
    return 'COMMAND_ACK' as const;
  }

  return 'HEARTBEAT' as const;
}

/**
 * Atualiza o dispositivo como ONLINE sempre que chega qualquer estado/evento MQTT.
 */
export async function markDeviceOnlineFromMqtt(
  prisma: PrismaClient,
  deviceCode: string,
  raw?: unknown
) {
  const data = asRecord(raw);

  const currentCompartment =
    typeof data.currentCompartment === 'number'
      ? data.currentCompartment
      : undefined;

  await prisma.device.updateMany({
    where: {
      deviceCode,
    },
    data: {
      status: 'ONLINE',
      lastSeenAt: new Date(),
      ...(currentCompartment
        ? { currentCompartment }
        : {}),
    },
  });
}

/**
 * Salva eventos físicos do ESP32 no banco.
 *
 * Exemplo:
 * - DOSE_PASSED_DISPENSER vira DeviceEvent SENSOR_DETECTED
 * - DOSE_REMOVED_FROM_RECIPIENT vira DeviceEvent DOSE_TAKEN
 */
export async function persistEsp32Event(
  prisma: PrismaClient,
  event: Esp32Event
) {
  const device = await prisma.device.findUnique({
    where: {
      deviceCode: event.deviceCode,
    },
  });

  if (!device) {
    console.warn('[IOT_DB] Dispositivo não encontrado no banco:', event.deviceCode);
    return;
  }

  await markDeviceOnlineFromMqtt(prisma, event.deviceCode, event.raw);

  const raw = asRecord(event.raw);

  const refillSlotId =
    typeof raw.refillSlotId === 'string'
      ? raw.refillSlotId
      : undefined;

  let slotIdToUpdate: string | undefined = refillSlotId;

  /**
   * Se o ESP32 não mandou refillSlotId, procuramos o slot mais recente
   * que recebeu comando e ainda não foi finalizado.
   */
  if (!slotIdToUpdate) {
    const candidateSlot = await prisma.refillSlot.findFirst({
      where: {
        deviceId: device.id,
        status: {
          in: ['COMMAND_SENT', 'RELEASED'],
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    slotIdToUpdate = candidateSlot?.id;
  }

  await prisma.deviceEvent.create({
    data: {
      deviceId: device.id,
      refillSlotId: slotIdToUpdate,
      eventType: mapDeviceEventType(event.type),
      payload: event.raw as object,
    },
  });

  if (slotIdToUpdate && event.type === 'DOSE_PASSED_DISPENSER') {
    await prisma.refillSlot.update({
      where: {
        id: slotIdToUpdate,
      },
      data: {
        status: 'RELEASED',
        releasedAt: new Date(),
      },
    });
  }

  if (slotIdToUpdate && event.type === 'DOSE_REMOVED_FROM_RECIPIENT') {
    await prisma.refillSlot.update({
      where: {
        id: slotIdToUpdate,
      },
      data: {
        status: 'TAKEN',
        confirmedAt: new Date(),
      },
    });
  }
}