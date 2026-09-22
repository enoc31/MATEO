import React from 'react';

/**
 * SkeletonDashboard — Skeleton screen para el tablero principal.
 * Refleja la estructura real del Dashboard: 3 tarjetas KPI, 2 gráficos, barra de progreso.
 */
export const SkeletonDashboard: React.FC = () => {
  return (
    <div className="animate-fade-in-up" aria-label="Cargando tablero...">
      {/* Encabezado */}
      <div style={{ marginBottom: '2rem' }}>
        <div className="skeleton skeleton-title" style={{ width: '60%' }} />
        <div className="skeleton skeleton-text wide" style={{ marginTop: '0.5rem' }} />
      </div>

      {/* Banner de guía */}
      <div
        className="skeleton-card"
        style={{
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
          <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 12 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton skeleton-text medium" />
            <div className="skeleton skeleton-text wide" />
          </div>
        </div>
        <div className="skeleton skeleton-btn" style={{ width: 140 }} />
      </div>

      {/* 3 Tarjetas KPI */}
      <div className="grid-cols-3" style={{ marginBottom: '2rem' }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton-card" style={{ borderLeft: '5px solid #e2e8f0' }}>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
            >
              <div style={{ flex: 1 }}>
                <div className="skeleton skeleton-text short" />
                <div className="skeleton skeleton-kpi-value" />
              </div>
              <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 8 }} />
            </div>
            <div
              style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.8rem', marginTop: '0.5rem' }}
            >
              <div className="skeleton skeleton-text wide" style={{ marginBottom: '0.4rem' }} />
              <div className="skeleton skeleton-text medium" />
            </div>
          </div>
        ))}
      </div>

      {/* 2 Gráficos */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
          gap: '2rem',
          marginBottom: '2rem',
        }}
      >
        {[1, 2].map((i) => (
          <div key={i} className="skeleton-card" style={{ height: 400 }}>
            <div className="skeleton skeleton-title" style={{ width: '55%' }} />
            <div className="skeleton skeleton-chart" style={{ flex: 1, height: 310 }} />
          </div>
        ))}
      </div>

      {/* Barra de ejecución presupuestaria */}
      <div className="skeleton-card">
        <div className="skeleton skeleton-title" style={{ width: '70%' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div className="skeleton skeleton-text medium" />
          <div className="skeleton skeleton-text" style={{ width: 180 }} />
        </div>
        {/* Barra de progreso */}
        <div
          className="skeleton"
          style={{ height: 24, borderRadius: 9999, marginBottom: '1.5rem' }}
        />
        {/* 3 sub-tarjetas */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
          }}
        >
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: 8 }}>
              <div className="skeleton skeleton-text short" style={{ margin: '0 auto 0.5rem' }} />
              <div
                className="skeleton skeleton-kpi-value"
                style={{ margin: '0 auto', width: '70%' }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
