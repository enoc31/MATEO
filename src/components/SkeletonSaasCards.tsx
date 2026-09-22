import React from 'react';

/**
 * SkeletonSaasCards — Skeleton screen para el SaasDashboard.
 * Refleja las 3 tarjetas de métricas (ONGs, Usuarios, Pendientes) + panel de bienvenida.
 */
export const SkeletonSaasCards: React.FC = () => {
  return (
    <div aria-label="Cargando estadísticas...">
      {/* Panel de bienvenida */}
      <div
        style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          marginBottom: '2rem',
        }}
      >
        <div className="skeleton skeleton-title" style={{ width: '55%' }} />
        <div className="skeleton skeleton-text wide" />
        <div className="skeleton skeleton-text medium" />
      </div>

      {/* 3 tarjetas de métricas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ flex: 1 }}>
              <div className="skeleton skeleton-text short" />
              <div
                className="skeleton"
                style={{ height: '2rem', width: '40%', borderRadius: 6, marginTop: '0.5rem' }}
              />
            </div>
            <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 10 }} />
          </div>
        ))}
      </div>
    </div>
  );
};
