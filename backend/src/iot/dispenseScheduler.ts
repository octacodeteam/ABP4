import { PrismaClient } from '@prisma/client';
import type { MqttBridge } from './mqttBridge';

const CHECK_INTERVAL_MS = 5000;

/**
 * Retorna o começo do minuto atual.
 * Exemplo: 15:46:00.000
 */
function startOfCurrentMinute() {
  const now = new Date();
  now.setSeconds(0, 0);
  return now;
}

/**
 * Retorna o fim do minuto atual.
 * Exemplo: 15:46:59.999
 */
function endOfCurrentMinute() {
  const now = new Date();
  now.setSeconds(59, 999);
  return now;
}

/**
 * Scheduler automático de doses.
 *
 * A cada 5 segundos ele procura no banco:
 * - slots PENDING
 * - de ciclos ACTIVE
 * - cujo scheduledAt está dentro do minuto atual
 *
 * Quando encontra, ele envia RELEASE_DOSE via MQTT para o ESP32.
 */
export function startDispenseScheduler(prisma: PrismaClient, mqttBridge: MqttBridge) {
  console.log('[SCHEDULER] Agendador de doses iniciado.');

  setInterval(async () => {
    try {
      const from = startOfCurrentMinute();
      const to = endOfCurrentMinute();

      const dueSlots = await prisma.refillSlot.findMany({
        where: {
          status: 'PENDING',
          scheduledAt: {
            gte: from,
            lte: to,
          },
          cycle: {
            status: 'ACTIVE',
          },
        },
        include: {
          device: true,
          patient: true,
        },
      });

      if (dueSlots.length === 0) {
        return;
      }

      for (const slot of dueSlots) {
        console.log('[SCHEDULER] Dose encontrada para liberar:', {
          slotId: slot.id,
          deviceCode: slot.device.deviceCode,
          compartment: slot.compartmentNumber,
          scheduledAt: slot.scheduledAt,
        });

        const payload = {
          type: 'RELEASE_DOSE',
          compartment: slot.compartmentNumber,
          refillSlotId: slot.id,
          source: 'scheduler',
          sentAt: new Date().toISOString(),
        };

        mqttBridge.publishCommand(slot.device.deviceCode, payload);

        await prisma.deviceCommand.create({
          data: {
            deviceId: slot.deviceId,
            patientId: slot.patientId,
            refillSlotId: slot.id,
            commandType: 'DISPENSE_SLOT',
            payload,
            status: 'SENT',
            sentAt: new Date(),
          },
        });

        await prisma.refillSlot.update({
          where: {
            id: slot.id,
          },
          data: {
            status: 'COMMAND_SENT',
          },
        });

        console.log('[SCHEDULER] Comando enviado ao ESP32:', payload);
      }
    } catch (error) {
      console.error('[SCHEDULER] Erro ao verificar doses:', error);
    }
  }, CHECK_INTERVAL_MS);
}