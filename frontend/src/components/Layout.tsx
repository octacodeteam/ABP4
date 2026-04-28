import React from 'react';
import { Home, History, PlusCircle, Bell, User, UserPlus, LogOut, Users } from 'lucide-react';
import type { Patient, Session } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  session: Session;
  patients: Patient[];
  selectedPatient: Patient | null;
  selectedPatientId: string;
  setSelectedPatientId: (patientId: string) => void;
  onLogout: () => void;
}

/**
 * Layout Component: Mimics a mobile application structure.
 * Accessibility Features:
 * - High contrast bottom navigation.
 * - Large icons (32px) for easier visibility.
 * - Clear labels under icons.
 * - Generous touch areas (h-24 for the nav bar).
 */
export default function Layout({
  children,
  activeTab,
  setActiveTab,
  session,
  patients,
  selectedPatient,
  selectedPatientId,
  setSelectedPatientId,
  onLogout,
}: LayoutProps) {
  const isCaregiver = session.role === 'caregiver';
  const tabs = [
    { id: 'dashboard', label: 'Início', icon: Home, show: true },
    { id: 'history', label: 'Histórico', icon: History, show: true },
    { id: 'register', label: 'Novo', icon: PlusCircle, show: isCaregiver },
    { id: 'add-patient', label: 'Paciente+', icon: UserPlus, show: isCaregiver },
    { id: 'alerts', label: 'Alertas', icon: Bell, show: true },
    { id: 'profile', label: 'Perfil', icon: User, show: true },
  ].filter((tab) => tab.show);

  return (
    <div className="flex min-h-screen bg-app-bg font-sans text-app-text-primary">
      <aside className="hidden lg:flex flex-col w-80 bg-app-card border-r border-app-border sticky top-0 h-screen shadow-sm">
        <div className="p-8">
          <h1 className="text-2xl font-black text-app-primary tracking-tight">MedCare IoT</h1>
          <p className="text-xs font-bold text-app-text-secondary uppercase tracking-widest mt-1 opacity-60">Sistema de Dispensação</p>
        </div>

        {isCaregiver && (
          <div className="px-4 pb-4">
            <label className="flex items-center gap-2 text-xs font-black text-app-text-secondary uppercase tracking-widest mb-2 px-2">
              <Users size={14} /> Paciente ativo
            </label>
            <select
              className="w-full p-4 bg-app-bg border-2 border-app-border rounded-2xl font-black text-app-text-primary focus:border-app-primary outline-none"
              value={selectedPatientId}
              onChange={(event) => setSelectedPatientId(event.target.value)}
            >
              {patients.length === 0 && <option value="">Nenhum paciente</option>}
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>{patient.name}</option>
              ))}
            </select>
          </div>
        )}
        
        <nav className="flex-1 px-4 space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all ${
                  isActive 
                  ? 'bg-blue-50 text-app-primary shadow-sm' 
                  : 'text-app-text-secondary hover:bg-slate-50'
                }`}
              >
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-lg">{tab.label}</span>
                {isActive && <div className="ml-auto w-2 h-2 rounded-full bg-app-primary" />}
              </button>
            );
          })}
        </nav>

        <div className="p-8 border-t border-app-border space-y-3">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="w-10 h-10 rounded-full bg-app-primary flex items-center justify-center text-white font-bold">
              {(selectedPatient?.name || session.user.name || '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold">{selectedPatient?.name || session.user.name}</p>
              <p className="text-xs text-app-text-secondary">{isCaregiver ? 'Cuidador' : 'Paciente'}</p>
            </div>
          </div>
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl border-2 border-app-border font-black text-app-text-secondary hover:border-app-danger hover:text-app-danger transition-all">
            <LogOut size={18} /> Sair
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden bg-app-card border-b border-app-border p-4 flex items-center justify-between sticky top-0 z-40 gap-3">
          <div>
            <h1 className="text-xl font-black text-app-primary">MedCare IoT</h1>
            <p className="text-xs font-bold text-app-text-secondary">{selectedPatient?.name || session.user.name}</p>
          </div>
          <button onClick={onLogout} className="w-10 h-10 rounded-full bg-app-primary flex items-center justify-center text-white text-xs font-bold">
            <LogOut size={18} />
          </button>
        </header>

        {isCaregiver && patients.length > 1 && (
          <div className="lg:hidden bg-app-card border-b border-app-border p-3">
            <select
              className="w-full p-3 bg-app-bg border-2 border-app-border rounded-2xl font-black text-app-text-primary"
              value={selectedPatientId}
              onChange={(event) => setSelectedPatientId(event.target.value)}
            >
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>{patient.name}</option>
              ))}
            </select>
          </div>
        )}

        <main className="flex-1 p-4 md:p-8 lg:p-12 overflow-y-auto pb-32 lg:pb-12">
          <div className="max-w-4xl mx-auto">
            {children}
          </div>
        </main>

        <nav className="lg:hidden fixed bottom-0 w-full bg-app-card border-t border-app-border h-[80px] flex items-center justify-around px-2 z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
                  isActive ? 'text-app-primary' : 'text-app-text-secondary'
                }`}
                aria-label={tab.label}
              >
                <Icon size={26} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-bold uppercase tracking-wider mt-1">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
