import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UserPlus, Camera, ShieldCheck, Info } from 'lucide-react';
import { api } from '../api';
import type { Patient } from '../types';

interface Props {
  token: string;
  onSaved: (patient?: Patient) => void | Promise<void>;
}

/**
 * PatientRegistration Component: Caregiver view to add a new dependent.
 * Accessibility Features:
 * - Large touch targets for the avatar and inputs.
 * - High contrast colors following the accessibility palette.
 * - Clear helper text for the PIN logic.
 */
export default function PatientRegistration({ token, onSaved }: Props) {
  const [formData, setFormData] = useState({
    name: '',
    relationship: '',
    pin: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const patient = await api.createPatient(token, formData);
      setSuccess(`Paciente ${patient.name} cadastrado com sucesso.`);
      setFormData({ name: '', relationship: '', pin: '' });
      await onSaved(patient);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar paciente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="pb-2">
        <h1 className="text-3xl font-extrabold text-app-primary">Adicionar Novo Paciente</h1>
        <p className="text-lg text-app-text-secondary font-medium opacity-70">Cadastre quem você irá cuidar</p>
      </header>

      <form className="space-y-8" onSubmit={handleSubmit}>
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-32 h-32 rounded-full bg-slate-200 border-4 border-white shadow-md flex items-center justify-center text-slate-400 relative overflow-hidden group cursor-pointer">
            <Camera size={40} />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-xs font-bold uppercase">Adicionar Foto</span>
            </div>
          </div>
          <span className="text-xs font-black text-app-text-secondary uppercase tracking-widest">Foto do Paciente</span>
        </div>

        <div className="bg-app-card border-2 border-app-border rounded-3xl p-6 shadow-sm space-y-6">
          <div className="space-y-1">
            <label className="text-xs font-black text-app-text-secondary uppercase tracking-widest">Nome do Paciente</label>
            <input 
              type="text"
              placeholder="Ex: Sr. Breno"
              className="w-full h-16 px-6 bg-app-bg border-2 border-app-border rounded-2xl text-xl font-bold focus:border-app-primary outline-none transition-all"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black text-app-text-secondary uppercase tracking-widest">Grau de Parentesco</label>
            <input 
              type="text"
              placeholder="Ex: Pai, Avô, Tio..."
              className="w-full h-16 px-6 bg-app-bg border-2 border-app-border rounded-2xl text-xl font-bold focus:border-app-primary outline-none transition-all"
              value={formData.relationship}
              onChange={(e) => setFormData({...formData, relationship: e.target.value})}
            />
          </div>
        </div>

        <div className="bg-blue-50 border-2 border-app-primary rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-app-primary rounded-xl text-white">
              <ShieldCheck size={24} />
            </div>
            <h2 className="text-xl font-black text-app-primary">PIN de Acesso</h2>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-app-text-secondary uppercase tracking-widest">Criar PIN de 4 dígitos</label>
            <input 
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              placeholder="0000"
              className="w-full h-20 px-6 bg-white border-2 border-app-primary rounded-2xl text-4xl font-black text-app-primary tracking-[1em] text-center focus:ring-4 focus:ring-blue-100 outline-none transition-all"
              value={formData.pin}
              onChange={(e) => setFormData({...formData, pin: e.target.value.replace(/\D/g, '')})}
            />
          </div>

          <div className="flex gap-3 items-start">
            <Info size={20} className="text-app-primary shrink-0 mt-1" />
            <p className="text-base font-bold text-app-text-primary leading-tight">
              O paciente usará este número junto com o telefone do cuidador para acessar o aplicativo de forma simplificada.
            </p>
          </div>
        </div>

        {error && <div className="p-4 bg-red-50 border-2 border-app-danger text-app-danger rounded-2xl font-black">{error}</div>}
        {success && <div className="p-4 bg-green-50 border-2 border-app-success text-app-success rounded-2xl font-black">{success}</div>}

        <div className="pt-4 pb-8">
          <motion.button 
            whileTap={{ scale: 0.98 }}
            disabled={loading}
            className="w-full p-6 bg-app-primary text-white rounded-3xl text-2xl font-black shadow-xl shadow-blue-200 transition-all active:bg-blue-700 flex items-center justify-center gap-3 disabled:opacity-60"
          >
            <UserPlus size={28} />
            {loading ? 'Salvando...' : 'Salvar Paciente'}
          </motion.button>
        </div>
      </form>
    </div>
  );
}
