import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SidebarNav } from './SidebarNav';
import { getMenuItems, type MenuItemConfig } from './menuConfig';

const sampleItems: MenuItemConfig[] = [
  {
    id: 'dashboard',
    label: 'Tablero General',
    iconName: 'LayoutDashboard',
    color: '#1b5cb6',
    roles: ['administrador'],
  },
  {
    id: 'incomes',
    label: 'Donaciones e Ingresos',
    iconName: 'Wallet',
    color: '#10b981',
    roles: ['administrador'],
  },
  {
    id: 'beneficiaries',
    label: 'Miembros y Fieles',
    iconName: 'Users',
    color: '#ec4899',
    roles: ['administrador'],
  },
];

describe('SidebarNav', () => {
  const defaultProps = {
    visibleMenuItems: sampleItems,
    currentPath: 'beneficiaries',
    isPinned: true,
    onTogglePin: vi.fn(),
    isMobileMenuOpen: false,
    onCloseMobileMenu: vi.fn(),
    userName: 'Gerardo Herrera',
    userRole: 'administrador',
    orgName: 'Primera Iglesia Bautista',
    onNavigateHome: vi.fn(),
    onOpenGuide: vi.fn(),
    onLogout: vi.fn(),
  };

  it('renders user profile, grouped navigation, and quick guide CTA', () => {
    render(
      <MemoryRouter>
        <SidebarNav {...defaultProps} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Gerardo Herrera')).toBeInTheDocument();
    expect(screen.getByText('ADMINISTRADOR')).toBeInTheDocument();
    expect(screen.getByText('Tablero General')).toBeInTheDocument();
    expect(screen.getByText('Miembros y Fieles')).toBeInTheDocument();
    expect(screen.getByText('Abrir Guía')).toBeInTheDocument();
  });

  it('toggles collapse button and expandable Finanzas submenu', () => {
    const onTogglePin = vi.fn();
    render(
      <MemoryRouter>
        <SidebarNav {...defaultProps} onTogglePin={onTogglePin} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Contraer barra lateral/i }));
    expect(onTogglePin).toHaveBeenCalledTimes(1);

    const financeToggle = screen.getByRole('button', { name: /^Finanzas$/i });
    expect(financeToggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(financeToggle);
    expect(financeToggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByText('Donaciones e Ingresos').length).toBeGreaterThanOrEqual(1);
  });

  it('renders Ekklesia hierarchical Finanzas tree with Tesorería, Ingresos y Gastos, Contabilidad, Inventario, and Presupuesto', () => {
    const ekklesiaItems = getMenuItems('ekklesia');
    render(
      <MemoryRouter>
        <SidebarNav {...defaultProps} visibleMenuItems={ekklesiaItems} currentPath="dashboard" />
      </MemoryRouter>,
    );

    const financeToggle = screen.getByRole('button', { name: /^Finanzas$/i });
    fireEvent.click(financeToggle);

    // Top-level Finanzas items
    const tesoreriaToggle = screen.getByRole('button', { name: /Tesorería/i });
    const igToggle = screen.getByRole('button', { name: /Ingresos y Gastos/i });
    expect(tesoreriaToggle).toBeInTheDocument();
    expect(igToggle).toBeInTheDocument();
    expect(screen.getAllByText('Contabilidad').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Inventario').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Presupuesto').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Monedas y Tasas').length).toBeGreaterThanOrEqual(1);

    // Expand Tesorería -> Bancos, Efectivo
    fireEvent.click(tesoreriaToggle);
    expect(screen.getAllByText('Bancos').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Efectivo').length).toBeGreaterThanOrEqual(1);

    // Expand Ingresos y Gastos -> Ingresos, Gastos
    fireEvent.click(igToggle);
    expect(screen.getAllByText('Ingresos').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Gastos').length).toBeGreaterThanOrEqual(1);
  });
});
