import React, { useState, useEffect } from 'react';
import { CalendarDays, UserCheck, Users } from 'lucide-react';
import { RegistrationForm } from './RegistrationForm';
import { CapturedRecords } from './CapturedRecords';
import { SuccessScreen } from './SuccessScreen';
import { api } from '../../services/api';
import type { Jornada } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

type Tab = 'form' | 'history' | 'success';

export const BeneficiaryRegistry: React.FC = () => {
  const { activeOng } = useAuth();
  const isEkklesia = activeOng?.tipo_organizacion === 'ekklesia';

  // Default to 'history' so user immediately sees the padrón
  const [activeTab, setActiveTab] = useState<Tab>('history');
  const [jornadas, setJornadas] = useState<Jornada[]>([]);
  const [selectedJornadaId, setSelectedJornadaId] = useState<string>('');

  const loadJornadas = async () => {
    try {
      const allJornadas = await api.getJornadas();
      const activas = allJornadas.filter((j) => j.activa);
      setJornadas(activas);

      const saved = sessionStorage.getItem('cnbv_active_jornada');
      if (saved && activas.some((j) => j.id === saved)) {
        setSelectedJornadaId(saved);
      } else if (activas.length > 0) {
        setSelectedJornadaId(activas[0].id);
      }
    } catch (err) {
      console.error('Error al cargar jornadas:', err);
    }
  };

  useEffect(() => {
    loadJornadas();
  }, []);

  const handleSelectJornada = (id: string) => {
    setSelectedJornadaId(id);
    sessionStorage.setItem('cnbv_active_jornada', id);
  };

  const handleSuccess = () => {
    setActiveTab('success');
  };

  const handleNewRegistration = () => {
    setActiveTab('form');
  };

  const selectedJornada = jornadas.find((j) => j.id === selectedJornadaId);

  return (
    <div
      className="animate-fade-in-up"
      style={{ maxWidth: '950px', margin: '0 auto', padding: '1rem' }}
    >
      {/* Encabezado del Módulo */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ color: 'var(--primary)', fontSize: '1.75rem', fontWeight: 800 }}>
          {isEkklesia ? '👤 Miembros y Fieles' : '🤝 Beneficiarios y Atención Social'}
        </h2>
        <p
          style={{
            color: 'var(--neutral-dark)',
            opacity: 0.8,
            fontSize: '0.9rem',
            marginTop: '0.25rem',
          }}
        >
          {isEkklesia
            ? 'Padrón consolidado de miembros de la congregación, fichas 360°, asistencias y vinculación de diezmos/ofrendas.'
            : 'Padrón consolidado de beneficiarios, entregas de ayudas sociales y firma autógrafa en campo.'}
        </p>
      </div>

      {/* Pestañas Principales */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          backgroundColor: 'var(--neutral-light)',
          padding: '0.3rem',
          borderRadius: 'var(--radius-lg)',
        }}
      >
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
            boxShadow: activeTab === 'history' ? 'var(--shadow-sm)' : 'none',
          }}
        >
          <Users size={18} /> {isEkklesia ? 'Padrón de Miembros 360°' : 'Beneficiarios Registrados'}
        </button>

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
            backgroundColor:
              activeTab === 'form' || activeTab === 'success' ? '#fff' : 'transparent',
            color:
              activeTab === 'form' || activeTab === 'success'
                ? 'var(--primary)'
                : 'var(--neutral-dark)',
            boxShadow:
              activeTab === 'form' || activeTab === 'success' ? 'var(--shadow-sm)' : 'none',
          }}
        >
          <UserCheck size={18} /> {isEkklesia ? 'Nuevo Miembro' : 'Registro de Campo'}
        </button>
      </div>

      {/* Selector/Bandeja de Actividad de Campo (Si se está en formulario de registro) */}
      {activeTab === 'form' && jornadas.length > 0 && (
        <div
          style={{
            backgroundColor: '#e8f5e9',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#2e7d32',
              fontWeight: 600,
            }}
          >
            <CalendarDays size={18} />
            {isEkklesia ? 'Actividad / Culto Activo: ' : 'Jornada Activa: '}
            <strong>{selectedJornada?.nombre || 'General'}</strong>
          </div>
          {jornadas.length > 1 && (
            <select
              className="app-input"
              style={{
                width: 'auto',
                marginBottom: 0,
                padding: '0.25rem 0.5rem',
                fontSize: '0.85rem',
              }}
              value={selectedJornadaId}
              onChange={(e) => handleSelectJornada(e.target.value)}
            >
              {jornadas.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nombre} ({new Date(j.fecha).toLocaleDateString('es-VE')})
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Contenido Principal */}
      <div className="card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
        {activeTab === 'history' && <CapturedRecords />}
        {activeTab === 'form' && (
          <RegistrationForm
            onSuccess={handleSuccess}
            jornadaId={selectedJornadaId || (jornadas[0]?.id ?? '')}
            ongId={selectedJornada?.ong_id}
          />
        )}
        {activeTab === 'success' && <SuccessScreen onNewRegistration={handleNewRegistration} />}
      </div>
    </div>
  );
};
