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
  'finance',
  'expenses',
  'accounting',
  'inventory',
  'budgets',
  'incomes',
  'requisitions',
  'field-entry',
  'reconciliation',
  'audit',
  'tasas',
]);

const TESORERIA_PATHS = new Set(['reconciliation', 'arqueo-efectivo']);
const INGRESOS_GASTOS_PATHS = new Set(['finance', 'expenses', 'registrar-aporte']);
const ALL_FINANCE_PATHS = new Set([
  ...FINANCE_ITEM_IDS,
  ...TESORERIA_PATHS,
  ...INGRESOS_GASTOS_PATHS,
  'importar-extracto',
]);

interface FinanceLeafItem {
  id: string;
  label: string;
  to: string;
  disabled?: boolean;
}

interface FinanceTreeGroup {
  id: string;
  label: string;
  children: FinanceLeafItem[];
}

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
  const isFinanceActive = ALL_FINANCE_PATHS.has(currentPath);

  const [financeOpen, setFinanceOpen] = useState<boolean>(isFinanceActive);
  const [tesoreriaOpen, setTesoreriaOpen] = useState<boolean>(TESORERIA_PATHS.has(currentPath));
  const [ingresosGastosOpen, setIngresosGastosOpen] = useState<boolean>(
    INGRESOS_GASTOS_PATHS.has(currentPath),
  );

  const { dashboardItem, financeTree, legacyFinanceItems, communityItems } = useMemo(() => {
    const dashboard = visibleMenuItems.find((item) => item.id === 'dashboard');
    const byId = new Map(visibleMenuItems.map((item) => [item.id, item]));

    const hasEkklesiaFinance =
      byId.has('finance') ||
      byId.has('expenses') ||
      byId.has('accounting') ||
      byId.has('inventory');

    const treeNodes: (FinanceTreeGroup | FinanceLeafItem)[] = [];
    const legacyItems: MenuItemConfig[] = [];

    if (hasEkklesiaFinance) {
      // 1. Tesorería -> Bancos, Efectivo
      if (byId.has('finance') || byId.has('accounting')) {
        treeNodes.push({
          id: 'tesoreria',
          label: 'Tesorería',
          children: [
            { id: 'bancos', label: 'Bancos', to: '/app/reconciliation' },
            { id: 'efectivo', label: 'Efectivo', to: '/app/arqueo-efectivo' },
          ],
        });
      }

      // 2. Ingresos y Gastos -> Ingresos, Gastos
      const igChildren: FinanceLeafItem[] = [];
      const financeItem = byId.get('finance');
      const expensesItem = byId.get('expenses');
      if (financeItem) {
        igChildren.push({
          id: 'finance',
          label: 'Ingresos',
          to: '/app/finance',
          disabled: financeItem.disabled,
        });
      }
      if (expensesItem) {
        igChildren.push({
          id: 'expenses',
          label: 'Gastos',
          to: '/app/expenses',
          disabled: expensesItem.disabled,
        });
      }
      if (igChildren.length > 0) {
        treeNodes.push({
          id: 'ingresos-y-gastos',
          label: 'Ingresos y Gastos',
          children: igChildren,
        });
      }

      // 3. Contabilidad, 4. Inventario, 5. Presupuesto, 6. Monedas y Tasas
      for (const directId of ['accounting', 'inventory', 'budgets', 'tasas'] as const) {
        const directItem = byId.get(directId);
        if (directItem) {
          treeNodes.push({
            id: directItem.id,
            label: directItem.label,
            to: `/app/${directItem.id}`,
            disabled: directItem.disabled,
          });
        }
      }
    } else {
      // Menú heredado de ONG
      for (const item of visibleMenuItems) {
        if (FINANCE_ITEM_IDS.has(item.id)) {
          legacyItems.push(item);
        }
      }
    }

    const community = visibleMenuItems.filter(
      (item) => item.id !== 'dashboard' && !FINANCE_ITEM_IDS.has(item.id),
    );

    return {
      dashboardItem: dashboard,
      financeTree: treeNodes,
      legacyFinanceItems: legacyItems,
      communityItems: community,
    };
  }, [visibleMenuItems]);

  const hasFinanceSection = financeTree.length > 0 || legacyFinanceItems.length > 0;

  const isGroupNode = (node: FinanceTreeGroup | FinanceLeafItem): node is FinanceTreeGroup =>
    'children' in node;

  const isSubgroupOpen = (groupId: string): boolean => {
    if (groupId === 'tesoreria') return tesoreriaOpen;
    if (groupId === 'ingresos-y-gastos') return ingresosGastosOpen;
    return false;
  };

  const toggleSubgroup = (groupId: string) => {
    if (groupId === 'tesoreria') setTesoreriaOpen((prev) => !prev);
    if (groupId === 'ingresos-y-gastos') setIngresosGastosOpen((prev) => !prev);
  };

  const isSubgroupActive = (groupId: string): boolean => {
    if (groupId === 'tesoreria') return TESORERIA_PATHS.has(currentPath);
    if (groupId === 'ingresos-y-gastos') return INGRESOS_GASTOS_PATHS.has(currentPath);
    return false;
  };

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

            {hasFinanceSection && (
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
                  <span className="sn-item-label">Finanzas</span>
                  <ChevronDown
                    size={15}
                    className={`sn-item-chevron ${financeOpen ? 'sn-item-chevron--open' : ''}`}
                  />
                </button>

                {/* Submenú árbol cuando está expandido */}
                {(isPinned || isMobileMenuOpen) && financeOpen && (
                  <ul className="sn-submenu">
                    {financeTree.map((node) =>
                      isGroupNode(node) ? (
                        <li key={node.id}>
                          <button
                            type="button"
                            className={`sn-sublink sn-subgroup-btn ${
                              isSubgroupActive(node.id) ? 'sn-subgroup-btn--active' : ''
                            }`}
                            onClick={() => toggleSubgroup(node.id)}
                            aria-expanded={isSubgroupOpen(node.id)}
                          >
                            <span>{node.label}</span>
                            <ChevronDown
                              size={13}
                              className={`sn-item-chevron ${
                                isSubgroupOpen(node.id) ? 'sn-item-chevron--open' : ''
                              }`}
                            />
                          </button>

                          {isSubgroupOpen(node.id) && (
                            <ul className="sn-submenu sn-submenu--nested">
                              {node.children.map((child) => (
                                <li key={child.id}>
                                  {child.disabled ? (
                                    <span
                                      className="sn-sublink sn-link--disabled"
                                      aria-disabled="true"
                                    >
                                      {child.label}
                                    </span>
                                  ) : (
                                    <NavigationLink
                                      to={child.to}
                                      className={({ isActive }) =>
                                        `sn-sublink ${isActive ? 'active' : ''}`
                                      }
                                      onClick={onCloseMobileMenu}
                                    >
                                      {child.label}
                                    </NavigationLink>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ) : (
                        <li key={node.id}>
                          {node.disabled ? (
                            <span className="sn-sublink sn-link--disabled" aria-disabled="true">
                              {node.label}
                            </span>
                          ) : (
                            <NavigationLink
                              to={node.to}
                              className={({ isActive }) => `sn-sublink ${isActive ? 'active' : ''}`}
                              onClick={onCloseMobileMenu}
                            >
                              {node.label}
                            </NavigationLink>
                          )}
                        </li>
                      ),
                    )}

                    {legacyFinanceItems.map((item) => (
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
                <div className="sn-popover" role="menu" aria-label="Finanzas">
                  <div className="sn-popover-title">Finanzas</div>
                  {financeTree.map((node) =>
                    isGroupNode(node) ? (
                      <React.Fragment key={node.id}>
                        <div className="sn-popover-group-label">{node.label}</div>
                        {node.children.map((child) =>
                          child.disabled ? (
                            <span
                              key={child.id}
                              className="sn-sublink sn-link--disabled"
                              aria-disabled="true"
                            >
                              {child.label}
                            </span>
                          ) : (
                            <NavigationLink
                              key={child.id}
                              to={child.to}
                              className={({ isActive }) => `sn-sublink ${isActive ? 'active' : ''}`}
                              onClick={onCloseMobileMenu}
                            >
                              {child.label}
                            </NavigationLink>
                          ),
                        )}
                      </React.Fragment>
                    ) : node.disabled ? (
                      <span
                        key={node.id}
                        className="sn-sublink sn-link--disabled"
                        aria-disabled="true"
                      >
                        {node.label}
                      </span>
                    ) : (
                      <NavigationLink
                        key={node.id}
                        to={node.to}
                        className={({ isActive }) => `sn-sublink ${isActive ? 'active' : ''}`}
                        onClick={onCloseMobileMenu}
                      >
                        {node.label}
                      </NavigationLink>
                    ),
                  )}
                  {legacyFinanceItems.map((item) =>
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
