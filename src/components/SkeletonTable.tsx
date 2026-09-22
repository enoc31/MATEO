import React from 'react';

interface SkeletonTableProps {
  /** Número de filas skeleton a mostrar. Por defecto 6. */
  rows?: number;
  /** Número de columnas skeleton a mostrar. Por defecto 5. */
  cols?: number;
  /** Mostrar columna de avatar/icono en la primera celda. Por defecto true. */
  showAvatar?: boolean;
}

/**
 * SkeletonTable — Tabla skeleton reutilizable para listados con carga.
 * Usada en SaasUsers y cualquier otra vista de tabla.
 */
export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 6,
  cols = 5,
  showAvatar = true,
}) => {
  return (
    <div
      style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
      }}
      aria-label="Cargando tabla..."
    >
      {/* Cabecera de tabla */}
      <div
        style={{
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          padding: '1rem 1.5rem',
          display: 'flex',
          gap: '2rem',
        }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            className="skeleton skeleton-text"
            style={{
              flex: i === 0 ? 2 : 1,
              margin: 0,
              height: '0.85rem',
            }}
          />
        ))}
      </div>

      {/* Filas skeleton */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          style={{
            padding: '1rem 1.5rem',
            borderBottom: rowIdx < rows - 1 ? '1px solid #f1f5f9' : 'none',
            display: 'flex',
            gap: '2rem',
            alignItems: 'center',
          }}
        >
          {/* Primera celda — puede tener avatar */}
          <div style={{ flex: 2, display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {showAvatar && <div className="skeleton skeleton-avatar" />}
            <div style={{ flex: 1 }}>
              <div className="skeleton skeleton-text medium" style={{ margin: '0 0 0.3rem 0' }} />
              <div className="skeleton skeleton-text short" style={{ margin: 0 }} />
            </div>
          </div>

          {/* Celdas restantes */}
          {Array.from({ length: cols - 1 }).map((_, colIdx) => (
            <div key={colIdx} style={{ flex: 1 }}>
              {colIdx === cols - 2 ? (
                // Última columna — botones de acción
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <div className="skeleton skeleton-btn" />
                  <div className="skeleton skeleton-btn" />
                </div>
              ) : colIdx === 1 ? (
                // Columna de badge/estado
                <div className="skeleton skeleton-badge" />
              ) : (
                <div className="skeleton skeleton-text medium" style={{ margin: 0 }} />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
