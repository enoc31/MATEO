import React, { useState, useEffect } from 'react';
import { CalendarDays, UserCheck, History } from 'lucide-react';
import { RegistrationForm } from './RegistrationForm';
import { CapturedRecords } from './CapturedRecords';
import { SuccessScreen } from './SuccessScreen';
import { ChurchMembersManager } from './ChurchMembersManager';
import { api } from '../../services/api';
import type { Jornada } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

type Tab = 'form' | 'history' | 'success';

export const BeneficiaryRegistry: React.FC = () => {
  const { activeOng } = useAuth();
  const isEkklesia = activeOng?.tipo_organizacion === 'ekklesia';

  const [activeTab, setActiveTab] = useState<Tab>('form');
  const [jornadas, setJornadas] = useState<Jornada[]>([]);
  const [selectedJornadaId, setSelectedJornadaId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const loadJornadas = async () => {
    try {
      const allJornadas = await api.getJornadas();
      const activas = allJornadas.filter((j) => j.activa);
      setJornadas(activas);

      const saved = sessionStorage.getItem('cnbv_active_jornada');
      if (saved && activas.some((j) => j.id === saved)) {
        setSelectedJornadaId(saved);
      }
    } catch (err) {
      console.error('Error al cargar jornadas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isEkklesia) {
      loadJornadas();
    } else {
      setLoading(false);
    }
  }, [isEkklesia]);

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

  // If this is a Church / Ekklesia organization, render the dedicated Church Member Manager module
  if (isEkklesia) {
    return <ChurchMembersManager />;
  }

  // --- ONG WORKFLOW (Jornadas de Ayuda Social + Firma de Beneficiarios) ---
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        Cargando jornadas activas de la ONG...
      </div>
    );
  }

  if (!selectedJornadaId) {
    return (
      <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '0 1rem' }}>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <CalendarDays
            size={48}
            color="var(--primary)"
            style={{ margin: '0 auto', marginBottom: '1rem' }}
          />
          <h2 style={{ color: 'var(--neutral-dark)', marginBottom: '1.5rem' }}>
            Seleccionar Jornada de Ayuda Social
          </h2>

          {jornadas.length === 0 ? (
            <p
              style={{
                color: 'var(--danger)',
                padding: '1rem',
                backgroundColor: '#ffebee',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              No hay jornadas de ayuda social activas en este momento. Por favor, solicita al
              administrador que habilite una jornada.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ color: 'var(--neutral-gray)', marginBottom: '1rem' }}>
                Elige la jornada de campo en la que se registrará la entrega de donaciones.
              </p>
              {jornadas.map((j) => (
                <button
                  key={j.id}
                  className="btn"
                  style={{
                    padding: '1rem',
                    border: '2px solid var(--primary)',
                    backgroundColor: 'white',
                    color: 'var(--primary)',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 'bold',
                    fontSize: '1.1rem',
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                  }}
                  onClick={() => handleSelectJornada(j.id)}
                >
                  <span>{j.nombre}</span>
                  <span
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 'normal',
                      color: 'var(--neutral-gray)',
                    }}
                  >
                    Fecha: {new Date(j.fecha).toLocaleDateString('es-VE')}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const selectedJornada = jornadas.find((j) => j.id === selectedJornadaId);

  return (
    <div
      className="animate-fade-in-up"
      style={{ maxWidth: '950px', margin: '0 auto', padding: '1rem' }}
    >
      {selectedJornada && (
        <div
          style={{
            backgroundColor: '#e8f5e9',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
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
            Jornada de Campo Activa: {selectedJornada.nombre}
          </div>
          <button
            onClick={() => {
              setSelectedJornadaId('');
              sessionStorage.removeItem('cnbv_active_jornada');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#1565c0',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            Cambiar
          </button>
        </div>
      )}

      {/* Encabezado ONG */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ color: 'var(--primary)', fontSize: '1.75rem', fontWeight: 800 }}>
          🤝 Beneficiarios y Atención Social (ONG)
        </h2>
        <p
          style={{
            color: 'var(--neutral-dark)',
            opacity: 0.8,
            fontSize: '0.9rem',
            marginTop: '0.25rem',
          }}
        >
          Captura de beneficiarios en campo, entrega de donaciones y registro con firma autógrafa
          digital.
        </p>
      </div>

      {/* Pestañas ONG */}
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
          <UserCheck size={18} /> Registro de Beneficiario en Campo
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
            boxShadow: activeTab === 'history' ? 'var(--shadow-sm)' : 'none',
          }}
        >
          <History size={18} /> Monitoreo e Historial de Entregas
        </button>
      </div>

      <div className="card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
        {activeTab === 'form' && (
          <RegistrationForm
            onSuccess={handleSuccess}
            jornadaId={selectedJornadaId}
            ongId={selectedJornada?.ong_id}
          />
        )}
        {activeTab === 'history' && <CapturedRecords />}
        {activeTab === 'success' && <SuccessScreen onNewRegistration={handleNewRegistration} />}
      </div>
    </div>
  );
};
