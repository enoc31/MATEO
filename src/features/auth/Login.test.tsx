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
    // En el modo "Real" o simulado siempre aparece el botón de inicio de sesión
    expect(screen.getByRole('button', { name: /Ingresar al Sistema/i })).toBeInTheDocument();
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

  it('toggles to registration mode when "Regístrate aquí" is clicked', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    const toggleButton = screen.getByRole('button', {
      name: /¿No tienes una cuenta\? Regístrate aquí/i,
    });
    fireEvent.click(toggleButton);

    // Ahora deberíamos ver el campo de Nombre Completo y el botón de crear cuenta
    expect(screen.getByLabelText(/Nombre Completo/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Solicitar Registro/i })).toBeInTheDocument();
  });

  it('blocks registration if captcha is not completed', async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    // Switch to register mode
    const toggleButton = screen.getByRole('button', {
      name: /¿No tienes una cuenta\? Regístrate aquí/i,
    });
    fireEvent.click(toggleButton);

    // Fill form fields
    fireEvent.change(screen.getByLabelText(/Nombre Completo/i), {
      target: { value: 'Jane Doe' },
    });
    fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), {
      target: { value: 'jane@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Contraseña/i), {
      target: { value: 'password123' },
    });

    // Attempt to submit without checking captcha
    const submitButton = screen.getByRole('button', { name: /Solicitar Registro/i });
    fireEvent.click(submitButton);

    // Check warning is displayed
    expect(
      screen.getByText(/Por favor completa el reCAPTCHA para registrarte./i),
    ).toBeInTheDocument();
  });
});
