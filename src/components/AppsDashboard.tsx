import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMenuItems, getMenuIcon } from './menuConfig';
import { LogOut, Building } from 'lucide-react';

export const AppsDashboard: React.FC = () => {
  const { profile, logout, activeOng } = useAuth();
  const navigate = useNavigate();

  if (!profile) return null;

  // Filter apps permitted for current user role and organization type
  const visibleApps = getMenuItems(activeOng?.tipo_organizacion).filter((app) =>
    app.roles.includes(profile.rol),
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle, #f8fafc 0%, #e2e8f0 100%)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-primary, sans-serif)',
      }}
    >
      {/* Top Header Bar similar to Odoo */}
      <header
        style={{
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid #e2e8f0',
          padding: '0.75rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img
            src="/mateo_logo.png"
            alt="Logo MATEO"
            style={{
              height: '40px',
              width: '40px',
              objectFit: 'contain',
              borderRadius: '8px',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary, #0f172a)' }}>
              MATEO
            </span>
            <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>
              Panel de Aplicaciones
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>
              {profile.nombre_completo}
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '0.4rem',
                marginTop: '2px',
              }}
            >
              {activeOng && (
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    color: 'var(--primary)',
                    background: 'rgba(113, 75, 103, 0.08)',
                    padding: '0.1rem 0.5rem',
                    borderRadius: '4px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    maxWidth: '180px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={`Organización: ${activeOng.nombre}`}
                >
                  <Building size={11} style={{ flexShrink: 0 }} />
                  {activeOng.nombre}
                </span>
              )}
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  color: 'white',
                  background: 'var(--primary, #714B67)',
                  padding: '0.1rem 0.5rem',
                  borderRadius: '4px',
                  display: 'inline-block',
                  textTransform: 'uppercase',
                }}
              >
                {profile.rol.replace('_', ' ')}
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            style={{
              background: 'none',
              border: '1px solid #cbd5e1',
              color: '#475569',
              padding: '0.4rem 0.8rem',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.borderColor = '#94a3b8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
          >
            <LogOut size={14} />
            Salir
          </button>
        </div>
      </header>

      {/* Main Apps Grid Container */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3rem 2rem',
        }}
      >
        <div
          style={{
            maxWidth: '900px',
            width: '100%',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '2.5rem 2rem',
            justifyItems: 'center',
          }}
        >
          {visibleApps.map((app) => (
            <button
              key={app.id}
              onClick={() => navigate(`/app/${app.id}`)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '110px',
                outline: 'none',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {/* App Icon Container */}
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '16px',
                  backgroundColor: app.color,
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                  transition: 'box-shadow 0.2s',
                }}
              >
                {getMenuIcon(app.iconName, 34)}
              </div>

              {/* App Label */}
              <span
                style={{
                  marginTop: '0.75rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#334155',
                  textAlign: 'center',
                  width: '100%',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {app.label}
              </span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
};
