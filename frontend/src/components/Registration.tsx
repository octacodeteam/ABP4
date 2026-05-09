import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Bell, Info, Pill, PlusCircle, Trash2 } from 'lucide-react';
import { api } from '../api';
import type { Medication } from '../types';

interface Props {
  token: string;
  patientId: string;
  isCaregiver: boolean;
}

export default function Registration({ token, patientId, isCaregiver }: Props) {
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    instructions: '',
    firstDoseTime: '06:00',
    frequencyHours: 4,
    isCritical: true,
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isCaregiver) return;

    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const medication = await api.createMedication(token, patientId, formData);
      setSuccess(`${medication.name} cadastrado. O compartimento será calculado automaticamente no plano de abastecimento.`);
      setFormData({ name: '', dosage: '', instructions: '', firstDoseTime: '06:00', frequencyHours: 4, isCritical: true });
      await loadMedications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar medicamento.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (medication: Medication) => {
    if (!confirm(`Inativar ${medication.name}? Será necessário confirmar um novo abastecimento depois.`)) return;
    setError('');
    try {
      await api.deleteMedication(token, patientId, medication.id);
      await loadMedications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao inativar medicamento.');
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
    <div className="space-y-8">
      <header className="pb-2">
        <h1 className="text-3xl font-extrabold text-app-primary">Novo Remédio</h1>
        <p className="text-lg text-app-text-secondary font-medium opacity-70">Cadastre a regra do remédio. O sistema escolherá os compartimentos sozinho.</p>
      </header>

      <form className="space-y-8" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-xs uppercase font-bold text-app-text-secondary tracking-widest opacity-80">Nome do Medicamento</label>
            <input type="text" placeholder="Ex: Ritalina" className="w-full p-4 bg-app-bg border-2 border-app-border rounded-xl text-xl font-bold focus:border-app-primary outline-none transition-colors text-app-text-primary" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase font-bold text-app-text-secondary tracking-widest opacity-80">Dosagem por dose</label>
            <input type="text" placeholder="Ex: 1 comprimido" className="w-full p-4 bg-app-bg border-2 border-app-border rounded-xl text-xl font-bold focus:border-app-primary outline-none transition-colors text-app-text-primary" value={formData.dosage} onChange={(e) => setFormData({ ...formData, dosage: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-xs uppercase font-bold text-app-text-secondary tracking-widest opacity-80">Primeira dose dentro do ciclo</label>
            <input type="time" className="w-full p-4 bg-app-bg border-2 border-app-border rounded-xl text-xl font-bold focus:border-app-primary outline-none transition-colors text-app-text-primary" value={formData.firstDoseTime} onChange={(e) => setFormData({ ...formData, firstDoseTime: e.target.value })} />
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase font-bold text-app-text-secondary tracking-widest opacity-80">Frequência</label>
            <select className="w-full p-4 bg-app-bg border-2 border-app-border rounded-xl text-xl font-bold focus:border-app-primary outline-none appearance-none text-app-text-primary" value={formData.frequencyHours} onChange={(e) => setFormData({ ...formData, frequencyHours: Number(e.target.value) })}>
              <option value={4}>4h em 4h</option>
              <option value={6}>6h em 6h</option>
              <option value={8}>8h em 8h</option>
              <option value={12}>12h em 12h</option>
              <option value={24}>1x ao dia</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs uppercase font-bold text-app-text-secondary tracking-widest opacity-80">Observações</label>
          <textarea placeholder="Ex: tomar com água, evitar jejum..." className="w-full min-h-28 p-4 bg-app-bg border-2 border-app-border rounded-xl text-lg font-bold focus:border-app-primary outline-none transition-colors text-app-text-primary" value={formData.instructions} onChange={(e) => setFormData({ ...formData, instructions: e.target.value })} />
        </div>

        <div className="flex items-center justify-between p-6 bg-app-card border-2 border-app-border rounded-3xl shadow-sm">
          <div className="space-y-1">
            <p className="text-2xl font-black text-app-text-primary flex items-center gap-2">
              Dose Crítica {formData.isCritical && <Bell className="text-app-danger fill-app-danger" size={20} />}
            </p>
            <p className="text-base font-bold text-app-text-secondary opacity-70">Ajuda o cuidador a priorizar alertas importantes.</p>
          </div>
          <button type="button" onClick={() => setFormData({ ...formData, isCritical: !formData.isCritical })} className={`w-20 h-10 rounded-full p-1 transition-colors duration-300 ${formData.isCritical ? 'bg-app-primary' : 'bg-slate-300'}`}>
            <motion.div animate={{ x: formData.isCritical ? 40 : 0 }} className="w-8 h-8 bg-white rounded-full shadow-md" />
          </button>
        </div>

        <div className="p-6 bg-blue-50 border-2 border-app-primary rounded-3xl flex gap-4 items-start shadow-sm">
          <div className="p-3 bg-app-primary rounded-xl text-white"><PlusCircle size={28} /></div>
          <div>
            <p className="text-xl font-black text-app-primary">Compartimentos automáticos</p>
            <p className="text-app-text-primary font-bold text-lg">Você não escolhe mais a gaveta. O sistema agrupa todos os medicamentos do mesmo horário em uma única dosagem e distribui nos 8 compartimentos.</p>
          </div>
        </div>

        {error && <div className="p-4 bg-red-50 border-2 border-app-danger text-app-danger rounded-2xl font-black">{error}</div>}
        {success && <div className="p-4 bg-green-50 border-2 border-app-success text-app-success rounded-2xl font-black">{success}</div>}

        <div className="pt-4">
          <motion.button whileTap={{ scale: 0.98 }} disabled={loading} className="w-full p-6 bg-app-primary text-white rounded-3xl text-2xl font-black shadow-xl shadow-blue-200 transition-all active:bg-blue-700 disabled:opacity-60">
            {loading ? 'Salvando...' : 'Salvar Remédio'}
          </motion.button>
        </div>
      </form>

      <section className="space-y-4 pb-8">
        <h2 className="text-xs uppercase font-black text-app-text-secondary tracking-widest">Medicamentos cadastrados</h2>
        {medications.map((med) => (
          <div key={med.id} className="bg-app-card border-2 border-app-border rounded-3xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex gap-4 items-start">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-app-primary flex items-center justify-center"><Pill size={24} /></div>
              <div>
                <p className="text-xl font-black text-app-text-primary">{med.name}</p>
                <p className="font-bold text-app-text-secondary">{med.dosage} • primeira dose {med.firstDoseTime} • {med.frequencyHours}h em {med.frequencyHours}h</p>
                {med.instructions && <p className="font-bold text-app-text-secondary opacity-70 mt-1">{med.instructions}</p>}
              </div>
            </div>
            <button type="button" onClick={() => handleDelete(med)} className="p-3 border-2 border-app-border rounded-2xl text-app-danger font-black flex items-center justify-center gap-2">
              <Trash2 size={18} /> Inativar
            </button>
          </div>
        ))}
        {medications.length === 0 && (
          <div className="p-6 bg-app-card border-2 border-app-border rounded-3xl flex gap-3 items-center font-black text-app-text-secondary">
            <Info size={24} /> Nenhum medicamento cadastrado ainda.
          </div>
        )}
      </section>
    </div>
  );
}
