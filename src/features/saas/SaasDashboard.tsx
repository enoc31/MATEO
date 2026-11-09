import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Building, Users, Clock, ShieldAlert } from 'lucide-react';
import { SkeletonSaasCards } from '../../components/SkeletonSaasCards';
import { SlackIntegrationPanel } from './SlackIntegrationPanel';

interface SaasStats {
  ongsCount: number;
  usersCount: number;
  pendingCount: number;
}

export const SaasDashboard: React.FC = () => {
  const [stats, setStats] = useState<SaasStats>({
    ongsCount: 0,
    usersCount: 0,
    pendingCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [ongs, users] = await Promise.all([api.getOngs(), api.getUsers()]);
        const pending = users.filter((u) => !u.aprobado);
        setStats({
          ongsCount: ongs.length,
          usersCount: users.length,
          pendingCount: pending.length,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error desconocido.';
        console.error('Error fetching SaaS dashboard statistics:', err);
        setError(`No se pudieron cargar las estadísticas. ${message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <SkeletonSaasCards />;
  }

  if (error) {
    return <div style={{ padding: '2rem', color: 'var(--danger)', fontWeight: 600 }}>{error}</div>;
  }

  const statCards = [
    {
      title: 'ONGs e Iglesias',
      value: stats.ongsCount,
      icon: <Building size={24} color="#0d9488" />,
      bgColor: '#f0fdfa',
      borderColor: '#ccfbf1',
    },
    {
      title: 'Usuarios Totales',
      value: stats.usersCount,
      icon: <Users size={24} color="#1e3a8a" />,
      bgColor: '#eff6ff',
      borderColor: '#dbeafe',
    },
    {
      title: 'Pendientes de Aprobación',
      value: stats.pendingCount,
      icon: <Clock size={24} color="#b45309" />,
      bgColor: '#fffbeb',
      borderColor: '#fef3c7',
      alert: stats.pendingCount > 0,
    },
  ];

  return (
    <div>
      <div
        style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
          marginBottom: '2rem',
        }}
      >
        <h2
          style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}
        >
          ¡Bienvenido al Panel del Control del SaaS!
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.85rem', lineHeight: '1.5' }}>
          Desde esta consola central puedes administrar todos los inquilinos (ONGs e Iglesias)
          registrados en la plataforma MATEO (Humanitaria & ekklesia), subir o actualizar sus
          logotipos, autorizar nuevos usuarios y reasignar perfiles.
        </p>
      </div>

      {/* Grid of metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {statCards.map((card, idx) => (
          <div
            key={idx}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              border: `1px solid ${card.borderColor}`,
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {card.alert && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  backgroundColor: '#ef4444',
                  color: 'white',
                  fontSize: '0.6rem',
                  fontWeight: 800,
                  padding: '0.15rem 0.5rem',
                  borderBottomLeftRadius: '6px',
                }}
              >
                ACCIÓN REQUERIDA
              </div>
            )}
            <div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#64748b',
                  textTransform: 'uppercase',
                }}
              >
                {card.title}
              </span>
              <div
                style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b', marginTop: '0.5rem' }}
              >
                {card.value}
              </div>
            </div>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '10px',
                backgroundColor: card.bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {stats.pendingCount > 0 && (
        <div
          style={{
            marginTop: '2rem',
            backgroundColor: '#fffbeb',
            border: '1px solid #fef3c7',
            borderRadius: '12px',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
          }}
        >
          <ShieldAlert size={20} color="#b45309" style={{ marginTop: '2px' }} />
          <div>
            <h4
              style={{
                fontWeight: 700,
                fontSize: '0.85rem',
                color: '#78350f',
                marginBottom: '0.25rem',
              }}
            >
              Hay usuarios pendientes de aprobación
            </h4>
            <p style={{ fontSize: '0.8rem', color: '#92400e', lineHeight: '1.4' }}>
              Existen {stats.pendingCount} perfiles esperando tu visto bueno. Ve a la pestaña de{' '}
              <strong>Usuarios del SaaS</strong> para aprobarlos y asignarles la organización
              correspondiente.
            </p>
          </div>
        </div>
      )}

      {/* Panel de Integración con Slack para el equipo interno de auditoría y revisores */}
      <div style={{ marginTop: '2.5rem' }}>
        <SlackIntegrationPanel />
      </div>
    </div>
  );
};
