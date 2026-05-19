import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { BellOff, Clock, Settings, Sun } from 'lucide-react';
import { api } from '../api';
import type { PatientPreference, Role } from '../types';

interface Props {
  token: string;
  patientId: string;
  role: Role;
}

export default function Profile({ token, patientId, role }: Props) {
  const [preference, setPreference] = useState<PatientPreference>({
    patientId,
    sleepTime: '22:00',
    wakeTime: '06:00',
    alarmVolume: 80,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const isCaregiver = role === 'caregiver';

  useEffect(() => {
    setError('');
    setSuccess('');
    api.getPreferences(token, patientId)
      .then(setPreference)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar preferências.'));
  }, [patientId]);

  const handleSubmit = async () => {
    if (!isCaregiver) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const updated = await api.updatePreferences(token, patientId, { ...preference, patientId });
      setPreference(updated);
      setSuccess('Preferências salvas. Um ciclo ativo anterior será cancelado para evitar abastecimento incoerente.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar preferências.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="pb-2">
        <h1 className="text-3xl font-extrabold text-app-primary">Preferências</h1>
        <p className="text-lg text-app-text-secondary font-medium opacity-70">Configurações do ciclo do paciente</p>
      </header>

      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-xl text-app-primary"><Sun size={28} /></div>
          <h2 className="text-2xl font-black text-app-text-primary">Começo do dia do paciente</h2>
        </div>

        <div className="bg-app-card border-2 border-app-border rounded-3xl p-6 shadow-sm space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-black text-app-text-secondary uppercase tracking-widest"><Clock size={16} /> Horário em que acorda</label>
              <input type="time" disabled={!isCaregiver} className="w-full h-20 px-6 bg-app-bg border-2 border-app-border rounded-2xl text-3xl font-black text-center text-app-primary focus:border-app-primary outline-none disabled:opacity-70" value={preference.wakeTime} onChange={(event) => setPreference({ ...preference, wakeTime: event.target.value })} />
              <p className="text-sm font-bold text-app-text-secondary">Este horário vira o início do ciclo de 24 horas. Exemplo: 06:00 até 05:59 do dia seguinte.</p>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-black text-app-text-secondary uppercase tracking-widest"><BellOff size={16} /> Horário de referência para dormir</label>
              <input type="time" disabled={!isCaregiver} className="w-full h-20 px-6 bg-app-bg border-2 border-app-border rounded-2xl text-3xl font-black text-center text-app-primary focus:border-app-primary outline-none disabled:opacity-70" value={preference.sleepTime} onChange={(event) => setPreference({ ...preference, sleepTime: event.target.value })} />
              <p className="text-sm font-bold text-app-text-secondary">Mantido para exibição e futuras regras de silêncio. O serviço pode funcionar 24h.</p>
            </div>
          </div>

          <div className="p-5 bg-blue-50 border-2 border-app-primary rounded-2xl">
            <p className="text-lg font-bold text-app-primary leading-tight">
              O plano de abastecimento usa o horário em que o paciente acorda como ponto zero. Isso permite montar um ciclo completo de 24h e distribuir as dosagens nos 8 compartimentos.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xs uppercase font-black text-app-text-secondary tracking-widest">Outras Opções</h3>
        <div className="w-full p-6 bg-app-card border-2 border-app-border rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500"><Settings size={28} /></div>
            <span className="text-2xl font-black text-app-text-primary">Volume do Alarme</span>
          </div>
          <div className="flex items-center gap-4">
            <input disabled={!isCaregiver} type="range" min={0} max={100} value={preference.alarmVolume} onChange={(event) => setPreference({ ...preference, alarmVolume: Number(event.target.value) })} className="w-full md:w-48 disabled:opacity-70" />
            <span className="text-2xl font-black text-app-primary min-w-16 text-right">{preference.alarmVolume}%</span>
          </div>
        </div>
      </section>

      {!isCaregiver && (
        <div className="p-5 bg-slate-50 border-2 border-app-border rounded-3xl font-black text-app-text-secondary">
          Área somente visual para paciente. Alterações de horários e alarmes são feitas pelo cuidador.
        </div>
      )}

      {error && <div className="p-4 bg-red-50 border-2 border-app-danger text-app-danger rounded-2xl font-black">{error}</div>}
      {success && <div className="p-4 bg-green-50 border-2 border-app-success text-app-success rounded-2xl font-black">{success}</div>}

      {isCaregiver && (
        <div className="pt-4 pb-8">
          <motion.button whileTap={{ scale: 0.98 }} disabled={loading} onClick={handleSubmit} className="w-full p-6 bg-app-primary text-white rounded-3xl text-2xl font-black shadow-xl shadow-blue-200 transition-all active:bg-blue-700 disabled:opacity-60">
            {loading ? 'Salvando...' : 'Salvar Preferências'}
          </motion.button>
        </div>
      )}
    </div>
  );
}
