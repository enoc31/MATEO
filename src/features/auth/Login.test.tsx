import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Login } from './Login';
import * as AuthContextModule from '../../context/AuthContext';

// Mock del contexto de autenticación
vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('Login Component', () => {
  const mockRefreshProfile = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    (AuthContextModule.useAuth as any).mockReturnValue({
      refreshProfile: mockRefreshProfile,
    });
  });

  it('renders login form correctly', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    // Verificar que los campos de correo y contraseña están presentes
    expect(screen.getByLabelText(/Correo Electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ingresar a la Plataforma/i })).toBeInTheDocument();
  });

  it('updates email and password fields on user input', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    const emailInput = screen.getByLabelText(/Correo Electrónico/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/Contraseña/i) as HTMLInputElement;

    fireEvent.change(emailInput, { target: { value: 'test@ejemplo.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(emailInput.value).toBe('test@ejemplo.com');
    expect(passwordInput.value).toBe('password123');
  });

  it('renders CTA link for registering a new NGO in trial', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    expect(screen.getByText(/¿Deseas registrar una nueva ONG\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Prueba Gratuita de 14 Días/i)).toBeInTheDocument();
  });

  it('renders invitation acceptance link for invited users', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Aceptar Invitación/i)).toBeInTheDocument();
  });
});
