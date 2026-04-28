import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Moon, Sun, BellOff, Settings } from 'lucide-react';
import { api } from '../api';
import type { PatientPreference } from '../types';

interface Props {
  token: string;
  patientId: string;
}

/**
 * Profile Component: Patient Preferences and Sleep Window configuration.
 * Accessibility Features:
 * - Large time inputs for easy interaction.
 * - High contrast helper cards with clear icons.
 * - Descriptive labels and didactic helper text.
 */
export default function Profile({ token, patientId }: Props) {
  const [preference, setPreference] = useState<PatientPreference>({
    patientId,
    sleepTime: '23:00',
    wakeTime: '06:00',
    alarmVolume: 80,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setError('');
    setSuccess('');
    api.getPreferences(token, patientId)
      .then(setPreference)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar preferências.'));
  }, [patientId]);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const updated = await api.updatePreferences(token, patientId, { ...preference, patientId });
      setPreference(updated);
      setSuccess('Preferências salvas com sucesso.');
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
        <p className="text-lg text-app-text-secondary font-medium opacity-70">Configurações do Paciente</p>
      </header>

      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-xl text-app-primary">
            <Moon size={28} />
          </div>
          <h2 className="text-2xl font-black text-app-text-primary">Horário de Sono</h2>
        </div>

        <div className="bg-app-card border-2 border-app-border rounded-3xl p-6 shadow-sm space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-black text-app-text-secondary uppercase tracking-widest">
                <Moon size={16} /> Hora de Dormir
              </label>
              <input 
                type="time"
                value={preference.sleepTime}
                onChange={(e) => setPreference({ ...preference, sleepTime: e.target.value })}
                className="w-full h-24 px-8 bg-app-bg border-2 border-app-border rounded-3xl text-4xl font-black text-app-primary focus:border-app-primary outline-none transition-all shadow-inner"
              />
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-black text-app-text-secondary uppercase tracking-widest">
                <Sun size={16} /> Hora de Acordar
              </label>
              <input 
                type="time"
                value={preference.wakeTime}
                onChange={(e) => setPreference({ ...preference, wakeTime: e.target.value })}
                className="w-full h-24 px-8 bg-app-bg border-2 border-app-border rounded-3xl text-4xl font-black text-app-primary focus:border-app-primary outline-none transition-all shadow-inner"
              />
            </div>
          </div>

          <div className="p-6 bg-blue-50 rounded-3xl border-l-8 border-app-primary flex gap-4 items-start">
            <div className="text-app-primary mt-1">
              <BellOff size={28} />
            </div>
            <p className="text-xl font-bold text-app-text-primary leading-snug">
              <span className="font-black block mb-1 uppercase text-sm tracking-wider opacity-60">Janela de Silêncio</span>
              Durante este período, o alarme do dispositivo <span className="text-app-primary font-black underline decoration-4 underline-offset-4">não tocará</span> para medicamentos não críticos.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xs uppercase font-black text-app-text-secondary tracking-widest">Outras Opções</h3>
        <div className="space-y-3">
          <div className="w-full p-6 bg-app-card border-2 border-app-border rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500">
                <Settings size={28} />
              </div>
              <span className="text-2xl font-black text-app-text-primary">Volume do Alarme</span>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={0}
                max={100}
                value={preference.alarmVolume}
                onChange={(event) => setPreference({ ...preference, alarmVolume: Number(event.target.value) })}
                className="w-full md:w-48"
              />
              <span className="text-2xl font-black text-app-primary min-w-16 text-right">{preference.alarmVolume}%</span>
            </div>
          </div>
        </div>
      </section>

      {error && <div className="p-4 bg-red-50 border-2 border-app-danger text-app-danger rounded-2xl font-black">{error}</div>}
      {success && <div className="p-4 bg-green-50 border-2 border-app-success text-app-success rounded-2xl font-black">{success}</div>}

      <div className="pt-4 pb-8">
        <motion.button 
          whileTap={{ scale: 0.98 }}
          disabled={loading}
          onClick={handleSubmit}
          className="w-full p-6 bg-app-primary text-white rounded-3xl text-2xl font-black shadow-xl shadow-blue-200 transition-all active:bg-blue-700 disabled:opacity-60"
        >
          {loading ? 'Salvando...' : 'Salvar Preferências'}
        </motion.button>
      </div>
    </div>
  );
}
