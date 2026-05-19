import { Router } from 'express';
import type { Request, Response } from 'express';
import type { MqttBridge, DeviceEvent, DeviceState } from './mqttBridge';

export function createIotRouter(mqttBridge: MqttBridge): Router {
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