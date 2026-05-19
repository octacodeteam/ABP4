import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Bell, CheckCircle2, RefreshCw } from 'lucide-react';
import { api } from '../api';
import type { AlertItem } from '../types';

interface Props {
  token: string;
  patientId: string;
}

function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 1) return 'Agora';
  if (minutes < 60) return `Há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Há ${hours}h`;
  return new Date(value).toLocaleDateString('pt-BR');
}

function normalizeType(type: string) {
  return type.toUpperCase();
}

export default function Alerts({ token, patientId }: Props) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const loadAlerts = async () => {
    setError('');
    try {
      const items = await api.getAlerts(token, patientId);
      setAlerts(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar alertas.');
    }
  };

  useEffect(() => {
    setSuccess('');
    loadAlerts();
  }, [patientId]);

  const handleResolve = async (alert: AlertItem) => {
    // Alertas gerados automaticamente pelo backend possuem id começando com "generated-".
    // Eles somem quando a causa é resolvida, então não dá para marcá-los como resolvidos manualmente.
    if (alert.id.startsWith('generated-')) {
      setSuccess('Este alerta é automático. Ele desaparecerá quando a causa for resolvida.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.resolveAlert(token, alert.id);
      setSuccess('Alerta marcado como resolvido.');
      await loadAlerts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao resolver alerta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="pb-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-app-primary">Alertas</h1>
          <p className="text-lg text-app-text-secondary font-medium opacity-70">Central de monitoramento real</p>
        </div>
        <button onClick={loadAlerts} className="p-3 bg-app-card border-2 border-app-border rounded-2xl text-app-primary" title="Atualizar alertas">
          <RefreshCw size={22} />
        </button>
      </header>

      {error && <div className="p-4 bg-red-50 border-2 border-app-danger text-app-danger rounded-2xl font-black">{error}</div>}
      {success && <div className="p-4 bg-green-50 border-2 border-app-success text-app-success rounded-2xl font-black">{success}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {alerts.map((alert, index) => {
          const type = normalizeType(String(alert.type));
          const isDanger = type === 'DANGER';
          const isInfo = type === 'INFO';
          const isGenerated = alert.id.startsWith('generated-');
          return (
            <motion.div key={alert.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.06 }} className="space-y-2">
              <div className={`inline-block px-3 py-1 rounded-lg font-bold text-sm border-2 ${
                isDanger ? 'bg-red-50 text-app-danger border-app-danger' : isInfo ? 'bg-blue-50 text-app-primary border-app-primary' : 'bg-orange-50 text-app-warning border-app-warning'
              }`}>
                {isDanger ? '⚠️ ' : isInfo ? 'ℹ️ ' : '🔔 '}{alert.title}
              </div>
              
              <div className={`p-6 rounded-3xl border-2 bg-app-card flex-1 shadow-sm ${isDanger ? 'border-app-danger' : isInfo ? 'border-app-primary' : 'border-app-warning'}`}>
                <p className="text-app-text-primary font-bold text-xl leading-tight mb-4">{alert.desc}</p>
                <p className="text-sm font-black uppercase tracking-widest text-app-text-secondary mb-4">{timeAgo(alert.createdAt)}</p>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleResolve(alert)}
                  className={`w-full p-4 border-2 rounded-2xl font-black text-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60 ${isDanger ? 'border-app-danger text-app-danger' : isInfo ? 'border-app-primary text-app-primary' : 'border-app-warning text-app-warning'}`}
                >
                  <CheckCircle2 size={20} />
                  {isGenerated ? 'Alerta automático' : 'Marcar como resolvido'}
                </button>
              </div>
            </motion.div>
          );
        })}

        {alerts.length === 0 && !error && (
          <div className="col-span-full p-8 bg-app-card border-2 border-app-border rounded-3xl text-center font-black text-app-text-secondary flex flex-col items-center gap-3">
            <Bell size={42} />
            Nenhum alerta ativo no momento.
          </div>
        )}
      </div>
    </div>
  );
}
