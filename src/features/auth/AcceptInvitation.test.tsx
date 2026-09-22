import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AcceptInvitation } from './AcceptInvitation';
import { requisitionsApi } from '../../services/api';

vi.mock('../../services/api', async () => {
  const actual: any = await vi.importActual('../../services/api');
  return {
    ...actual,
    requisitionsApi: {
      ...actual.requisitionsApi,
      getInvitationByToken: vi.fn(),
      acceptInvitation: vi.fn(),
    },
  };
});

describe('AcceptInvitation Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders token input when no token is present in URL', () => {
    render(
      <MemoryRouter initialEntries={['/aceptar-invitacion']}>
        <Routes>
          <Route path="/aceptar-invitacion" element={<AcceptInvitation />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/Aceptar Invitación/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/inv-abc123xyz/i)).toBeInTheDocument();
  });

  it('fetches invitation automatically when token is present in URL', async () => {
    ((requisitionsApi as any).getInvitationByToken as any).mockResolvedValue({
      token: 'inv-valid-token',
      email: 'maria@ong.org',
      rol: 'coordinador',
      ong_nombre: 'Fundación Manos de Esperanza',
    });

    render(
      <MemoryRouter initialEntries={['/aceptar-invitacion?token=inv-valid-token']}>
        <Routes>
          <Route path="/aceptar-invitacion" element={<AcceptInvitation />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect((requisitionsApi as any).getInvitationByToken).toHaveBeenCalledWith('inv-valid-token');
      expect(screen.getAllByText(/Fundación Manos de Esperanza/i)[0]).toBeInTheDocument();
      expect(screen.getByText(/COORDINADOR/i)).toBeInTheDocument();
      expect(screen.getByText(/maria@ong.org/i)).toBeInTheDocument();
    });
  });

  it('submits account activation with user credentials', async () => {
    ((requisitionsApi as any).getInvitationByToken as any).mockResolvedValue({
      token: 'inv-valid-token',
      email: 'maria@ong.org',
      rol: 'coordinador',
      ong_nombre: 'Fundación Manos de Esperanza',
    });
    ((requisitionsApi as any).acceptInvitation as any).mockResolvedValue(undefined);

    render(
      <MemoryRouter initialEntries={['/aceptar-invitacion?token=inv-valid-token']}>
        <Routes>
          <Route path="/aceptar-invitacion" element={<AcceptInvitation />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Carlos Mendoza/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/Carlos Mendoza/i), {
      target: { value: 'María Pérez' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Mínimo 6 caracteres/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Repite la contraseña/i), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Activar mi Cuenta/i }));

    await waitFor(() => {
      expect((requisitionsApi as any).acceptInvitation).toHaveBeenCalledWith({
        token: 'inv-valid-token',
        nombreCompleto: 'María Pérez',
        password: 'password123',
      });
      expect(screen.getByText(/¡Cuenta Activada Exitosamente!/i)).toBeInTheDocument();
    });
  });
});
