import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, Pill, RefreshCw, Zap } from 'lucide-react';
import { api } from '../api';
import type { DashboardData } from '../types';

interface Props {
  token: string;
  patientId: string;
}

/**
 * Dashboard Component: Main screen for the patient.
 * Accessibility Features:
 * - Large "Next Medication" card with high contrast.
 * - Font sizes starting at 18px (text-lg) up to 36px (text-4xl).
 * - High contrast colors (Blue for primary, Slate for text).
 * - Clear status indicators.
 */
export default function Dashboard({ token, patientId }: Props) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [dispensing, setDispensing] = useState(false);

  const loadDashboard = async () => {
    setError('');
    try {
      const dashboard = await api.getDashboard(token, patientId);
      setData(dashboard);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dashboard.');
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [patientId]);

  const handleDispense = async () => {
    if (!data?.nextMedication) return;
    setDispensing(true);
    setError('');
    try {
      await api.dispense(token, {
        patientId,
        compartment: data.nextMedication.compartment,
      });
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar comando para o dispenser.');
    } finally {
      setDispensing(false);
    }
  };

  if (error) {
    return <div className="p-6 bg-red-50 border-2 border-app-danger rounded-3xl text-app-danger font-black">{error}</div>;
  }

  if (!data) {
    return <div className="p-6 bg-app-card border-2 border-app-border rounded-3xl font-black text-app-primary">Carregando dashboard...</div>;
  }

  const nextMed = data.nextMedication;

  return (
    <div className="space-y-10">
      <header className="pb-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-app-primary">Olá, {data.patient.name}</h1>
          <p className="text-lg text-app-text-secondary font-medium opacity-70">Status do Dispositivo IoT</p>
        </div>
        <button onClick={loadDashboard} className="p-3 bg-app-card border-2 border-app-border rounded-2xl text-app-primary">
          <RefreshCw size={22} />
        </button>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-app-card border-2 border-app-border rounded-3xl p-6 shadow-sm">
          <p className="text-xs uppercase font-black text-app-text-secondary tracking-widest">Medicamentos</p>
          <p className="text-4xl font-black text-app-primary mt-2">{data.medicationsCount}</p>
          <p className="text-base font-bold text-app-text-secondary mt-1">ativos para este paciente</p>
        </div>
        <div className="bg-app-card border-2 border-app-border rounded-3xl p-6 shadow-sm">
          <p className="text-xs uppercase font-black text-app-text-secondary tracking-widest">Alertas</p>
          <p className="text-4xl font-black text-app-warning mt-2">{data.alertsCount}</p>
          <p className="text-base font-bold text-app-text-secondary mt-1">necessitam atenção</p>
        </div>
      </section>

      <section className="space-y-2">
        <span className="text-xs uppercase font-bold text-app-text-secondary tracking-widest block">Próximo Remédio</span>
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-app-primary rounded-3xl p-6 text-white shadow-lg"
        >
          {nextMed ? (
            <>
              <div className="inline-block px-3 py-1 rounded-full bg-white/20 text-xs font-bold mb-3">
                {nextMed.time} • Compartimento {nextMed.compartment}
              </div>
              <h2 className="text-3xl font-black mb-1">{nextMed.name}</h2>
              <p className="text-xl font-bold opacity-90 mb-4">{nextMed.dosage}</p>
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
                <div className="font-black text-sm tracking-wide uppercase">Aguardando horário programado</div>
                <button
                  onClick={handleDispense}
                  disabled={dispensing}
                  className="bg-white text-app-primary rounded-2xl px-5 py-3 font-black flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Zap size={18} /> {dispensing ? 'Enviando...' : 'Dispensar agora'}
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <Pill size={42} />
              <div>
                <h2 className="text-3xl font-black mb-1">Nenhum remédio cadastrado</h2>
                <p className="text-xl font-bold opacity-90">Cadastre um medicamento para iniciar o planejamento.</p>
              </div>
            </div>
          )}
        </motion.div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-xs uppercase font-bold text-app-text-secondary tracking-widest">Plano de Abastecimento (7 Gavetas)</h3>
          <span className="text-[10px] font-black bg-red-100 text-app-danger px-2 py-1 rounded uppercase">Automação ativa</span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {data.refillPlan.map((slot) => (
            <div 
              key={`${slot.time}-${slot.compartment}`}
              className="bg-app-card border-2 border-app-border p-4 rounded-2xl space-y-2 relative overflow-hidden shadow-sm"
            >
              <div className="absolute top-0 right-0 p-1 bg-app-bg text-[10px] font-black text-app-text-secondary rounded-bl-lg">
                C{slot.compartment}
              </div>
              <p className="text-2xl font-black text-app-primary">{slot.time}</p>
              <p className="text-base font-black text-app-text-primary leading-tight">{slot.meds}</p>
              <p className="text-[10px] font-bold text-app-text-secondary uppercase">{slot.desc}</p>
            </div>
          ))}
          {data.refillPlan.length === 0 && (
            <div className="col-span-full bg-app-card border-2 border-dashed border-app-border p-6 rounded-2xl text-center font-black text-app-text-secondary">
              Sem plano de abastecimento. Cadastre medicamentos para preencher as gavetas.
            </div>
          )}
        </div>
      </section>

      <div className="p-6 bg-orange-50 border-2 border-app-warning rounded-2xl flex gap-4 items-center">
        <div className="w-12 h-12 rounded-full bg-orange-100 text-app-warning flex items-center justify-center shrink-0">
          <AlertCircle size={24} />
        </div>
        <div>
          <p className="text-lg font-bold text-orange-900 leading-tight">
            O backend agora calcula a próxima dose e o plano de compartimentos a partir dos medicamentos cadastrados.
          </p>
        </div>
      </div>
    </div>
  );
}
