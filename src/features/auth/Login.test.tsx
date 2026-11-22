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
    localStorage.clear();
    vi.mocked(AuthContextModule.useAuth).mockReturnValue({
      refreshProfile: mockRefreshProfile,
    } as unknown as ReturnType<typeof AuthContextModule.useAuth>);
  });

  it('renders login form, Google button, and password toggle correctly', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText(/Correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Contraseña$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Iniciar sesión$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar sesión con Google/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Recuérdame/i })).toBeInTheDocument();
  });

  it('updates email, password, and toggles password visibility', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    const emailInput = screen.getByLabelText(/Correo electrónico/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/^Contraseña$/i) as HTMLInputElement;

    fireEvent.change(emailInput, { target: { value: 'test@ejemplo.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(emailInput.value).toBe('test@ejemplo.com');
    expect(passwordInput.value).toBe('password123');
    expect(passwordInput.type).toBe('password');

    fireEvent.click(screen.getByRole('button', { name: /Mostrar contraseña/i }));
    expect(passwordInput.type).toBe('text');
  });

  it('renders registration links pointing to /registro-ong', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    const registerLinks = screen.getAllByRole('link', { name: /Regístrate|Crea una cuenta/i });
    expect(registerLinks.length).toBeGreaterThanOrEqual(2);
    registerLinks.forEach((link) => {
      expect(link).toHaveAttribute('href', '/registro-ong');
    });
  });

  it('renders invitation acceptance link for invited users', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Aceptar Invitación/i)).toBeInTheDocument();
  });

  it('renders forgot password link pointing to /forgot-password', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    const forgotPasswordLink = screen.getByRole('link', { name: /¿Olvidaste tu contraseña\?/i });
    expect(forgotPasswordLink).toBeInTheDocument();
    expect(forgotPasswordLink).toHaveAttribute('href', '/forgot-password');
  });
});
