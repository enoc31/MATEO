import React, { useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { NativeNavLink } from './NativeNavLink';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Compass,
  LayoutGrid,
  LogOut,
  Wallet,
} from 'lucide-react';
import { getMenuIcon, type MenuItemConfig } from './menuConfig';
import './SidebarNav.css';

export interface SidebarNavProps {
  nativeLinks?: boolean;
  visibleMenuItems: MenuItemConfig[];
  currentPath: string;
  isPinned: boolean;
  onTogglePin: () => void;
  isMobileMenuOpen: boolean;
  onCloseMobileMenu: () => void;
  userName: string;
  userRole: string;
  orgName?: string;
  orgLogoUrl?: string | null;
  onNavigateHome: () => void;
  onOpenGuide: () => void;
  onLogout: () => void;
}

const FINANCE_ITEM_IDS = new Set([
  'incomes',
  'requisitions',
  'field-entry',
  'reconciliation',
  'audit',
  'budgets',
  'tasas',
]);

export const SidebarNav: React.FC<SidebarNavProps> = ({
  nativeLinks = false,
  visibleMenuItems,
  currentPath,
  isPinned,
  onTogglePin,
  isMobileMenuOpen,
  onCloseMobileMenu,
  userName,
  userRole,
  orgName,
  orgLogoUrl,
  onNavigateHome,
  onOpenGuide,
  onLogout,
}) => {
  const NavigationLink = nativeLinks ? NativeNavLink : NavLink;
  const [financeOpen, setFinanceOpen] = useState<boolean>(FINANCE_ITEM_IDS.has(currentPath));

  const { dashboardItem, financeItems, communityItems } = useMemo(() => {
    const dashboard = visibleMenuItems.find((item) => item.id === 'dashboard');
    const finance = visibleMenuItems.filter((item) => FINANCE_ITEM_IDS.has(item.id));
    const community = visibleMenuItems.filter(
      (item) => item.id !== 'dashboard' && !FINANCE_ITEM_IDS.has(item.id),
    );
    return {
      dashboardItem: dashboard,
      financeItems: finance,
      communityItems: community,
    };
  }, [visibleMenuItems]);

  const isFinanceActive = FINANCE_ITEM_IDS.has(currentPath);
  const initials = (userName || 'M')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  return (
    <aside
      id="mobile-sidebar-drawer"
      aria-label="Menú principal de navegación"
      aria-hidden={!isMobileMenuOpen && typeof window !== 'undefined' && window.innerWidth < 769}
      className={`sn-sidebar ${isPinned ? 'sn-sidebar--expanded' : ''} ${
        isMobileMenuOpen ? 'sn-sidebar--mobile-open' : ''
      }`}
    >
      {/* Botón circular de colapso/expansión en escritorio */}
      <button
        type="button"
        className="sn-collapse-btn"
        onClick={onTogglePin}
        aria-label={isPinned ? 'Contraer barra lateral' : 'Expandir barra lateral'}
        title={isPinned ? 'Contraer menú' : 'Expandir menú'}
      >
        {isPinned ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      {/* Cabecera de Perfil / Organización */}
      <div className="sn-header">
        <button
          type="button"
          className="sn-avatar-btn"
          onClick={() => {
            onCloseMobileMenu();
            onNavigateHome();
          }}
          title="Ir al Panel de Aplicaciones"
          aria-label="Ir al Panel de Aplicaciones"
        >
          {orgLogoUrl ? <img src={orgLogoUrl} alt={orgName || 'MATEO'} /> : initials}
        </button>

        <div className="sn-user-meta">
          <div className="sn-user-role">{userRole.toUpperCase()}</div>
          <div className="sn-user-name" title={userName}>
            {userName}
          </div>
        </div>

        <button
          type="button"
          className="sn-mobile-close"
          onClick={onCloseMobileMenu}
          aria-label="Cerrar menú de navegación"
        >
          ×
        </button>
      </div>

      {/* Navegación agrupada */}
      <nav className="sn-scroll">
        <div>
          <div className="sn-section-label">Principal</div>
          <ul className="sn-list">
            <li className="sn-item-wrap">
              <button
                type="button"
                className="sn-link"
                onClick={() => {
                  onCloseMobileMenu();
                  onNavigateHome();
                }}
                title="Panel de Aplicaciones"
              >
                <span className="sn-item-icon">
                  <LayoutGrid size={18} strokeWidth={1.8} />
                </span>
                <span className="sn-item-label">Panel de Apps</span>
              </button>
            </li>

            {dashboardItem && (
              <li className="sn-item-wrap">
                <NavigationLink
                  to={`/app/${dashboardItem.id}`}
                  className={({ isActive }) => `sn-link ${isActive ? 'active' : ''}`}
                  onClick={onCloseMobileMenu}
                  title={dashboardItem.label}
                >
                  <span className="sn-item-icon">{getMenuIcon(dashboardItem.iconName)}</span>
                  <span className="sn-item-label">{dashboardItem.label}</span>
                </NavigationLink>
              </li>
            )}

            {financeItems.length > 0 && (
              <li className="sn-item-wrap">
                <button
                  type="button"
                  className={`sn-link ${isFinanceActive ? 'sn-link--group-active' : ''}`}
                  onClick={() => setFinanceOpen((prev) => !prev)}
                  aria-expanded={financeOpen}
                >
                  <span className="sn-item-icon">
                    <Wallet size={18} strokeWidth={1.8} />
                  </span>
                  <span className="sn-item-label">Finanzas y Auditoría</span>
                  <ChevronDown
                    size={15}
                    className={`sn-item-chevron ${financeOpen ? 'sn-item-chevron--open' : ''}`}
                  />
                </button>

                {/* Submenú árbol cuando está expandido */}
                {(isPinned || isMobileMenuOpen) && financeOpen && (
                  <ul className="sn-submenu">
                    {financeItems.map((item) => (
                      <li key={item.id}>
                        {item.disabled ? (
                          <span className="sn-sublink sn-link--disabled" aria-disabled="true">
                            {item.label}
                          </span>
                        ) : (
                          <NavigationLink
                            to={`/app/${item.id}`}
                            className={({ isActive }) => `sn-sublink ${isActive ? 'active' : ''}`}
                            onClick={onCloseMobileMenu}
                          >
                            {item.label}
                          </NavigationLink>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {/* Popover flotante cuando está colapsado en escritorio */}
                <div className="sn-popover" role="menu" aria-label="Finanzas y Auditoría">
                  <div className="sn-popover-title">Finanzas y Auditoría</div>
                  {financeItems.map((item) =>
                    item.disabled ? (
                      <span
                        key={item.id}
                        className="sn-sublink sn-link--disabled"
                        aria-disabled="true"
                      >
                        {item.label}
                      </span>
                    ) : (
                      <NavigationLink
                        key={item.id}
                        to={`/app/${item.id}`}
                        className={({ isActive }) => `sn-sublink ${isActive ? 'active' : ''}`}
                        onClick={onCloseMobileMenu}
                      >
                        {item.label}
                      </NavigationLink>
                    ),
                  )}
                </div>
              </li>
            )}
          </ul>
        </div>

        {communityItems.length > 0 && (
          <div>
            <div className="sn-section-label">Comunidad y Gestión</div>
            <ul className="sn-list">
              {communityItems.map((item) => (
                <li key={item.id} className="sn-item-wrap">
                  {item.disabled ? (
                    <span
                      className="sn-link sn-link--disabled"
                      aria-disabled="true"
                      title={item.label}
                    >
                      <span className="sn-item-icon">{getMenuIcon(item.iconName)}</span>
                      <span className="sn-item-label">{item.label}</span>
                    </span>
                  ) : (
                    <NavigationLink
                      to={`/app/${item.id}`}
                      className={({ isActive }) => `sn-link ${isActive ? 'active' : ''}`}
                      onClick={onCloseMobileMenu}
                      title={item.label}
                    >
                      <span className="sn-item-icon">{getMenuIcon(item.iconName)}</span>
                      <span className="sn-item-label">{item.label}</span>
                    </NavigationLink>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>

      {/* Pie del Sidebar: Tarjeta CTA rápida + Cerrar Sesión */}
      <div className="sn-footer">
        <div className="sn-cta-card">
          <div className="sn-cta-card-copy">
            <div className="sn-cta-title">Ruta Guiada</div>
            <div className="sn-cta-desc">
              {orgName ? `Configura y audita ${orgName}` : 'Paso a paso para tu organización'}
            </div>
          </div>
          <button
            type="button"
            className="sn-cta-btn"
            onClick={() => {
              onCloseMobileMenu();
              onOpenGuide();
            }}
            title="Abrir Ruta Guiada"
          >
            <Compass size={16} />
            <span className="sn-item-label" style={{ flex: 'none' }}>
              Abrir Guía
            </span>
          </button>
        </div>

        <button
          type="button"
          className="sn-logout-btn"
          onClick={() => {
            onCloseMobileMenu();
            onLogout();
          }}
          title="Cerrar Sesión"
        >
          <span className="sn-item-icon">
            <LogOut size={18} strokeWidth={1.8} />
          </span>
          <span className="sn-item-label">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};
