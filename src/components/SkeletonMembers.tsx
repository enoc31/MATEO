import React from 'react';

interface SkeletonMembersProps {
  /** Modos de visualización: 'cards' o 'list'. Por defecto 'cards'. */
  viewMode?: 'cards' | 'list';
  /** Cantidad de elementos a mostrar. Por defecto 6. */
  count?: number;
}

/**
 * SkeletonMembers — Pantalla Skeleton Shimmer optimizada para el módulo de Miembros y Beneficiarios.
 * Proporciona retroalimentación visual instantánea tanto en vista Tarjetas como en vista Lista.
 */
export const SkeletonMembers: React.FC<SkeletonMembersProps> = ({
  viewMode = 'cards',
  count = 6,
}) => {
  if (viewMode === 'list') {
    return (
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
        }}
        aria-label="Cargando directorio de miembros..."
      >
        <div
          style={{
            backgroundColor: '#F8FAFC',
            borderBottom: '2px solid #E2E8F0',
            padding: '1rem 1.2rem',
            display: 'flex',
            gap: '1.5rem',
          }}
        >
          <div className="skeleton skeleton-text" style={{ width: '25%', margin: 0 }} />
          <div className="skeleton skeleton-text" style={{ width: '15%', margin: 0 }} />
          <div className="skeleton skeleton-text" style={{ width: '20%', margin: 0 }} />
          <div className="skeleton skeleton-text" style={{ width: '10%', margin: 0 }} />
          <div className="skeleton skeleton-text" style={{ width: '20%', margin: 0 }} />
          <div className="skeleton skeleton-text" style={{ width: '10%', margin: 0 }} />
        </div>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            style={{
              padding: '1rem 1.2rem',
              borderBottom: i < count - 1 ? '1px solid #F1F5F9' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', width: '25%' }}>
              <div className="skeleton skeleton-avatar" style={{ width: 40, height: 40 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton skeleton-text medium" style={{ margin: '0 0 0.3rem 0' }} />
                <div className="skeleton skeleton-text short" style={{ margin: 0 }} />
              </div>
            </div>
            <div className="skeleton skeleton-text short" style={{ width: '15%', margin: 0 }} />
            <div className="skeleton skeleton-badge" style={{ width: '120px' }} />
            <div className="skeleton skeleton-badge" style={{ width: '50px' }} />
            <div className="skeleton skeleton-text medium" style={{ width: '20%', margin: 0 }} />
            <div className="skeleton skeleton-btn" style={{ width: '90px' }} />
          </div>
        ))}
      </div>
    );
  }

  // Vista 'cards' (predeterminada)
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
        gap: '1.2rem',
      }}
      aria-label="Cargando tarjetas de miembros..."
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="skeleton-card"
          style={{
            borderRadius: '18px',
            padding: '1.3rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1rem',
              }}
            >
              <div
                className="skeleton skeleton-avatar"
                style={{ width: '56px', height: '56px', borderRadius: '16px' }}
              />
              <div style={{ flex: 1 }}>
                <div className="skeleton skeleton-title" style={{ width: '75%', margin: 0 }} />
                <div
                  className="skeleton skeleton-text short"
                  style={{ marginTop: '0.4rem', margin: 0 }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem' }}>
              <div className="skeleton skeleton-badge" style={{ width: '110px' }} />
              <div className="skeleton skeleton-badge" style={{ width: '90px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div className="skeleton skeleton-text medium" style={{ margin: 0 }} />
              <div className="skeleton skeleton-text wide" style={{ margin: 0 }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.8rem' }}>
            <div className="skeleton skeleton-btn" style={{ flex: 1, height: '36px' }} />
            <div className="skeleton skeleton-btn" style={{ width: '36px', height: '36px' }} />
            <div className="skeleton skeleton-btn" style={{ width: '36px', height: '36px' }} />
          </div>
        </div>
      ))}
    </div>
  );
};
