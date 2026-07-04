import React from 'react';
import { useAuth } from '../context/AuthContext';
import { isSimulationMode } from '../services/api';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { profile, logout } = useAuth();
  
  if (!profile) return null;
  const role = profile.rol;

  // Configuración de menús basados en roles
  const menuItems = [
    { id: 'dashboard', label: 'Tableros', icon: '📊', roles: ['administrador', 'auditor', 'director', 'donante'] },
    { id: 'requisitions', label: 'Requisiciones', icon: '📋', roles: ['administrador', 'coordinador', 'director', 'auxiliar_campo'] },
    { id: 'incomes', label: 'Ingresos', icon: '💰', roles: ['administrador', 'director', 'auditor'] },
    { id: 'tasas', label: 'Tasas BCV', icon: '💱', roles: ['administrador', 'director'] },
    { id: 'reconciliation', label: 'Conciliación', icon: '⚖️', roles: ['administrador', 'auditor'] },
    { id: 'audit', label: 'Auditoría', icon: '🔍', roles: ['administrador', 'auditor'] },
    { id: 'budgets', label: 'Presupuestos', icon: '📑', roles: ['administrador', 'auditor', 'director'] },
    { id: 'field-entry', label: 'Cargar Gastos', icon: '📸', roles: ['administrador', 'coordinador', 'director', 'auxiliar_campo'] },
    { id: 'users', label: 'Usuarios', icon: '👥', roles: ['administrador'] }
  ];

  const visibleMenuItems = menuItems.filter(item => item.roles.includes(role));

  const handleResetSimulation = () => {
    if (window.confirm('¿Está seguro de reiniciar los datos simulados? Se borrarán todos los egresos y conciliaciones guardados en este navegador.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="app-container">
      {/* Banner de Simulación */}
      {isSimulationMode && (
        <div style={{
          backgroundColor: '#008fa6',
          color: '#ffffff',
          padding: '0.4rem 1rem',
          fontSize: '0.75rem',
          fontWeight: 600,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: 'inset 0 -2px 5px rgba(0,0,0,0.1)',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>💡 <strong>Modo Demostración Activo:</strong> Los datos se almacenan de manera local y segura en este navegador.</span>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={handleResetSimulation} 
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: '#ffffff',
                padding: '0.2rem 0.6rem',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.7rem',
                fontWeight: 700,
                transition: 'background 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            >
              Reiniciar Simulación
            </button>
          </div>
        </div>
      )}

      {/* Header Corporativo (Escritorio) */}
      <header className="header-bar">
        <div className="header-logo-container">
          <img 
            src="https://cnbv.org/wp-content/uploads/2020/09/logo-cnbv.jpg" 
            alt="CNBV Logo" 
            className="header-logo"
          />
          <div className="header-title-wrap">
            <span className="header-title">Auditoría Donaciones</span>
            <span className="header-subtitle">Convención Nacional Bautista</span>
          </div>
        </div>

        {/* Navegación de Escritorio */}
        <nav className="nav-menu-desktop" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <ul className="nav-menu">
            {visibleMenuItems.map(item => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`nav-link ${activeTab === item.id ? 'active' : ''}`}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>

          {/* Información de Usuario y Logout */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem',
            borderLeft: '1px solid var(--border-color)',
            paddingLeft: '1.5rem'
          }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{profile.nombre_completo}</div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.1rem' }}>
                <span className={`badge ${
                  role === 'administrador' ? 'badge-danger' : 
                  role === 'auditor' ? 'badge-success' : 'badge-info'
                }`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.5rem' }}>
                  {role.toUpperCase()}
                </span>
              </div>
            </div>
            
            <button
              onClick={logout}
              className="btn btn-outline"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderColor: '#cbd5e1', color: 'var(--neutral-dark)' }}
            >
              Salir
            </button>
          </div>
        </nav>
      </header>

      {/* Contenido Principal */}
      <main className="main-content">
        {children}
      </main>

      {/* Navegación Móvil (Bottom Bar) */}
      <nav className="nav-menu" style={{ display: 'none' }}>
        {visibleMenuItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`nav-link ${activeTab === item.id ? 'active' : ''}`}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
        <button
          onClick={logout}
          className="nav-link"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--danger)'
          }}
        >
          <span className="nav-icon">🚪</span>
          <span>Salir</span>
        </button>
      </nav>

      {/* Script para activar menú responsivo por estilos CSS */}
      <style>{`
        @media (max-width: 768px) {
          .nav-menu-desktop {
            display: none !important;
          }
          nav.nav-menu {
            display: flex !important;
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            background-color: #ffffff;
            border-top: 1px solid var(--border-color);
            padding: 0.5rem 1rem;
            justify-content: space-around;
            box-shadow: 0 -4px 10px rgba(0,0,0,0.05);
            z-index: 999;
          }
          .main-content {
            padding-bottom: 5.5rem !important;
          }
        }
      `}</style>
    </div>
  );
};
