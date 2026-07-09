import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Wallet, 
  ArrowRightLeft, 
  Scale, 
  Search, 
  PieChart, 
  Camera, 
  Users,
  LogOut,
  Pin,
  PinOff,
  Menu,
  Lightbulb,
  UserCheck,
  CalendarDays
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, isSimulationMode } from '../services/api';
import { InternalControlModal } from './InternalControlModal';
import { getCaracasDateParts } from '../utils/formatters';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { profile, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(window.innerWidth >= 1024);
  const [isCosoModalOpen, setIsCosoModalOpen] = useState(false);
  const [currentRate, setCurrentRate] = useState<number | null>(null);
  
  if (!profile) return null;
  const role = profile.rol;

  // Revisar si el usuario ya vio el modal COSO
  React.useEffect(() => {
    if (profile && profile.id) {
      const hasSeen = localStorage.getItem(`has_seen_coso_${profile.id}`);
      if (!hasSeen) {
        setIsCosoModalOpen(true);
      }
    }

    // Obtener la tasa vigente para el día de HOY
    const fetchRate = async () => {
      try {
        const { dateString } = getCaracasDateParts();
        const tasaHoy = await api.getTasaByDate(dateString);
        if (tasaHoy) {
          setCurrentRate(tasaHoy.tasa);
        }
      } catch (error) {
        console.error("Error al obtener la tasa vigente:", error);
      }
    };
    fetchRate();
  }, [profile.id]);

  const handleCloseCosoModal = () => {
    if (profile && profile.id) {
      localStorage.setItem(`has_seen_coso_${profile.id}`, 'true');
    }
    setIsCosoModalOpen(false);
  };

  // Configuración de menús basados en roles
  const menuItems = [
    { id: 'dashboard', label: 'Tableros', icon: <LayoutDashboard size={20} strokeWidth={1.5} />, roles: ['administrador', 'auditor', 'director', 'donante'] },
    { id: 'requisitions', label: 'Requisiciones', icon: <ClipboardList size={20} strokeWidth={1.5} />, roles: ['administrador', 'coordinador', 'director', 'auxiliar_campo'] },
    { id: 'incomes', label: 'Ingresos', icon: <Wallet size={20} strokeWidth={1.5} />, roles: ['administrador', 'director', 'auditor'] },
    { id: 'tasas', label: 'Tasas BCV', icon: <ArrowRightLeft size={20} strokeWidth={1.5} />, roles: ['administrador', 'director'] },
    { id: 'reconciliation', label: 'Conciliación', icon: <Scale size={20} strokeWidth={1.5} />, roles: ['administrador', 'auditor'] },
    { id: 'audit', label: 'Auditoría', icon: <Search size={20} strokeWidth={1.5} />, roles: ['administrador', 'auditor'] },
    { id: 'budgets', label: 'Presupuestos', icon: <PieChart size={20} strokeWidth={1.5} />, roles: ['administrador', 'auditor', 'director'] },
    { id: 'field-entry', label: 'Cargar Gastos', icon: <Camera size={20} strokeWidth={1.5} />, roles: ['administrador', 'coordinador', 'director', 'auxiliar_campo'] },
    { id: 'jornadas', label: 'Jornadas', icon: <CalendarDays size={20} strokeWidth={1.5} />, roles: ['administrador', 'director'] },
    { id: 'beneficiaries', label: 'Beneficiarios', icon: <UserCheck size={20} strokeWidth={1.5} />, roles: ['administrador', 'coordinador', 'director', 'auxiliar_campo'] },
    { id: 'users', label: 'Usuarios', icon: <Users size={20} strokeWidth={1.5} />, roles: ['administrador'] }
  ];

  const visibleMenuItems = menuItems.filter(item => item.roles.includes(role));

  const handleResetSimulation = () => {
    if (window.confirm('¿Está seguro de reiniciar los datos simulados? Se borrarán todos los egresos y conciliaciones guardados en este navegador.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className={`app-container ${isPinned ? 'sidebar-pinned' : ''}`}>
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
            <span style={{ display: 'flex', alignItems: 'center' }}><Lightbulb size={16} strokeWidth={2} style={{marginRight: '6px'}} /> <strong>Modo Demostración Activo:</strong> Los datos se almacenan de manera local y segura en este navegador.</span>
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

      {/* Header Corporativo */}
      <header className="header-bar">
        <div className="header-logo-container">
          <button 
            className="hamburger-btn" 
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu size={24} />
          </button>
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
            {currentRate && (
              <div style={{ display: 'flex', alignItems: 'center', marginRight: '1rem', paddingRight: '1rem', borderRight: '1px solid var(--border-color)' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--neutral-dark)', fontWeight: 600, letterSpacing: '0.5px' }}>TASA BCV VIGENTE</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#16a34a' }}>{currentRate.toFixed(4)} Bs/$</div>
                </div>
              </div>
            )}
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
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderColor: '#cbd5e1', color: 'var(--neutral-dark)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <LogOut size={14} /> Salir
            </button>
          </div>
        </nav>
      </header>

      {/* Contenido Principal */}
      <main className="main-content">
        {/* User Info Bar (Desktop Only) */}
        <div className="desktop-user-bar" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
            {currentRate && (
              <div style={{ display: 'flex', alignItems: 'center', marginRight: '0.5rem', paddingRight: '1.5rem', borderRight: '1px solid var(--border-color)' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--neutral-dark)', fontWeight: 600, letterSpacing: '0.5px' }}>TASA BCV VIGENTE</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#16a34a' }}>{currentRate.toFixed(4)} Bs/$</div>
                </div>
              </div>
            )}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--neutral-dark)' }}>{profile.nombre_completo}</div>
              <span className="badge badge-info" style={{ fontSize: '0.65rem', padding: '0.1rem 0.5rem', marginTop: '2px', display: 'inline-block' }}>
                {role.toUpperCase()}
              </span>
            </div>
        </div>

        {children}
      </main>

      {/* Sidebar Navigation para Móvil */}
      <div 
        className={`sidebar-overlay ${isMobileMenuOpen ? 'open' : ''}`} 
        onClick={() => setIsMobileMenuOpen(false)}
      ></div>
      <aside className={`sidebar-container ${isMobileMenuOpen ? 'open' : ''} ${isPinned ? 'pinned' : ''}`}>
        <div className="sidebar-header" style={{ flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ display: 'flex', width: '100%', justifyContent: 'center', alignItems: 'center', position: 'relative', minHeight: '40px' }}>
            <img 
              src="https://cnbv.org/wp-content/uploads/2020/09/logo-cnbv.jpg" 
              alt="CNBV Logo" 
              className="sidebar-logo"
            />
            <button className="sidebar-close" onClick={() => setIsMobileMenuOpen(false)} style={{ position: 'absolute', right: 0 }}>×</button>
            <button 
              className="pin-btn" 
              onClick={() => setIsPinned(!isPinned)}
              title={isPinned ? 'Soltar Menú' : 'Fijar Menú'}
              style={{ position: 'absolute', right: '-5px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {isPinned ? <PinOff size={18} strokeWidth={1.5} /> : <Pin size={18} strokeWidth={1.5} />}
            </button>
          </div>
          <div className="user-info mobile-only-user-info" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.9rem' }}>{profile.nombre_completo}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--neutral-dark)' }}>{role.toUpperCase()}</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {visibleMenuItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsMobileMenuOpen(false);
              }}
              className={`sidebar-link ${activeTab === item.id ? 'active' : ''}`}
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px' }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              logout();
            }}
            className="sidebar-link"
            style={{ color: 'var(--danger)' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px' }}><LogOut size={20} strokeWidth={1.5} /></span>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
      {/* Modal de Control Interno (COSO) */}
      <InternalControlModal 
        isOpen={isCosoModalOpen} 
        onClose={handleCloseCosoModal} 
      />
    </div>
  );
};
