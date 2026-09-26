import React, { useState, useCallback } from 'react';
import {
  LogOut,
  Pin,
  PinOff,
  Menu,
  Lightbulb,
  LayoutGrid,
  Building,
  Compass,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, isSimulationMode } from '../services/api';
import { InternalControlModal } from './InternalControlModal';
import { ChurchImplementationGuideModal } from '../features/auth/ChurchImplementationGuideModal';
import { getCaracasDateParts } from '../utils/formatters';
import { checkAndSyncBCVRate, forceSyncBCVRate } from '../utils/bcvSync';
import { useLocation, NavLink, useNavigate } from 'react-router-dom';
import { getMenuItems, getMenuIcon } from './menuConfig';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { profile, logout, activeOng } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(window.innerWidth >= 1024);
  const [isCosoModalOpen, setIsCosoModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const getInitialBCVRate = () => {
    const { dateString } = getCaracasDateParts();
    if (dateString >= '2026-09-22') {
      return { tasa: 852.4168, fecha: '2026-09-22' };
    }
    return { tasa: 849.564, fecha: '2026-09-21' };
  };

  const [initialBCV] = useState(getInitialBCVRate);
  const [currentRate, setCurrentRate] = useState<number>(initialBCV.tasa);
  const [rateDate, setRateDate] = useState<string>(initialBCV.fecha);
  const [isSyncingRate, setIsSyncingRate] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname.split('/')[2] || 'dashboard';

  const isHome = location.pathname === '/app' || location.pathname === '/app/';

  // Revisar si el usuario ya vio el modal COSO
  React.useEffect(() => {
    if (profile && profile.id) {
      const hasSeen = localStorage.getItem(`has_seen_coso_${profile.id}`);
      if (!hasSeen) {
        setIsCosoModalOpen(true);
      }
    }

    // Obtener la tasa vigente. El widget ya es visible con el valor inicial.
    const fetchRate = async () => {
      try {
        // Sincronizar en segundo plano sin bloquear la UI
        checkAndSyncBCVRate().catch(() => {});

        const { dateString } = getCaracasDateParts();

        // 1. Tasa exacta del día o la más reciente <= hoy
        let tasaSeleccionada = await api.getTasaByDate(dateString);

        // 2. Si no hay exacta, tomar la más reciente disponible <= hoy
        if (
          !tasaSeleccionada ||
          typeof tasaSeleccionada.tasa !== 'number' ||
          tasaSeleccionada.tasa <= 1
        ) {
          const todas = await api.getTasasBCV();
          const validas = (todas || []).filter((t) => t.fecha <= dateString);
          if (validas.length > 0) tasaSeleccionada = validas[0];
          else if (todas && todas.length > 0) tasaSeleccionada = todas[0];
        }

        // 3. Actualizar solo si obtuvimos un valor real válido
        if (
          tasaSeleccionada &&
          typeof tasaSeleccionada.tasa === 'number' &&
          tasaSeleccionada.tasa > 1
        ) {
          setCurrentRate(tasaSeleccionada.tasa);
          setRateDate(tasaSeleccionada.fecha);
        }
      } catch (error) {
        console.error('Error al obtener la tasa vigente:', error);
      }
    };
    fetchRate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  // Permite refrescar la tasa manualmente desde el header
  const handleRefreshRate = useCallback(async () => {
    setIsSyncingRate(true);
    try {
      const newRate = await forceSyncBCVRate();
      if (newRate && newRate > 1) {
        setCurrentRate(newRate);
        const allRates = await api.getTasasBCV();
        if (allRates && allRates.length > 0) setRateDate(allRates[0].fecha);
      } else {
        // Volver a leer lo que hay en la BD/localStorage
        const { dateString } = getCaracasDateParts();
        const tasaHoy = await api.getTasaByDate(dateString);
        if (tasaHoy && tasaHoy.tasa > 1) {
          setCurrentRate(tasaHoy.tasa);
          setRateDate(tasaHoy.fecha);
        }
      }
    } catch {
      // silencioso: la tasa actual sigue siendo válida
    } finally {
      setIsSyncingRate(false);
    }
  }, []);

  if (!profile) return null;

  if (isHome) {
    return <>{children}</>;
  }

  const role = profile.rol;

  const handleCloseCosoModal = () => {
    if (profile && profile.id) {
      localStorage.setItem(`has_seen_coso_${profile.id}`, 'true');
    }
    setIsCosoModalOpen(false);
  };

  const visibleMenuItems = getMenuItems(activeOng?.tipo_organizacion).filter((item) =>
    item.roles.includes(role),
  );

  const handleResetSimulation = () => {
    if (
      window.confirm(
        '¿Está seguro de reiniciar los datos simulados? Se borrarán todos los egresos y conciliaciones guardados en este navegador.',
      )
    ) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className={`app-container ${isPinned ? 'sidebar-pinned' : ''}`}>
      {/* Banner de Simulación */}
      {isSimulationMode && (
        <div
          style={{
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
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ display: 'flex', alignItems: 'center' }}>
              <Lightbulb size={16} strokeWidth={2} style={{ marginRight: '6px' }} />{' '}
              <strong>Modo Demostración Activo:</strong> Los datos se almacenan de manera local y
              segura en este navegador.
            </span>
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
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
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
          <button
            onClick={() => navigate('/app')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--primary, #714B67)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              marginRight: '8px',
              borderRadius: '6px',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.05)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            title="Panel de Aplicaciones"
          >
            <LayoutGrid size={22} strokeWidth={1.5} />
          </button>
          <img
            src={activeOng?.logo_url || '/mateo_logo.png'}
            alt={activeOng?.nombre || 'MATEO'}
            className="header-logo"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/app')}
            title="Volver al Panel"
          />
          <div
            className="header-title-wrap"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/app')}
            title="Volver al Panel"
          >
            <span className="header-title">{activeOng?.nombre || 'MATEO'}</span>
            <span className="header-subtitle">
              {activeOng?.tipo_organizacion === 'ekklesia'
                ? 'Gestión Eclesiástica'
                : 'Gestión Humanitaria'}
            </span>
          </div>
        </div>

        {/* Badge móvil para identificar ONG activa de manera prominente */}
        {activeOng && (
          <div
            className="header-ong-badge-mobile"
            onClick={() => navigate('/app/organization')}
            style={{ cursor: 'pointer' }}
            title={`Ver perfil de la organización: ${activeOng.nombre}`}
          >
            <Building size={13} style={{ flexShrink: 0 }} />
            <span>{activeOng.nombre}</span>
          </div>
        )}

        {/* Navegación de Escritorio */}
        <nav
          className="nav-menu-desktop"
          style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}
        >
          <ul className="nav-menu">
            {visibleMenuItems.map((item) => (
              <li key={item.id}>
                <NavLink
                  to={`/app/${item.id}`}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                  onClick={() => setIsMobileMenuOpen(false)} // Close menu on mobile
                >
                  <span>{getMenuIcon(item.iconName)}</span>
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>

          {/* Información de Usuario y Logout */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              borderLeft: '1px solid var(--border-color)',
              paddingLeft: '1.25rem',
            }}
          >
            {/* Launcher de Ruta Guiada */}
            <button
              onClick={() => setIsGuideModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: 'rgba(47, 90, 174, 0.08)',
                color: 'var(--primary)',
                border: '1px solid rgba(47, 90, 174, 0.2)',
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              title="Abrir la Ruta Guiada de Implementación Paso a Paso"
            >
              <Compass size={15} />
              <span>🚀 Ruta Guiada</span>
            </button>

            {/* Widget Tasa BCV — siempre visible, se actualiza en background */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                marginRight: '0.5rem',
                paddingRight: '0.75rem',
                borderRight: '1px solid var(--border-color)',
              }}
            >
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontSize: '0.6rem',
                    color: 'var(--neutral-dark)',
                    fontWeight: 600,
                    letterSpacing: '0.5px',
                  }}
                >
                  TASA BCV{rateDate && rateDate !== '...' ? ` · ${rateDate}` : ''}
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#16a34a' }}>
                  {currentRate.toFixed(4)} Bs/$
                </div>
              </div>
              <button
                onClick={handleRefreshRate}
                disabled={isSyncingRate}
                title="Actualizar tasa BCV"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: isSyncingRate ? 'not-allowed' : 'pointer',
                  color: '#16a34a',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  opacity: isSyncingRate ? 0.5 : 1,
                }}
              >
                <RefreshCw
                  size={12}
                  style={{ animation: isSyncingRate ? 'spin 1s linear infinite' : 'none' }}
                />
              </button>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{profile.nombre_completo}</div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: '0.4rem',
                  marginTop: '0.2rem',
                }}
              >
                {activeOng && (
                  <span
                    onClick={() => navigate('/app/organization')}
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: 'var(--primary)',
                      background: 'rgba(113, 75, 103, 0.08)',
                      padding: '0.12rem 0.5rem',
                      borderRadius: '4px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      maxWidth: '180px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      cursor: 'pointer',
                    }}
                    title={`Ver perfil de la organización: ${activeOng.nombre}`}
                  >
                    <Building size={11} style={{ flexShrink: 0 }} />
                    {activeOng.nombre}
                  </span>
                )}
                <span
                  className={`badge ${
                    role === 'administrador'
                      ? 'badge-danger'
                      : role === 'auditor'
                        ? 'badge-success'
                        : 'badge-info'
                  }`}
                  style={{ fontSize: '0.65rem', padding: '0.1rem 0.5rem' }}
                >
                  {role.toUpperCase()}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              className="btn btn-outline"
              style={{
                padding: '0.4rem 0.8rem',
                fontSize: '0.8rem',
                borderColor: '#cbd5e1',
                color: 'var(--neutral-dark)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <LogOut size={14} /> Salir
            </button>
          </div>
        </nav>
      </header>

      {/* Contenido Principal */}
      <main className="main-content">
        {/* User Info Bar (Desktop Only) */}
        <div
          className="desktop-user-bar"
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1.5rem',
            paddingBottom: '0.5rem',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          {/* Tasa BCV — visible en el bar de contenido principal (complementa al header) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              marginRight: '0.5rem',
              paddingRight: '1rem',
              borderRight: '1px solid var(--border-color)',
            }}
          >
            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontSize: '0.6rem',
                  color: 'var(--neutral-dark)',
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                }}
              >
                TASA BCV{rateDate && rateDate !== '...' ? ` · ${rateDate}` : ''}
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#16a34a' }}>
                {currentRate.toFixed(4)} Bs/$
              </div>
            </div>
            <button
              onClick={handleRefreshRate}
              disabled={isSyncingRate}
              title="Actualizar tasa BCV"
              style={{
                background: 'none',
                border: 'none',
                cursor: isSyncingRate ? 'not-allowed' : 'pointer',
                color: '#16a34a',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                opacity: isSyncingRate ? 0.5 : 1,
              }}
            >
              <RefreshCw
                size={12}
                style={{ animation: isSyncingRate ? 'spin 1s linear infinite' : 'none' }}
              />
            </button>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--neutral-dark)' }}>
              {profile.nombre_completo}
            </div>
            <span
              className="badge badge-info"
              style={{
                fontSize: '0.65rem',
                padding: '0.1rem 0.5rem',
                marginTop: '2px',
                display: 'inline-block',
              }}
            >
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
      <aside
        className={`sidebar-container ${isMobileMenuOpen ? 'open' : ''} ${isPinned ? 'pinned' : ''}`}
      >
        <div
          className="sidebar-header"
          style={{ flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}
        >
          <div
            style={{
              display: 'flex',
              width: '100%',
              justifyContent: 'center',
              alignItems: 'center',
              position: 'relative',
              minHeight: '40px',
            }}
          >
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                navigate('/app');
              }}
              style={{
                position: 'absolute',
                left: 0,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Panel de Aplicaciones"
            >
              <LayoutGrid size={20} strokeWidth={1.5} />
            </button>
            <img
              src={activeOng?.logo_url || '/mateo_logo.png'}
              alt={activeOng?.nombre || 'MATEO'}
              className="sidebar-logo"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setIsMobileMenuOpen(false);
                navigate('/app');
              }}
            />
            <button
              className="sidebar-close"
              onClick={() => setIsMobileMenuOpen(false)}
              style={{ position: 'absolute', right: 0 }}
            >
              ×
            </button>
            <button
              className="pin-btn"
              onClick={() => setIsPinned(!isPinned)}
              title={isPinned ? 'Soltar Menú' : 'Fijar Menú'}
              style={{
                position: 'absolute',
                right: '-5px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isPinned ? (
                <PinOff size={18} strokeWidth={1.5} />
              ) : (
                <Pin size={18} strokeWidth={1.5} />
              )}
            </button>
          </div>
          <div
            className="user-info mobile-only-user-info"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.9rem' }}>
              {profile.nombre_completo}
            </span>
            {activeOng && (
              <span
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--primary)',
                  background: 'rgba(113, 75, 103, 0.08)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '4px',
                  marginTop: '0.25rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  maxWidth: '220px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={activeOng.nombre}
              >
                <Building size={12} style={{ flexShrink: 0 }} />
                {activeOng.nombre}
              </span>
            )}
            <span
              style={{ fontSize: '0.75rem', color: 'var(--neutral-dark)', marginTop: '0.25rem' }}
            >
              {role.toUpperCase()}
            </span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {visibleMenuItems.map((item) => (
            <li key={item.id}>
              <NavLink
                to={`/app/${item.id}`}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="sidebar-icon">{getMenuIcon(item.iconName)}</span>
                <span className="sidebar-text">{item.label}</span>
                {currentPath === item.id && <div className="active-indicator" />}
              </NavLink>
            </li>
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
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
              }}
            >
              <LogOut size={20} strokeWidth={1.5} />
            </span>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
      {/* Modal de Control Interno (COSO) */}
      <InternalControlModal isOpen={isCosoModalOpen} onClose={handleCloseCosoModal} />
      {/* Modal de Ruta Guiada de Implementación */}
      <ChurchImplementationGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
      />
    </div>
  );
};
