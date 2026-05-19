import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, LockKeyhole, LogIn, UserCircle2 } from 'lucide-react';
import { api } from '../api';
import type { Session } from '../types';

interface Props {
  onAuthenticated: (session: Session) => void;
  onSignup: () => void;
  onPatientLogin: () => void;
}

export default function CaregiverLogin({ onAuthenticated, onSignup, onPatientLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const session = await api.loginCaregiver({ email, password });
      onAuthenticated(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="text-center space-y-3">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-app-primary">
          <UserCircle2 size={48} strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-app-text-primary">Login do Cuidador</h2>
          <p className="text-base font-bold text-app-text-secondary mt-1">Acesso completo por email e senha</p>
        </div>
      </header>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-black text-app-text-secondary uppercase tracking-widest">
            <Mail size={16} /> Email
          </label>
          <input
            type="email"
            className="w-full h-16 px-5 bg-app-bg border-2 border-app-border rounded-2xl text-lg font-bold focus:border-app-primary outline-none transition-all"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="cuidador@email.com"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-black text-app-text-secondary uppercase tracking-widest">
            <LockKeyhole size={16} /> Senha
          </label>
          <input
            type="password"
            className="w-full h-16 px-5 bg-app-bg border-2 border-app-border rounded-2xl text-lg font-bold focus:border-app-primary outline-none transition-all"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Senha do cuidador"
          />
        </div>

        {error && <div className="p-4 bg-red-50 border-2 border-app-danger text-app-danger rounded-2xl font-black">{error}</div>}

        <motion.button
          whileTap={{ scale: 0.98 }}
          disabled={loading}
          className="w-full p-5 bg-app-primary text-white rounded-3xl text-xl font-black shadow-xl shadow-blue-200 transition-all active:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-3"
        >
          <LogIn size={24} />
          {loading ? 'Entrando...' : 'Entrar como Cuidador'}
        </motion.button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button onClick={onSignup} className="p-4 border-2 border-app-border rounded-2xl font-black text-app-primary hover:border-app-primary transition-all">
          Cadastre-se
        </button>
        <button onClick={onPatientLogin} className="p-4 border-2 border-app-border rounded-2xl font-black text-app-text-secondary hover:border-app-primary transition-all">
          Sou paciente
        </button>
      </div>
    </div>
  );
}
