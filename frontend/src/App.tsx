/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import History from './components/History';
import Registration from './components/Registration';
import Alerts from './components/Alerts';
import Profile from './components/Profile';
import PatientRegistration from './components/PatientRegistration';
import PatientLogin from './components/PatientLogin';
import CaregiverLogin from './components/CaregiverLogin';
import CaregiverSignup from './components/CaregiverSignup';
import { api } from './api';
import type { Patient, Session } from './types';

const SESSION_KEY = 'medcare_iot_session';

type AuthScreen = 'caregiver-login' | 'patient-login' | 'signup';

function readStoredSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function AuthShell({ onAuthenticated }: { onAuthenticated: (session: Session) => void }) {
  const [screen, setScreen] = useState<AuthScreen>('caregiver-login');

  const handleAuth = (session: Session) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    onAuthenticated(session);
  };

  return (
    <div className="min-h-screen bg-app-bg font-sans text-app-text-primary flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-app-card border-2 border-app-border rounded-[2rem] shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="bg-app-primary text-white p-8 lg:p-12 flex flex-col justify-between gap-8">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] font-black opacity-70">MedCare IoT</p>
            <h1 className="text-4xl lg:text-5xl font-black leading-tight mt-4">
              Dispenser de remédios conectado ao cuidado diário.
            </h1>
            <p className="text-xl font-bold opacity-80 mt-6 leading-relaxed">
              Cadastre pacientes, programe horários, acompanhe histórico e envie comandos para o compartimento correto.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 text-base font-bold">
            <div className="bg-white/15 rounded-2xl p-4">✓ Cuidador entra com email e senha</div>
            <div className="bg-white/15 rounded-2xl p-4">✓ Paciente entra com telefone do cuidador + PIN</div>
            <div className="bg-white/15 rounded-2xl p-4">✓ Um cuidador pode gerenciar vários pacientes</div>
          </div>
        </section>

        <section className="p-6 lg:p-10">
          <div className="grid grid-cols-3 gap-2 bg-app-bg border border-app-border rounded-2xl p-2 mb-8">
            <button
              className={`p-3 rounded-xl font-black text-sm transition-all ${screen === 'caregiver-login' ? 'bg-white text-app-primary shadow-sm' : 'text-app-text-secondary'}`}
              onClick={() => setScreen('caregiver-login')}
            >
              Cuidador
            </button>
            <button
              className={`p-3 rounded-xl font-black text-sm transition-all ${screen === 'patient-login' ? 'bg-white text-app-primary shadow-sm' : 'text-app-text-secondary'}`}
              onClick={() => setScreen('patient-login')}
            >
              Paciente
            </button>
            <button
              className={`p-3 rounded-xl font-black text-sm transition-all ${screen === 'signup' ? 'bg-white text-app-primary shadow-sm' : 'text-app-text-secondary'}`}
              onClick={() => setScreen('signup')}
            >
              Cadastre-se
            </button>
          </div>

          {screen === 'caregiver-login' && (
            <CaregiverLogin onAuthenticated={handleAuth} onSignup={() => setScreen('signup')} onPatientLogin={() => setScreen('patient-login')} />
          )}
          {screen === 'patient-login' && (
            <PatientLogin onAuthenticated={handleAuth} onCaregiverLogin={() => setScreen('caregiver-login')} />
          )}
          {screen === 'signup' && (
            <CaregiverSignup onAuthenticated={handleAuth} onLogin={() => setScreen('caregiver-login')} />
          )}
        </section>
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [session, setSession] = useState<Session | null>(() => readStoredSession());
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [loadingPatients, setLoadingPatients] = useState(false);

  const token = session?.token || '';
  const isCaregiver = session?.role === 'caregiver';

  useEffect(() => {
    if (!session) return;

    if (session.role === 'patient') {
      setPatients([session.user as Patient]);
      setSelectedPatientId((session.user as Patient).id);
      return;
    }

    setLoadingPatients(true);
    api.getPatients(session.token)
      .then((items) => {
        setPatients(items);
        setSelectedPatientId((current) => current || items[0]?.id || '');
      })
      .finally(() => setLoadingPatients(false));
  }, [session]);

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selectedPatientId) || null,
    [patients, selectedPatientId]
  );

  const reloadPatients = async (patientToSelect?: Patient) => {
    if (!session || session.role !== 'caregiver') return;
    const items = await api.getPatients(session.token);
    setPatients(items);
    setSelectedPatientId(patientToSelect?.id || selectedPatientId || items[0]?.id || '');
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setPatients([]);
    setSelectedPatientId('');
    setActiveTab('dashboard');
  };

  const renderContent = () => {
    if (!session) return null;

    if (loadingPatients) {
      return (
        <div className="p-8 bg-app-card border-2 border-app-border rounded-3xl font-black text-app-primary">
          Carregando pacientes...
        </div>
      );
    }

    if (isCaregiver && patients.length === 0 && activeTab !== 'add-patient') {
      return (
        <div className="space-y-6">
          <div className="p-8 bg-blue-50 border-2 border-app-primary rounded-3xl">
            <h1 className="text-3xl font-black text-app-primary">Cadastre o primeiro paciente</h1>
            <p className="text-lg font-bold text-app-text-primary mt-2">
              O cuidador pode ter vários pacientes, mas cada paciente fica vinculado a apenas um cuidador.
            </p>
          </div>
          <PatientRegistration token={token} onSaved={reloadPatients} />
        </div>
      );
    }

    if (!selectedPatientId) {
      return (
        <div className="p-8 bg-app-card border-2 border-app-border rounded-3xl font-black text-app-text-secondary">
          Nenhum paciente selecionado.
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard token={token} patientId={selectedPatientId} />;
      case 'history':
        return <History token={token} patientId={selectedPatientId} />;
      case 'register':
        return <Registration token={token} patientId={selectedPatientId} isCaregiver={isCaregiver} />;
      case 'add-patient':
        return <PatientRegistration token={token} onSaved={reloadPatients} />;
      case 'alerts':
        return <Alerts token={token} patientId={selectedPatientId} />;
      case 'profile':
        return <Profile token={token} patientId={selectedPatientId} />;
      default:
        return <Dashboard token={token} patientId={selectedPatientId} />;
    }
  };

  if (!session) {
    return <AuthShell onAuthenticated={setSession} />;
  }

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      session={session}
      patients={patients}
      selectedPatient={selectedPatient}
      selectedPatientId={selectedPatientId}
      setSelectedPatientId={setSelectedPatientId}
      onLogout={handleLogout}
    >
      {renderContent()}
    </Layout>
  );
}
