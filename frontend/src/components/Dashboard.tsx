import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, CheckCircle2, Clock, Pill, RefreshCw, Wifi, WifiOff, Zap } from 'lucide-react';
import { api } from '../api';
import type { DashboardData, Role } from '../types';

interface Props {
  token: string;
  patientId: string;
  role: Role;
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Sem comunicação';
  return new Date(value).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    PREVIEW: 'Prévia',
    PENDING: 'Pendente',
    COMMAND_SENT: 'Comando enviado',
    RELEASED: 'Liberado',
    TAKEN: 'Retirado',
    MISSED: 'Não retirado',
    FAILED: 'Falhou',
  };
  return labels[status] || status;
}

export default function Dashboard({ token, patientId, role }: Props) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);

  const isCaregiver = role === 'caregiver';

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
    setSuccess('');
    loadDashboard();
  }, [patientId]);

  const handleConfirmRefill = async () => {
    setLoadingAction(true);
    setError('');
    setSuccess('');
    try {
      await api.confirmRefillPlan(token, patientId);
      setSuccess('Abastecimento confirmado. O ciclo ativo já está disponível para o ESP32.');
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao confirmar abastecimento.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDispenseNow = async () => {
    setLoadingAction(true);
    setError('');
    setSuccess('');
    try {
      await api.dispenseNext(token, patientId, data?.nextSlot?.id);
      setSuccess('Comando manual criado. O ESP32 executará quando buscar comandos pendentes.');
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar comando ao dispenser.');
    } finally {
      setLoadingAction(false);
    }
  };

  if (error && !data) {
    return <div className="p-6 bg-red-50 border-2 border-app-danger rounded-3xl text-app-danger font-black">{error}</div>;
  }

  if (!data) {
    return <div className="p-6 bg-app-card border-2 border-app-border rounded-3xl font-black text-app-primary">Carregando dashboard...</div>;
  }

  const nextSlot = data.nextSlot;
  const deviceOnline = data.device?.status === 'ONLINE';

  if (!isCaregiver) {
    return (
      <div className="space-y-8">
        <header className="text-center py-4">
          <h1 className="text-4xl font-black text-app-primary">Olá, {data.patient.name}</h1>
          <p className="text-xl font-bold text-app-text-secondary mt-2">Acompanhe sua próxima dose</p>
        </header>

        <section className="bg-app-primary text-white rounded-[2rem] p-8 shadow-lg space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-white/20 flex items-center justify-center">
              <Clock size={34} />
            </div>
            <div>
              <p className="text-sm uppercase font-black tracking-widest opacity-70">Próxima dose</p>
              <h2 className="text-5xl font-black">{nextSlot?.scheduledTime || '--:--'}</h2>
            </div>
          </div>

          {nextSlot ? (
            <div className="bg-white/15 rounded-3xl p-5 space-y-3">
              <p className="text-lg font-black">Compartimento {nextSlot.compartment}</p>
              <div className="space-y-2">
                {nextSlot.items.map((item) => (
                  <div key={item.medicationId} className="bg-white/15 rounded-2xl p-3 font-bold">
                    {item.name} — {item.dosage}
                  </div>
                ))}
              </div>
              <p className="text-base font-bold opacity-80">Quando o dispenser apitar, retire a dose no copo coletor.</p>
            </div>
          ) : (
            <p className="text-xl font-bold opacity-90">Nenhuma dose ativa no momento.</p>
          )}
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-app-card border-2 border-app-border rounded-3xl p-6">
            <p className="text-xs uppercase font-black text-app-text-secondary tracking-widest">Status da dose</p>
            <p className="text-2xl font-black text-app-primary mt-2">{nextSlot ? statusLabel(nextSlot.status) : 'Sem dose'}</p>
          </div>
          <div className="bg-app-card border-2 border-app-border rounded-3xl p-6">
            <p className="text-xs uppercase font-black text-app-text-secondary tracking-widest">Dispenser</p>
            <p className={`text-2xl font-black mt-2 ${deviceOnline ? 'text-app-success' : 'text-app-warning'}`}>{deviceOnline ? 'Online' : 'Offline'}</p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header className="pb-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-app-primary">Paciente: {data.patient.name}</h1>
          <p className="text-lg text-app-text-secondary font-medium opacity-70">Controle real do ciclo de 8 compartimentos</p>
        </div>
        <button onClick={loadDashboard} className="p-3 bg-app-card border-2 border-app-border rounded-2xl text-app-primary">
          <RefreshCw size={22} />
        </button>
      </header>

      {error && <div className="p-4 bg-red-50 border-2 border-app-danger text-app-danger rounded-2xl font-black">{error}</div>}
      {success && <div className="p-4 bg-green-50 border-2 border-app-success text-app-success rounded-2xl font-black">{success}</div>}

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-app-card border-2 border-app-border rounded-3xl p-6 shadow-sm">
          <p className="text-xs uppercase font-black text-app-text-secondary tracking-widest">Medicamentos</p>
          <p className="text-4xl font-black text-app-primary mt-2">{data.medicationsCount}</p>
          <p className="text-base font-bold text-app-text-secondary mt-1">regras ativas</p>
        </div>
        <div className="bg-app-card border-2 border-app-border rounded-3xl p-6 shadow-sm">
          <p className="text-xs uppercase font-black text-app-text-secondary tracking-widest">Alertas</p>
          <p className="text-4xl font-black text-app-warning mt-2">{data.alertsCount}</p>
          <p className="text-base font-bold text-app-text-secondary mt-1">necessitam atenção</p>
        </div>
        <div className="bg-app-card border-2 border-app-border rounded-3xl p-6 shadow-sm">
          <p className="text-xs uppercase font-black text-app-text-secondary tracking-widest">Dispositivo</p>
          <div className="flex items-center gap-2 mt-2">
            {deviceOnline ? <Wifi className="text-app-success" /> : <WifiOff className="text-app-warning" />}
            <p className={`text-2xl font-black ${deviceOnline ? 'text-app-success' : 'text-app-warning'}`}>{deviceOnline ? 'Online' : 'Offline'}</p>
          </div>
          <p className="text-xs font-bold text-app-text-secondary mt-1">{data.device?.deviceCode || 'Sem dispositivo'} • {formatDateTime(data.device?.lastSeenAt)}</p>
        </div>
      </section>

      <section className="space-y-2">
        <span className="text-xs uppercase font-bold text-app-text-secondary tracking-widest block">Próxima liberação</span>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-app-primary rounded-3xl p-6 text-white shadow-lg">
          {nextSlot ? (
            <>
              <div className="inline-block px-3 py-1 rounded-full bg-white/20 text-xs font-bold mb-3">
                {nextSlot.scheduledTime} • Compartimento {nextSlot.compartment} • {statusLabel(nextSlot.status)}
              </div>
              <h2 className="text-3xl font-black mb-3">{nextSlot.itemsText || 'Dose programada'}</h2>
              <div className="space-y-2 mb-4">
                {nextSlot.items.map((item) => (
                  <p key={item.medicationId} className="text-xl font-bold opacity-90">{item.name} — {item.dosage}</p>
                ))}
              </div>
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
                <div className="font-black text-sm tracking-wide uppercase">O ESP32 libera o compartimento físico no horário</div>
                {data.activeCycle && (
                  <button onClick={handleDispenseNow} disabled={loadingAction} className="bg-white text-app-primary rounded-2xl px-5 py-3 font-black flex items-center justify-center gap-2 disabled:opacity-60">
                    <Zap size={18} /> {loadingAction ? 'Enviando...' : 'Dispensar agora'}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <Pill size={42} />
              <div>
                <h2 className="text-3xl font-black mb-1">Nenhum remédio cadastrado</h2>
                <p className="text-xl font-bold opacity-90">Cadastre medicamentos para gerar o plano automático.</p>
              </div>
            </div>
          )}
        </motion.div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-xs uppercase font-bold text-app-text-secondary tracking-widest">Plano de Abastecimento Automático (8 Compartimentos)</h3>
          <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${data.activeCycle ? 'bg-green-100 text-app-success' : 'bg-blue-100 text-app-primary'}`}>
            {data.activeCycle ? 'Ciclo ativo' : 'Prévia calculada'}
          </span>
        </div>

        {!data.refillPlan.fits && (
          <div className="p-5 bg-red-50 border-2 border-app-danger text-app-danger rounded-3xl font-black">
            {data.refillPlan.warning}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {data.refillPlan.slots.map((slot) => (
            <div key={`${slot.scheduledTime}-${slot.compartment}`} className="bg-app-card border-2 border-app-border p-4 rounded-2xl space-y-3 relative overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 p-2 bg-app-bg text-[10px] font-black text-app-text-secondary rounded-bl-lg">
                C{slot.compartment}
              </div>
              <p className="text-2xl font-black text-app-primary">{slot.scheduledTime}</p>
              <div className="space-y-2 pr-8">
                {slot.items.map((item) => (
                  <p key={item.medicationId} className="text-sm font-black text-app-text-primary leading-tight">{item.name}<br /><span className="font-bold text-app-text-secondary">{item.dosage}</span></p>
                ))}
              </div>
              <p className="text-[10px] font-bold text-app-text-secondary uppercase">{slot.items.length > 1 ? 'Dose agrupada' : 'Dose individual'}</p>
            </div>
          ))}
          {data.refillPlan.slots.length === 0 && (
            <div className="col-span-full bg-app-card border-2 border-dashed border-app-border p-6 rounded-2xl text-center font-black text-app-text-secondary">
              Sem plano de abastecimento. Cadastre medicamentos para preencher os compartimentos.
            </div>
          )}
        </div>

        {!data.activeCycle && data.refillPlan.fits && data.refillPlan.slots.length > 0 && (
          <button onClick={handleConfirmRefill} disabled={loadingAction} className="w-full p-5 bg-app-success text-white rounded-3xl text-xl font-black shadow-lg disabled:opacity-60 flex items-center justify-center gap-3">
            <CheckCircle2 size={24} /> {loadingAction ? 'Confirmando...' : 'Confirmar que abasteci o dispenser'}
          </button>
        )}
      </section>

      <div className="p-6 bg-orange-50 border-2 border-app-warning rounded-2xl flex gap-4 items-center">
        <div className="w-12 h-12 rounded-full bg-orange-100 text-app-warning flex items-center justify-center shrink-0">
          <AlertCircle size={24} />
        </div>
        <p className="text-lg font-bold text-orange-900 leading-tight">
          O cuidador cadastra apenas os remédios. O sistema calcula sozinho quais medicamentos entram em cada compartimento conforme o início do dia do paciente.
        </p>
      </div>
    </div>
  );
}
