import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, LockKeyhole, Phone, UserPlus, User } from 'lucide-react';
import { api } from '../api';
import type { Session } from '../types';

interface Props {
  onAuthenticated: (session: Session) => void;
  onLogin: () => void;
}

export default function CaregiverSignup({ onAuthenticated, onLogin }: Props) {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const session = await api.registerCaregiver(formData);
      onAuthenticated(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar cuidador.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="text-center space-y-2">
        <h2 className="text-3xl font-black text-app-text-primary">Cadastro do Cuidador</h2>
        <p className="text-base font-bold text-app-text-secondary">Este cadastro cria a conta principal do aplicativo.</p>
      </header>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-black text-app-text-secondary uppercase tracking-widest"><User size={16} /> Nome</label>
          <input className="w-full h-16 px-5 bg-app-bg border-2 border-app-border rounded-2xl text-lg font-bold focus:border-app-primary outline-none" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nome do cuidador" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-black text-app-text-secondary uppercase tracking-widest"><Mail size={16} /> Email</label>
            <input type="email" className="w-full h-16 px-5 bg-app-bg border-2 border-app-border rounded-2xl text-lg font-bold focus:border-app-primary outline-none" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@exemplo.com" />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-black text-app-text-secondary uppercase tracking-widest"><Phone size={16} /> Telefone</label>
            <input type="tel" className="w-full h-16 px-5 bg-app-bg border-2 border-app-border rounded-2xl text-lg font-bold focus:border-app-primary outline-none" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="(11) 99999-9999" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-black text-app-text-secondary uppercase tracking-widest"><LockKeyhole size={16} /> Senha</label>
          <input type="password" className="w-full h-16 px-5 bg-app-bg border-2 border-app-border rounded-2xl text-lg font-bold focus:border-app-primary outline-none" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Mínimo 6 caracteres" />
        </div>

        {error && <div className="p-4 bg-red-50 border-2 border-app-danger text-app-danger rounded-2xl font-black">{error}</div>}

        <motion.button whileTap={{ scale: 0.98 }} disabled={loading} className="w-full p-5 bg-app-primary text-white rounded-3xl text-xl font-black shadow-xl shadow-blue-200 disabled:opacity-60 flex items-center justify-center gap-3">
          <UserPlus size={24} /> {loading ? 'Cadastrando...' : 'Criar conta'}
        </motion.button>
      </form>

      <button onClick={onLogin} className="w-full p-4 border-2 border-app-border rounded-2xl font-black text-app-primary">
        Já tenho cadastro
      </button>
    </div>
  );
}
