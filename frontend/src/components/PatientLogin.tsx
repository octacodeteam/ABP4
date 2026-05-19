import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UserCircle2, Smartphone, KeyRound, ChevronRight } from 'lucide-react';
import { api } from '../api';
import type { Session } from '../types';

interface Props {
  onAuthenticated: (session: Session) => void;
  onCaregiverLogin: () => void;
}

export default function PatientLogin({ onAuthenticated, onCaregiverLogin }: Props) {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const session = await api.loginPatient({ caregiverPhone: phone, pin });
      onAuthenticated(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login do paciente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-10 px-2 py-2">
      <header className="text-center space-y-4">
        <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-app-primary">
          <UserCircle2 size={64} strokeWidth={1.5} />
        </div>
        <h1 className="text-4xl font-black text-app-text-primary tracking-tight">Área do Paciente</h1>
        <p className="text-xl font-bold text-app-text-secondary opacity-70">Acesso simplificado por telefone do cuidador e PIN</p>
      </header>

      <form className="w-full max-w-md space-y-8" onSubmit={handleSubmit}>
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-black text-app-text-secondary uppercase tracking-widest justify-center">
            <Smartphone size={18} /> Telefone do Responsável
          </label>
          <input 
            type="tel"
            inputMode="numeric"
            placeholder="(00) 00000-0000"
            className="w-full h-20 px-8 bg-white border-4 border-app-border rounded-3xl text-2xl font-black text-center focus:border-app-primary outline-none transition-all shadow-sm"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-black text-app-text-secondary uppercase tracking-widest justify-center">
            <KeyRound size={18} /> Seu PIN de 4 dígitos
          </label>
          <input 
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="• • • •"
            className="w-full h-24 px-8 bg-white border-4 border-app-border rounded-3xl text-5xl font-black text-center focus:border-app-primary outline-none transition-all shadow-sm tracking-[0.5em] text-app-primary"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          />
        </div>

        {error && <div className="p-4 bg-red-50 border-2 border-app-danger text-app-danger rounded-2xl font-black text-center">{error}</div>}

        <motion.button 
          whileTap={{ scale: 0.95 }}
          disabled={loading}
          className="w-full h-24 bg-app-primary text-white rounded-[40px] text-3xl font-black shadow-2xl shadow-blue-200 flex items-center justify-center gap-4 transition-all active:bg-blue-700 disabled:opacity-60"
        >
          {loading ? 'Entrando...' : 'Entrar'}
          <ChevronRight size={32} strokeWidth={3} />
        </motion.button>
      </form>

      <button onClick={onCaregiverLogin} className="pt-2 text-app-primary font-black text-xl hover:underline decoration-2 underline-offset-8 transition-all">
        Sou Cuidador (Acesso Completo)
      </button>
    </div>
  );
}
