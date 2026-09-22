import React from 'react';

/**
 * SkeletonPageLoader — Skeleton genérico para el fallback de React.Suspense.
 * Muestra una estructura de página con encabezado, barra de acciones y tabla/contenido,
 * reduciendo el salto visual cuando un chunk JS termina de cargarse.
 */
export const SkeletonPageLoader: React.FC = () => {
  return (
    <div className="skeleton-page-loader" aria-label="Cargando módulo...">
      {/* Encabezado de página */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <div className="skeleton skeleton-title" style={{ width: '45%' }} />
          <div className="skeleton skeleton-text medium" />
        </div>
        <div className="skeleton skeleton-btn" style={{ width: 140, height: '2.5rem' }} />
      </div>

      {/* Barra de filtros */}
      <div
        style={{
          background: 'white',
          padding: '1.25rem 1.5rem',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
        }}
      >
        <div
          className="skeleton skeleton-text"
          style={{ flex: 2, height: '2.2rem', margin: 0, borderRadius: 8 }}
        />
        <div
          className="skeleton skeleton-text"
          style={{ flex: 1, height: '2.2rem', margin: 0, borderRadius: 8 }}
        />
        <div
          className="skeleton skeleton-text"
          style={{ width: 200, height: '2.2rem', margin: 0, borderRadius: 8 }}
        />
      </div>

      {/* Tabla skeleton */}
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        {/* Cabecera */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            padding: '1rem 1.5rem',
            display: 'flex',
            gap: '2rem',
          }}
        >
          {[2, 1, 1, 1, 1].map((flex, i) => (
            <div
              key={i}
              className="skeleton skeleton-text"
              style={{ flex, margin: 0, height: '0.85rem' }}
            />
          ))}
        </div>

        {/* Filas */}
        {Array.from({ length: 7 }).map((_, rowIdx) => (
          <div
            key={rowIdx}
            style={{
              padding: '1rem 1.5rem',
              borderBottom: rowIdx < 6 ? '1px solid #f1f5f9' : 'none',
              display: 'flex',
              gap: '2rem',
              alignItems: 'center',
            }}
          >
            <div style={{ flex: 2, display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div className="skeleton skeleton-avatar" />
              <div style={{ flex: 1 }}>
                <div className="skeleton skeleton-text medium" style={{ margin: '0 0 0.3rem 0' }} />
                <div className="skeleton skeleton-text short" style={{ margin: 0 }} />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div className="skeleton skeleton-text medium" style={{ margin: 0 }} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="skeleton skeleton-badge" />
            </div>
            <div style={{ flex: 1 }}>
              <div className="skeleton skeleton-badge" />
            </div>
            <div style={{ flex: 1, display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <div className="skeleton skeleton-btn" />
              <div className="skeleton skeleton-btn" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
