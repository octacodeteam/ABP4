import { useEffect, useState } from 'react';

type DeviceState = {
  deviceCode: string;
  online: boolean;
  waitingRemoval: boolean;
  dosePassed: boolean;
  doseRemoved: boolean;
  updatedAt: string;
  lastEvent?: {
    type: string;
    message?: string;
    receivedAt: string;
  };
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:3001';

type Props = {
  deviceCode?: string;
};

export function DeviceLiveTest({ deviceCode = 'esp32-001' }: Props) {
  const [state, setState] = useState<DeviceState | null>(null);
  const [message, setMessage] = useState('Aguardando eventos do ESP32...');

  async function loadState() {
    const response = await fetch(`${API_BASE_URL}/api/iot/devices/${deviceCode}/state`);

    if (!response.ok) {
      setMessage('Ainda não chegou nenhum evento MQTT deste ESP32.');
      return;
    }

    const data = await response.json();
    setState(data);
    setMessage('Estado atualizado pelo backend.');
  }

  async function sendCommand(path: string) {
    const response = await fetch(`${API_BASE_URL}/api/iot/devices/${deviceCode}/commands/${path}`, {
      method: 'POST',
    });

    if (!response.ok) {
      setMessage('Falha ao enviar comando ao ESP32.');
      return;
    }

    setMessage('Comando enviado ao ESP32 via MQTT.');
  }

  useEffect(() => {
    loadState();

    const eventSource = new EventSource(
      `${API_BASE_URL}/api/iot/devices/${deviceCode}/events/stream`
    );

    eventSource.addEventListener('state', (event) => {
      setState(JSON.parse((event as MessageEvent).data));
      setMessage('Estado recebido em tempo real.');
    });

    eventSource.addEventListener('device-event', (event) => {
      const deviceEvent = JSON.parse((event as MessageEvent).data);
      setMessage(`Evento recebido: ${deviceEvent.type}`);
    });

    eventSource.onerror = () => {
      setMessage('Conexão em tempo real indisponível. Use o botão Atualizar.');
    };

    return () => {
      eventSource.close();
    };
  }, [deviceCode]);

  return (
    <section style={{ padding: 16, border: '1px solid #ddd', borderRadius: 12 }}>
      <h2>Teste ESP32 + MQTT</h2>

      <p>
        <strong>Dispositivo:</strong> {deviceCode}
      </p>

      <p>{message}</p>

      {!state ? (
        <p>Nenhum estado recebido ainda.</p>
      ) : (
        <div>
          <p>
            <strong>Status:</strong> {state.online ? 'Online' : 'Offline'}
          </p>

          <p>
            <strong>Remédio passou pelo dispenser:</strong>{' '}
            {state.dosePassed ? 'Sim' : 'Ainda não'}
          </p>

          <p>
            <strong>Aguardando retirada:</strong>{' '}
            {state.waitingRemoval ? 'Sim' : 'Não'}
          </p>

          <p>
            <strong>Idoso/paciente retirou do recipiente:</strong>{' '}
            {state.doseRemoved ? 'Sim' : 'Ainda não confirmado'}
          </p>

          <p>
            <strong>Última atualização:</strong>{' '}
            {new Date(state.updatedAt).toLocaleString()}
          </p>

          {state.lastEvent && (
            <p>
              <strong>Último evento:</strong> {state.lastEvent.type} —{' '}
              {state.lastEvent.message}
            </p>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button type="button" onClick={loadState}>
          Atualizar
        </button>

        <button type="button" onClick={() => sendCommand('buzzer-test')}>
          Testar buzzer via MQTT
        </button>

        <button type="button" onClick={() => sendCommand('confirm-removal')}>
          Confirmar retirada
        </button>
      </div>
    </section>
  );
}