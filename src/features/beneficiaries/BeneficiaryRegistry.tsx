import React, { useState } from 'react';
import { RegistrationForm } from './RegistrationForm';
import { CapturedRecords } from './CapturedRecords';
import { SuccessScreen } from './SuccessScreen';
import { UserCheck, History } from 'lucide-react';

type Tab = 'form' | 'history' | 'success';

export const BeneficiaryRegistry: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('form');

  const handleSuccess = () => {
    setActiveTab('success');
  };

  const handleNewRegistration = () => {
    setActiveTab('form');
  };

  return (
    <div className="animate-fade-in-up" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ color: 'var(--primary)', fontSize: '1.75rem', fontWeight: 700 }}>
          Módulo de Beneficiarios
        </h2>
        <p style={{ color: 'var(--neutral-dark)', opacity: 0.8, fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Captura de datos y firma autógrafa en campo.
        </p>
      </div>

      {/* Navegación Horizontal (Tabs) */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        marginBottom: '1.5rem',
        backgroundColor: 'var(--neutral-light)',
        padding: '0.3rem',
        borderRadius: 'var(--radius-lg)'
      }}>
        <button
          onClick={() => setActiveTab('form')}
          style={{
            flex: 1,
            padding: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backgroundColor: (activeTab === 'form' || activeTab === 'success') ? '#fff' : 'transparent',
            color: (activeTab === 'form' || activeTab === 'success') ? 'var(--primary)' : 'var(--neutral-dark)',
            boxShadow: (activeTab === 'form' || activeTab === 'success') ? 'var(--shadow-sm)' : 'none'
          }}
        >
          <UserCheck size={18} /> Registro
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{
            flex: 1,
            padding: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backgroundColor: activeTab === 'history' ? '#fff' : 'transparent',
            color: activeTab === 'history' ? 'var(--primary)' : 'var(--neutral-dark)',
            boxShadow: activeTab === 'history' ? 'var(--shadow-sm)' : 'none'
          }}
        >
          <History size={18} /> Historial
        </button>
      </div>

      {/* Contenido Dinámico */}
      <div className="card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
        {activeTab === 'form' && <RegistrationForm onSuccess={handleSuccess} />}
        {activeTab === 'history' && <CapturedRecords />}
        {activeTab === 'success' && <SuccessScreen onNewRegistration={handleNewRegistration} />}
      </div>
    </div>
  );
};
