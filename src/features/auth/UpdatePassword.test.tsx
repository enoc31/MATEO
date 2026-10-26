import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UpdatePassword } from './UpdatePassword';
import { supabase } from '../../supabaseClient';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../supabaseClient', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      updateUser: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

vi.mock('../../services/api', () => ({
  isSimulationMode: false,
}));

describe('UpdatePassword Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders update password form correctly', () => {
    render(
      <MemoryRouter>
        <UpdatePassword />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: /Establecer Nueva Contraseña/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^Nueva Contraseña/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Confirmar Contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Guardar Nueva Contraseña/i })).toBeInTheDocument();
  });

  it('validates password mismatch', async () => {
    render(
      <MemoryRouter>
        <UpdatePassword />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/^Nueva Contraseña/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/^Confirmar Contraseña/i), {
      target: { value: 'password456' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Guardar Nueva Contraseña/i }));

    expect(screen.getByText(/Las contraseñas no coinciden/i)).toBeInTheDocument();
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it('validates minimum password length', async () => {
    render(
      <MemoryRouter>
        <UpdatePassword />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/^Nueva Contraseña/i), {
      target: { value: '123' },
    });
    fireEvent.change(screen.getByLabelText(/^Confirmar Contraseña/i), {
      target: { value: '123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Guardar Nueva Contraseña/i }));

    expect(screen.getByText(/La contraseña debe tener al menos 6 caracteres/i)).toBeInTheDocument();
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it('successfully updates password and calls supabase updateUser', async () => {
    vi.mocked(supabase.auth.updateUser).mockResolvedValue({
      data: { user: null },
      error: null,
    } as unknown as Awaited<ReturnType<typeof supabase.auth.updateUser>>);
    vi.mocked(supabase.auth.signOut).mockResolvedValue({
      error: null,
    });

    render(
      <MemoryRouter>
        <UpdatePassword />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/^Nueva Contraseña/i), {
      target: { value: 'nuevaClaveSegura2026' },
    });
    fireEvent.change(screen.getByLabelText(/^Confirmar Contraseña/i), {
      target: { value: 'nuevaClaveSegura2026' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Guardar Nueva Contraseña/i }));

    await waitFor(() => {
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        password: 'nuevaClaveSegura2026',
      });
      expect(screen.getByText(/¡Contraseña actualizada exitosamente!/i)).toBeInTheDocument();
    });
  });
});
