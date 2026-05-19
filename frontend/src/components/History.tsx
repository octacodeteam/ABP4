import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { api } from '../api';
import type { HistoryEvent } from '../types';

interface Props {
  token: string;
  patientId: string;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function getStatusIcon(status: string) {
  if (status === 'TAKEN') return <CheckCircle2 size={24} />;
  if (status === 'MISSED' || status === 'FAILED') return <XCircle size={24} />;
  return <Clock size={24} />;
}

function getStatusClass(status: string) {
  if (status === 'TAKEN') return 'text-app-success border-app-success';
  if (status === 'MISSED' || status === 'FAILED') return 'text-app-danger border-app-danger';
  return 'text-app-warning border-app-warning';
}

export default function History({ token, patientId }: Props) {
  const [historyData, setHistoryData] = useState<HistoryEvent[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    api.getHistory(token, patientId)
      .then(setHistoryData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar histórico.'));
  }, [patientId]);

  return (
    <div className="space-y-6">
      <header className="pb-2">
        <h1 className="text-3xl font-extrabold text-app-primary">Atividade</h1>
        <p className="text-lg text-app-text-secondary font-medium opacity-70">Histórico real dos compartimentos liberados</p>
      </header>

      {error && <div className="p-4 bg-red-50 border-2 border-app-danger text-app-danger rounded-2xl font-black">{error}</div>}

      <div className="space-y-0">
        {historyData.map((item, index) => {
          const statusClass = getStatusClass(String(item.status));
          return (
            <motion.div key={item.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }} className={`relative pl-10 pb-10 border-l-4 ${statusClass.split(' ')[1]} last:border-0`}>
              <div className={`absolute -left-[14px] top-0 w-6 h-6 rounded-full bg-white border-4 ${statusClass.split(' ')[1]}`} />

              <div className="space-y-2">
                <div className="text-sm font-bold text-app-text-secondary uppercase tracking-widest">
                  {formatDateTime(item.scheduledAt)} • Compartimento {item.compartment}
                </div>
                <div className={`text-xl font-black flex items-center gap-2 ${statusClass.split(' ')[0]}`}>
                  {getStatusIcon(String(item.status))} {item.statusLabel}
                </div>
                <div className="bg-app-card border-2 border-app-border rounded-2xl p-4 space-y-2">
                  {item.items.map((med) => (
                    <p key={`${item.id}-${med.medicationId}`} className="text-base font-black text-app-text-primary">
                      {med.name} <span className="font-bold text-app-text-secondary">— {med.dosage}</span>
                    </p>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })}

        {historyData.length === 0 && !error && (
          <div className="p-8 bg-app-card border-2 border-app-border rounded-3xl text-center font-black text-app-text-secondary flex flex-col items-center gap-3">
            <AlertTriangle size={40} />
            Nenhum histórico disponível ainda. Ele só aparecerá após o cuidador confirmar um abastecimento e o ESP32 reportar eventos reais.
          </div>
        )}
      </div>
    </div>
  );
}
