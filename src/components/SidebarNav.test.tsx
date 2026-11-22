import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SidebarNav } from './SidebarNav';
import type { MenuItemConfig } from './menuConfig';

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

  it('toggles collapse button and expandable finance submenu', () => {
    const onTogglePin = vi.fn();
    render(
      <MemoryRouter>
        <SidebarNav {...defaultProps} onTogglePin={onTogglePin} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Contraer barra lateral/i }));
    expect(onTogglePin).toHaveBeenCalledTimes(1);

    const financeToggle = screen.getByRole('button', { name: /Finanzas y Auditoría/i });
    expect(financeToggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(financeToggle);
    expect(financeToggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByText('Donaciones e Ingresos').length).toBeGreaterThanOrEqual(1);
  });
});
