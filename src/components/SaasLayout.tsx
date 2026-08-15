import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Building, Users, LogOut, Menu } from 'lucide-react';

interface SaasLayoutProps {
  children: React.ReactNode;
}

export const SaasLayout: React.FC<SaasLayoutProps> = ({ children }) => {
  const { profile, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!profile || profile.rol !== 'super_admin') {
    return null;
  }

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Panel de Control',
      path: '/saas-admin/dashboard',
      icon: <LayoutDashboard size={20} strokeWidth={1.5} />,
    },
    {
      id: 'ongs',
      label: 'ONGs e Iglesias',
      path: '/saas-admin/ongs',
      icon: <Building size={20} strokeWidth={1.5} />,
    },
    {
      id: 'users',
      label: 'Usuarios del SaaS',
      path: '/saas-admin/users',
      icon: <Users size={20} strokeWidth={1.5} />,
    },
  ];

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#f1f5f9',
        fontFamily: 'var(--font-primary, sans-serif)',
      }}
    >
      {/* Mobile Hamburger toggle */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        style={{
          position: 'fixed',
          top: '1rem',
          left: '1rem',
          zIndex: 100,
          background: 'white',
          border: '1px solid #cbd5e1',
          padding: '0.5rem',
          borderRadius: '6px',
          cursor: 'pointer',
          display: 'none',
        }}
        className="saas-mobile-toggle"
      >
        <Menu size={20} />
      </button>

      {/* Sidebar navigation */}
      <aside
        style={{
          width: '260px',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '4px 0 10px rgba(0,0,0,0.05)',
          zIndex: 90,
          transition: 'transform 0.3s ease',
        }}
        className={`saas-sidebar ${isMobileMenuOpen ? 'open' : ''}`}
      >
        {/* Sidebar Brand header */}
        <div
          style={{
            padding: '1.5rem',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#0D9488',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1rem',
              color: 'white',
            }}
          >
            M
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '0.5px' }}>
              MATEO SaaS
            </div>
            <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>
              SaaS Admin Center
            </span>
          </div>
        </div>

        {/* Sidebar Nav Links */}
        <nav
          style={{
            flex: 1,
            padding: '1.5rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.id}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  backgroundColor: isActive ? 'rgba(13, 148, 136, 0.15)' : 'transparent',
                  borderLeft: isActive ? '3px solid #0D9488' : '3px solid transparent',
                  textDecoration: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#94a3b8';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {item.icon}
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer / User section */}
        <div
          style={{
            padding: '1.25rem',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#cbd5e1',
                color: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              SA
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  color: '#f8fafc',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {profile.nombre_completo}
              </div>
              <span
                style={{
                  fontSize: '0.65rem',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  fontWeight: 800,
                }}
              >
                Super Admin
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            style={{
              width: '100%',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              border: 'none',
              borderRadius: '6px',
              padding: '0.6rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)')}
          >
            <LogOut size={14} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main content pane */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
        {/* Top Header bar */}
        <header
          style={{
            height: '60px',
            backgroundColor: 'white',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 2rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontWeight: 700, color: '#475569', fontSize: '0.95rem' }}>
            SaaS Central Management Console
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span
              style={{
                fontSize: '0.7rem',
                color: '#0d9488',
                backgroundColor: '#f0fdfa',
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                fontWeight: 700,
              }}
            >
              Control Total
            </span>
          </div>
        </header>

        {/* Content body wrapper */}
        <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>{children}</main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .saas-sidebar {
            position: fixed !important;
            height: 100vh;
            transform: translateX(-100%);
          }
          .saas-sidebar.open {
            transform: translateX(0);
          }
          .saas-mobile-toggle {
            display: block !important;
          }
          main {
            padding: 1rem !important;
          }
        }
      `}</style>
    </div>
  );
};
