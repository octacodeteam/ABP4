import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { PlusCircle, Info, Bell } from 'lucide-react';
import { api } from '../api';
import type { Medication } from '../types';

interface Props {
  token: string;
  patientId: string;
  isCaregiver: boolean;
}

/**
 * Registration Component: Form to add new medication.
 * Accessibility Features:
 * - Large input fields (h-16).
 * - Large font sizes for labels and inputs.
 * - Visual icons inside inputs for context.
 * - High contrast "Save" button.
 */
export default function Registration({ token, patientId, isCaregiver }: Props) {
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    firstDoseTime: '06:00',
    frequencyHours: 4,
    compartment: 1,
    isCritical: true
  });
  const [medications, setMedications] = useState<Medication[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const loadMedications = async () => {
    try {
      const items = await api.getMedications(token, patientId);
      setMedications(items);
    } catch {
      setMedications([]);
    }
  };

  useEffect(() => {
    loadMedications();
  }, [patientId]);

  const hasConflict = useMemo(() => (
    medications.some((med) => med.firstDoseTime === formData.firstDoseTime || med.compartment === formData.compartment)
  ), [medications, formData.firstDoseTime, formData.compartment]);

  const groupedMedication = medications.find((med) => med.firstDoseTime === formData.firstDoseTime);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isCaregiver) return;

    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const medication = await api.createMedication(token, patientId, formData);
      setSuccess(`${medication.name} cadastrado no compartimento ${medication.compartment}.`);
      setFormData({ name: '', dosage: '', firstDoseTime: '06:00', frequencyHours: 4, compartment: 1, isCritical: true });
      await loadMedications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar medicamento.');
    } finally {
      setLoading(false);
    }
  };

  if (!isCaregiver) {
    return (
      <div className="p-8 bg-orange-50 border-2 border-app-warning rounded-3xl">
        <h1 className="text-3xl font-black text-app-warning">Acesso restrito</h1>
        <p className="text-lg font-bold text-orange-900 mt-2">Apenas o cuidador pode cadastrar ou alterar medicamentos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="pb-2">
        <h1 className="text-3xl font-extrabold text-app-primary">Novo Remédio</h1>
        <p className="text-lg text-app-text-secondary font-medium opacity-70">Inteligência de Agrupamento Ativa</p>
      </header>

      <form className="space-y-8" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-xs uppercase font-bold text-app-text-secondary tracking-widest opacity-80">Nome do Medicamento</label>
            <input 
              type="text"
              placeholder="Ex: Remédio A"
              className="w-full p-4 bg-app-bg border-2 border-app-border rounded-xl text-xl font-bold focus:border-app-primary outline-none transition-colors text-app-text-primary"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase font-bold text-app-text-secondary tracking-widest opacity-80">Dosagem</label>
            <input 
              type="text"
              placeholder="Ex: 1 comprimido"
              className="w-full p-4 bg-app-bg border-2 border-app-border rounded-xl text-xl font-bold focus:border-app-primary outline-none transition-colors text-app-text-primary"
              value={formData.dosage}
              onChange={(e) => setFormData({...formData, dosage: e.target.value})}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-xs uppercase font-bold text-app-text-secondary tracking-widest opacity-80">Primeira Dose do Dia</label>
            <input 
              type="time"
              className="w-full p-4 bg-app-bg border-2 border-app-border rounded-xl text-xl font-bold focus:border-app-primary outline-none transition-colors text-app-text-primary"
              value={formData.firstDoseTime}
              onChange={(e) => setFormData({...formData, firstDoseTime: e.target.value})}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase font-bold text-app-text-secondary tracking-widest opacity-80">Frequência</label>
            <select 
              className="w-full p-4 bg-app-bg border-2 border-app-border rounded-xl text-xl font-bold focus:border-app-primary outline-none appearance-none text-app-text-primary"
              value={formData.frequencyHours}
              onChange={(e) => setFormData({...formData, frequencyHours: Number(e.target.value)})}
            >
              <option value={4}>4h em 4h (6x ao dia)</option>
              <option value={6}>6h em 6h (4x ao dia)</option>
              <option value={8}>8h em 8h (3x ao dia)</option>
              <option value={12}>12h em 12h (2x ao dia)</option>
              <option value={24}>1x ao dia</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-6 bg-app-card border-2 border-app-border rounded-3xl shadow-sm">
            <div className="space-y-1">
              <p className="text-2xl font-black text-app-text-primary flex items-center gap-2">
                Dose Crítica {formData.isCritical && <Bell className="text-app-danger fill-app-danger" size={20} />}
              </p>
              <p className="text-base font-bold text-app-text-secondary opacity-70">Acordar o paciente se necessário</p>
            </div>
            <button 
              type="button"
              onClick={() => setFormData({...formData, isCritical: !formData.isCritical})}
              className={`w-20 h-10 rounded-full p-1 transition-colors duration-300 ${formData.isCritical ? 'bg-app-primary' : 'bg-slate-300'}`}
            >
              <motion.div 
                animate={{ x: formData.isCritical ? 40 : 0 }}
                className="w-8 h-8 bg-white rounded-full shadow-md"
              />
            </button>
          </div>

          {!formData.isCritical && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 bg-orange-50 border-2 border-app-warning rounded-3xl flex gap-4 items-start"
            >
              <div className="text-app-warning mt-1">
                <Info size={28} />
              </div>
              <p className="text-lg font-bold text-orange-900 leading-tight">
                <span className="font-black block mb-1 uppercase tracking-wider text-sm">Atenção</span>
                Como não é uma dose crítica, se o horário coincidir com a <span className="font-black">Janela de Sono</span>, esta dose poderá ser ignorada pelo alarme.
              </p>
            </motion.div>
          )}
        </div>

        {hasConflict && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 bg-blue-50 border-2 border-app-primary rounded-3xl flex gap-4 items-start shadow-sm"
          >
            <div className="p-3 bg-app-primary rounded-xl text-white">
              <PlusCircle size={28} />
            </div>
            <div>
              <p className="text-xl font-black text-app-primary">Agrupamento Inteligente</p>
              <p className="text-app-text-primary font-bold text-lg">
                {groupedMedication
                  ? <>Já existe medicamento às <span className="font-black">{formData.firstDoseTime}</span>. Este remédio será planejado junto com os demais do mesmo horário.</>
                  : <>Este compartimento já possui planejamento. Confirme se quer usar a mesma gaveta.</>}
              </p>
            </div>
          </motion.div>
        )}

        <div className="space-y-3 p-6 bg-app-card border-2 border-app-border rounded-3xl shadow-sm">
          <label className="text-xs uppercase font-bold text-app-text-secondary tracking-widest opacity-80 block">Compartimento Alocado</label>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[1, 2, 3, 4, 5, 6, 7].map((num) => (
              <button
                type="button"
                key={num}
                onClick={() => setFormData({...formData, compartment: num})}
                className={`h-16 min-w-[64px] rounded-2xl border-2 flex items-center justify-center font-black text-2xl transition-all ${
                  formData.compartment === num
                  ? 'bg-app-primary border-app-primary text-white shadow-md'
                  : 'bg-app-bg border-app-border text-app-text-secondary opacity-70'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="p-4 bg-red-50 border-2 border-app-danger text-app-danger rounded-2xl font-black">{error}</div>}
        {success && <div className="p-4 bg-green-50 border-2 border-app-success text-app-success rounded-2xl font-black">{success}</div>}

        <div className="pt-4 pb-8">
          <motion.button 
            whileTap={{ scale: 0.98 }}
            disabled={loading}
            className="w-full p-6 bg-app-primary text-white rounded-3xl text-2xl font-black shadow-xl shadow-blue-200 transition-all active:bg-blue-700 disabled:opacity-60"
          >
            {loading ? 'Salvando...' : 'Confirmar Agendamento'}
          </motion.button>
          <button type="button" onClick={() => setFormData({ name: '', dosage: '', firstDoseTime: '06:00', frequencyHours: 4, compartment: 1, isCritical: true })} className="w-full p-4 mt-4 text-app-text-secondary font-bold text-lg border-2 border-transparent hover:border-app-border rounded-2xl transition-all">
            Limpar
          </button>
        </div>
      </form>
    </div>
  );
}
