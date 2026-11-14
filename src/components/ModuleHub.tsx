import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Construction } from 'lucide-react';

export interface ModuleHubLink {
  to: string;
  label: string;
  description: string;
  /** Roles con acceso a la pantalla destino. Sin valor, el enlace es visible para todos. */
  roles?: string[];
}

interface ModuleHubProps {
  title: string;
  description: string;
  /** Secciones existentes que viven dentro de este módulo. */
  links?: ModuleHubLink[];
  /** Texto del aviso cuando el módulo aún no está completo. */
  statusNote?: string;
  /** Rol del usuario actual: solo se muestran los enlaces a los que tiene acceso. */
  userRole?: string;
}

/**
 * Pantalla de entrada de un módulo agrupador (por ejemplo Contabilidad) o de un
 * módulo planteado que todavía está en desarrollo (por ejemplo Inventario).
 */
export const ModuleHub: React.FC<ModuleHubProps> = ({
  title,
  description,
  links = [],
  statusNote,
  userRole,
}) => {
  const visibleLinks = links.filter(
    (link) => !link.roles || (userRole !== undefined && link.roles.includes(userRole)),
  );

  return (
    <section aria-labelledby="module-hub-title" style={{ maxWidth: '860px', margin: '0 auto' }}>
      <h1
        id="module-hub-title"
        style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}
      >
        {title}
      </h1>
      <p style={{ color: '#475569', marginBottom: '1.5rem' }}>{description}</p>

      {statusNote && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.9rem 1rem',
            borderRadius: '10px',
            background: '#fffbeb',
            border: '1px solid #fcd34d',
            color: '#92400e',
            marginBottom: '1.5rem',
          }}
        >
          <Construction size={18} aria-hidden="true" />
          <span>{statusNote}</span>
        </div>
      )}

      {visibleLinks.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '0.75rem' }}>
          {visibleLinks.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem 1.25rem',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  textDecoration: 'none',
                  color: '#1e293b',
                }}
              >
                <span>
                  <strong style={{ display: 'block' }}>{link.label}</strong>
                  <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{link.description}</span>
                </span>
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
