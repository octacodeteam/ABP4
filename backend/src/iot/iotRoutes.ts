import { Router } from 'express';
import type { Request, Response } from 'express';
import type { MqttBridge, DeviceEvent, DeviceState } from './mqttBridge';
import type { PrismaClient } from '@prisma/client';

export function createIotRouter(mqttBridge: MqttBridge, prisma: PrismaClient): Router {
  const router = Router();

  router.get('/devices', (_req: Request, res: Response) => {
    res.json({
      devices: mqttBridge.getAllStates(),
    });
  });

  router.get('/devices/:deviceCode/state', (req: Request, res: Response) => {
    const state = mqttBridge.getDeviceState(req.params.deviceCode);

    if (!state) {
      res.status(404).json({
        error: 'DEVICE_NOT_FOUND',
        message: 'Ainda não chegou nenhum evento/status MQTT deste dispositivo.',
      });
      return;
    }

    res.json(state);
  });

  router.post('/devices/:deviceCode/commands/buzzer-test', (req: Request, res: Response) => {
    mqttBridge.publishCommand(req.params.deviceCode, {
      type: 'BUZZER_TEST',
      sentAt: new Date().toISOString(),
    });

    res.json({ ok: true });
  });

  router.post('/devices/:deviceCode/commands/confirm-removal', (req: Request, res: Response) => {
    mqttBridge.publishCommand(req.params.deviceCode, {
      type: 'CONFIRM_REMOVAL',
      sentAt: new Date().toISOString(),
    });

    res.json({ ok: true });
  });

  router.post('/devices/:deviceCode/commands/release-dose', async (req: Request, res: Response) => {
  try {
    const { deviceCode } = req.params;

    const refillSlotId =
      typeof req.body?.refillSlotId === 'string'
        ? req.body.refillSlotId
        : undefined;

    let compartment =
      typeof req.body?.compartment === 'number'
        ? req.body.compartment
        : Number(req.body?.compartment);

    /**
     * Se o frontend não mandar compartment, mas mandar refillSlotId,
     * o backend busca o compartimento correto no banco.
     */
    if ((!Number.isInteger(compartment) || compartment < 1 || compartment > 8) && refillSlotId) {
      const slot = await prisma.refillSlot.findUnique({
        where: {
          id: refillSlotId,
        },
        select: {
          compartmentNumber: true,
        },
      });

      if (slot) {
        compartment = slot.compartmentNumber;
      }
    }

    if (!Number.isInteger(compartment) || compartment < 1 || compartment > 8) {
      res.status(400).json({
        message: 'Compartimento inválido. Use um número de 1 a 8.',
      });
      return;
    }

    const command = {
      type: 'RELEASE_DOSE',
      compartment,
      refillSlotId,
      source: 'frontend',
      sentAt: new Date().toISOString(),
    };

    mqttBridge.publishCommand(deviceCode, command);

    res.json({
      ok: true,
      message: `Comando enviado ao ESP32 para liberar o compartimento ${compartment}.`,
      deviceCode,
      command,
    });
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Erro ao enviar comando ao ESP32.',
    });
  }
});

  router.get('/devices/:deviceCode/events/stream', (req: Request, res: Response) => {
    const { deviceCode } = req.params;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendState = (state: DeviceState) => {
      if (state.deviceCode !== deviceCode) return;

      res.write(`event: state\n`);
      res.write(`data: ${JSON.stringify(state)}\n\n`);
    };

    const sendEvent = (event: DeviceEvent) => {
      if (event.deviceCode !== deviceCode) return;

      res.write(`event: device-event\n`);
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    const initialState = mqttBridge.getDeviceState(deviceCode);
    if (initialState) {
      sendState(initialState);
    }

    mqttBridge.on('state', sendState);
    mqttBridge.on('event', sendEvent);

    req.on('close', () => {
      mqttBridge.off('state', sendState);
      mqttBridge.off('event', sendEvent);
    });
  });

  return router;
}