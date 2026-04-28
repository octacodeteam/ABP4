import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
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

/**
 * History Component: Timeline of medication adherence.
 * Accessibility Features:
 * - High contrast color coding (Green for success, Red for missed).
 * - Large icons for status.
 * - Simplified timeline layout.
 */
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
        <p className="text-lg text-app-text-secondary font-medium opacity-70">Histórico de adesão</p>
      </header>

      {error && <div className="p-4 bg-red-50 border-2 border-app-danger text-app-danger rounded-2xl font-black">{error}</div>}

      <div className="space-y-0">
        {historyData.map((item, index) => (
          <motion.div 
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`relative pl-10 pb-10 border-l-4 ${
              item.status === 'taken' ? 'border-app-border' : 'border-app-danger'
            } last:border-0`}
          >
            <div className={`absolute -left-[14px] top-0 w-6 h-6 rounded-full bg-white border-4 ${
              item.status === 'taken' ? 'border-app-success' : 'border-app-danger'
            }`} />

            <div className="space-y-1">
              <div className="text-sm font-bold text-app-text-secondary uppercase tracking-widest">
                {formatDateTime(item.scheduledFor)} • Compartimento {item.compartment}
              </div>
              <div className={`text-xl font-black flex items-center gap-2 ${
                item.status === 'taken' ? 'text-app-success' : 'text-app-danger'
              }`}>
                {item.status === 'taken' ? (
                  <><CheckCircle2 size={24} /> Tomado</>
                ) : (
                  <><XCircle size={24} /> Atrasado</>
                )}
                <span className="text-app-text-primary font-bold">: {item.name}</span>
              </div>
              <p className="text-base font-bold text-app-text-secondary">{item.dosage}</p>
            </div>
          </motion.div>
        ))}

        {historyData.length === 0 && !error && (
          <div className="p-8 bg-app-card border-2 border-app-border rounded-3xl text-center font-black text-app-text-secondary flex flex-col items-center gap-3">
            <Clock size={40} />
            Nenhum histórico disponível ainda.
          </div>
        )}
      </div>
    </div>
  );
}
