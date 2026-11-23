import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getMenuItems, getMenuIcon } from './menuConfig';
import { EKKLESIA_ROLE_OPTIONS, ONG_ROLE_OPTIONS } from '../utils/rolePermissions';
import './AppsDashboard.css';

interface AppCardDesignMeta {
  bg: string;
  border: string;
  accentColor: string;
  description: string;
}

const APP_CARD_STYLES: Record<string, AppCardDesignMeta> = {
  dashboard: {
    bg: '#e6eaf5',
    border: 'rgba(83, 97, 138, 0.28)',
    accentColor: '#43527a',
    description: 'Una visión de tu congregación.',
  },
  organization: {
    bg: '#dfecff',
    border: 'rgba(36, 92, 178, 0.28)',
    accentColor: '#1b5cb6',
    description: 'Identidad y datos de tu templo.',
  },
  miembros: {
    bg: '#fce2ee',
    border: 'rgba(174, 53, 109, 0.28)',
    accentColor: '#ae356d',
    description: 'Personas y vínculos de tu iglesia.',
  },
  jornadas: {
    bg: '#eee2fc',
    border: 'rgba(123, 67, 167, 0.28)',
    accentColor: '#7b43a7',
    description: 'Equipos, grupos y responsables.',
  },
  finance: {
    bg: '#ddf3e6',
    border: 'rgba(36, 115, 75, 0.28)',
    accentColor: '#24734b',
    description: 'Control de los movimientos diarios.',
  },
  incomes: {
    bg: '#ddf3e6',
    border: 'rgba(36, 115, 75, 0.28)',
    accentColor: '#24734b',
    description: 'Registro y control de ingresos.',
  },
  requisitions: {
    bg: '#dfecff',
    border: 'rgba(36, 92, 178, 0.28)',
    accentColor: '#1b5cb6',
    description: 'Solicitudes y aprobaciones de gasto.',
  },
  'field-entry': {
    bg: '#eee2fc',
    border: 'rgba(123, 67, 167, 0.28)',
    accentColor: '#7b43a7',
    description: 'Carga de comprobantes y soportes.',
  },
  budgets: {
    bg: '#fff0cb',
    border: 'rgba(145, 98, 12, 0.28)',
    accentColor: '#91620c',
    description: 'Planifica el uso de tus recursos.',
  },
  accounting: {
    bg: '#d9f2fa',
    border: 'rgba(18, 110, 137, 0.28)',
    accentColor: '#126e89',
    description: 'Organiza tus registros contables.',
  },
  reconciliation: {
    bg: '#d9f2fa',
    border: 'rgba(18, 110, 137, 0.28)',
    accentColor: '#126e89',
    description: 'Conciliación de movimientos bancarios.',
  },
  audit: {
    bg: '#d8f1ed',
    border: 'rgba(33, 111, 104, 0.28)',
    accentColor: '#216f68',
    description: 'Revisión y trazabilidad de fondos.',
  },
  inventory: {
    bg: '#ffe5d2',
    border: 'rgba(163, 84, 29, 0.28)',
    accentColor: '#a3541d',
    description: 'Bienes y recursos de la iglesia.',
  },
  calendar: {
    bg: '#e6e0ff',
    border: 'rgba(98, 70, 166, 0.28)',
    accentColor: '#6246a6',
    description: 'Cultos, reuniones y actividades.',
  },
  tasas: {
    bg: '#d8f1ed',
    border: 'rgba(33, 111, 104, 0.28)',
    accentColor: '#216f68',
    description: 'Consulta de tasas de referencia.',
  },
  catalog: {
    bg: '#ddf3e6',
    border: 'rgba(36, 115, 75, 0.28)',
    accentColor: '#24734b',
    description: 'Estructura y catálogo de partidas.',
  },
  users: {
    bg: '#f8dfde',
    border: 'rgba(161, 62, 59, 0.28)',
    accentColor: '#a13e3b',
    description: 'Accesos y permisos de tu equipo.',
  },
};

function extractLocationSummary(direccion?: string | null): string {
  if (!direccion) return 'Venezuela';
  const estadoMatch = direccion.match(/Estado\s+([^,]+)/i);
  const municipioMatch = direccion.match(/Municipio\s+([^,]+)/i);
  if (estadoMatch && municipioMatch) {
    return `${estadoMatch[1].trim()} · ${municipioMatch[1].trim()}`;
  }
  const parts = direccion
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[parts.length - 2]} · ${parts[parts.length - 1]}`;
  }
  return direccion;
}

function getFriendlyRoleLabel(role: string): string {
  if (role === 'administrador' || role === 'admin_iglesia') {
    return 'Administrador principal';
  }
  const allOptions = [...EKKLESIA_ROLE_OPTIONS, ...ONG_ROLE_OPTIONS];
  const matched = allOptions.find((o) => o.value === role);
  if (matched) return matched.label;
  return role.replace(/_/g, ' ');
}

export const AppsDashboard: React.FC = () => {
  const navigate = useNavigate();
  return <AppsDashboardContent navigate={navigate} />;
};

export const AppsDashboardContent: React.FC<{ navigate: (path: string) => void }> = ({
  navigate,
}) => {
  const { profile, logout, activeOng } = useAuth();

  if (!profile) return null;

  const visibleApps = getMenuItems(activeOng?.tipo_organizacion).filter((app) =>
    app.roles.includes(profile.rol),
  );

  const firstName = (profile.nombre_completo || 'Usuario').trim().split(/\s+/)[0];
  const locationSummary = extractLocationSummary(activeOng?.direccion);
  const roleLabel = getFriendlyRoleLabel(profile.rol);

  const trialEndsText = activeOng?.trial_ends_at
    ? `Vence el ${new Date(activeOng.trial_ends_at).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })}`
    : 'Plan activo en MATEO';

  return (
    <div className="ad-page">
      {/* Cabecera de la aplicación siempre visible (Figma node 218:4) */}
      <header className="ad-header">
        <div className="ad-top-accent" aria-hidden="true" />
        <div className="ad-header-inner">
          <div className="ad-brand-group">
            <img src="/mateo_logo_wordmark.png" alt="Logo Mateo" className="ad-logo" />
            <span className="ad-header-title">Panel de aplicaciones</span>
          </div>

          <div className="ad-header-meta">
            {activeOng && (
              <div className="ad-meta-block">
                <span className="ad-meta-primary">{activeOng.nombre}</span>
                <span className="ad-meta-secondary">{locationSummary}</span>
              </div>
            )}

            <div className="ad-meta-block">
              <span className="ad-meta-primary">{profile.nombre_completo}</span>
              <span className="ad-meta-secondary">{roleLabel}</span>
            </div>

            <button type="button" onClick={logout} className="ad-logout-btn">
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Espacio de la iglesia (Figma node 218:5) */}
      <main className="ad-main">
        {/* Bienvenida y estado del período de prueba */}
        <section className="ad-welcome-row" aria-label="Bienvenida">
          <div className="ad-welcome-copy">
            <h1 className="ad-welcome-title">Bienvenido a MATEO, {firstName}</h1>
            <p className="ad-welcome-subtitle">
              Tu iglesia ya tiene un lugar. Ahora, comencemos a organizarla.
            </p>
          </div>

          <div className="ad-trial-badge">
            <span className="ad-trial-badge-title">Prueba completa · 14 días</span>
            <span className="ad-trial-badge-sub">{trialEndsText}</span>
          </div>
        </section>

        {/* Primeros pasos (Figma node 218:7) */}
        <section className="ad-onboarding-card" aria-label="Primeros pasos">
          <div className="ad-onboarding-top">
            <div className="ad-onboarding-copy">
              <h2 className="ad-onboarding-title">Comienza con tu congregación</h2>
              <p className="ad-onboarding-subtitle">
                Ya registraste tu iglesia. Estos son tus siguientes pasos.
              </p>
            </div>

            <div className="ad-onboarding-progress">
              <span className="ad-onboarding-progress-label">1 de 4 pasos completados</span>
              <div className="ad-onboarding-bars" aria-hidden="true">
                <div className="ad-onboarding-bar ad-onboarding-bar--done" />
                <div className="ad-onboarding-bar" />
                <div className="ad-onboarding-bar" />
                <div className="ad-onboarding-bar" />
              </div>
            </div>
          </div>

          <div className="ad-onboarding-steps">
            <button
              type="button"
              className="ad-step-btn"
              onClick={() => navigate('/app/organization')}
            >
              <span className="ad-step-number ad-step-number--active">1</span>
              <span className="ad-step-text">
                <span className="ad-step-title ad-step-title--active">Completa el perfil →</span>
                <span className="ad-step-desc">Agrega horarios y datos de contacto.</span>
              </span>
            </button>

            <button type="button" className="ad-step-btn" onClick={() => navigate('/app/miembros')}>
              <span className="ad-step-number">2</span>
              <span className="ad-step-text">
                <span className="ad-step-title">Registra a tus miembros</span>
                <span className="ad-step-desc">Organiza a tu comunidad desde el inicio.</span>
              </span>
            </button>

            <button type="button" className="ad-step-btn" onClick={() => navigate('/app/users')}>
              <span className="ad-step-number">3</span>
              <span className="ad-step-text">
                <span className="ad-step-title">Invita a tu equipo</span>
                <span className="ad-step-desc">Comparte la gestión de tu iglesia.</span>
              </span>
            </button>
          </div>
        </section>

        {/* Aplicaciones de la iglesia (Figma node 218:8) */}
        <section className="ad-apps-section" aria-label="Tus aplicaciones">
          <div className="ad-apps-header">
            <h2 className="ad-apps-title">Tus aplicaciones</h2>
            <p className="ad-apps-subtitle">
              Todo lo que necesitas para administrar tu iglesia, en un solo lugar.
            </p>
          </div>

          <div className="ad-apps-grid">
            {visibleApps.map((app) => {
              const cardStyle = APP_CARD_STYLES[app.id] || {
                bg: '#f1f5f9',
                border: '#e2e8f0',
                accentColor: '#1b5cb6',
                description: 'Accede a las herramientas de este módulo.',
              };

              return (
                <button
                  key={app.id}
                  type="button"
                  disabled={app.disabled}
                  aria-disabled={app.disabled}
                  onClick={() => {
                    if (!app.disabled) navigate(`/app/${app.id}`);
                  }}
                  className="ad-app-card"
                  style={{
                    backgroundColor: cardStyle.bg,
                    borderColor: cardStyle.border,
                  }}
                >
                  <div className="ad-app-card-top" style={{ color: cardStyle.accentColor }}>
                    {getMenuIcon(app.iconName, 22)}
                    <ArrowRight size={16} />
                  </div>

                  <div className="ad-app-card-body">
                    <span className="ad-app-card-title">{app.label}</span>
                    <span className="ad-app-card-desc">{cardStyle.description}</span>
                  </div>
                </button>
              );
            })}

            {/* Celda de propósito de la plataforma (Figma node 218:138) */}
            <div className="ad-purpose-cell">
              <p className="ad-purpose-title">Al servicio de tu iglesia.</p>
              <p className="ad-purpose-desc">
                Menos tareas administrativas.
                <br />
                Más tiempo para tu comunidad.
              </p>
            </div>
          </div>
        </section>

        {/* Pie de página: Correo verificado y orientación (Figma node 218:9) */}
        <footer className="ad-footer-row">
          <div className="ad-verified-status">
            <Check size={16} />
            <span>Correo verificado</span>
          </div>

          <button
            type="button"
            className="ad-help-btn"
            onClick={() => navigate('/app/organization')}
          >
            ¿Necesitas orientación? Centro de ayuda →
          </button>
        </footer>
      </main>
    </div>
  );
};
