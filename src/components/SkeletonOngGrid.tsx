import React from 'react';

interface SkeletonOngGridProps {
  /** Número de tarjetas skeleton a mostrar. Por defecto 6. */
  cards?: number;
}

/**
 * SkeletonOngGrid — Skeleton screen para la grilla de ONGs en SaasOngs.
 * Refleja las tarjetas de organización con logo, nombre y botón de editar.
 */
export const SkeletonOngGrid: React.FC<SkeletonOngGridProps> = ({ cards = 6 }) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1.5rem',
      }}
      aria-label="Cargando organizaciones..."
    >
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="skeleton-ong-card">
          {/* Logo + nombre */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div className="skeleton skeleton-logo" />
            <div style={{ flex: 1 }}>
              <div className="skeleton skeleton-text medium" style={{ marginBottom: '0.4rem' }} />
              <div className="skeleton skeleton-badge" style={{ width: 110 }} />
              <div
                className="skeleton skeleton-text"
                style={{ width: '60%', marginTop: '0.4rem', height: '0.7em' }}
              />
            </div>
          </div>

          {/* Separador + botón */}
          <div
            style={{
              borderTop: '1px solid #f1f5f9',
              paddingTop: '0.75rem',
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <div className="skeleton skeleton-btn" style={{ width: 110 }} />
          </div>
        </div>
      ))}
    </div>
  );
};
