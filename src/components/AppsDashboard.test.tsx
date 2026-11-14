import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    profile: { rol: 'administrador', nombre_completo: 'Admin Prueba' },
    logout: vi.fn(),
    activeOng: { nombre: 'Iglesia Prueba', tipo_organizacion: 'ekklesia' },
  }),
}));

import { AppsDashboard } from './AppsDashboard';

describe('AppsDashboard — módulos deshabilitados de Ekklesia', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('no navega al hacer clic en un módulo deshabilitado', () => {
    render(
      <MemoryRouter>
        <AppsDashboard />
      </MemoryRouter>,
    );
    const inventario = screen.getByText('Inventario').closest('button');
    expect(inventario).toBeDisabled();
    fireEvent.click(inventario as HTMLElement);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navega al hacer clic en un módulo habilitado', () => {
    render(
      <MemoryRouter>
        <AppsDashboard />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText('Ingresos y Gastos').closest('button') as HTMLElement);
    expect(mockNavigate).toHaveBeenCalledWith('/app/finance');
  });

  it('no muestra la etiqueta "En desarrollo"', () => {
    render(
      <MemoryRouter>
        <AppsDashboard />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/en desarrollo/i)).not.toBeInTheDocument();
  });
});
