import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ForgotPassword } from './ForgotPassword';
import { supabase } from '../../supabaseClient';

vi.mock('../../supabaseClient', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: vi.fn(),
    },
  },
}));

vi.mock('../../services/api', () => ({
  isSimulationMode: false,
}));

describe('ForgotPassword Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders recovery form correctly', () => {
    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /Recuperar Contraseña/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Correo Electrónico/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Enviar Enlace de Recuperación/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Volver al Inicio de Sesión/i })).toHaveAttribute(
      'href',
      '/login',
    );
  });

  it('submits email and displays success notification', async () => {
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({
      data: null,
      error: null,
    });

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>,
    );

    const emailInput = screen.getByLabelText(/Correo Electrónico/i);
    fireEvent.change(emailInput, { target: { value: 'pastor@iglesia.org' } });

    const submitBtn = screen.getByRole('button', { name: /Enviar Enlace de Recuperación/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('pastor@iglesia.org', {
        redirectTo: `${window.location.origin}/update-password`,
      });
      expect(
        screen.getByText(/recibirás un enlace seguro para crear tu nueva contraseña/i),
      ).toBeInTheDocument();
    });
  });

  it('displays error message if resetPasswordForEmail fails', async () => {
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({
      data: null,
      error: new Error('Usuario no registrado') as unknown as null,
    });

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>,
    );

    const emailInput = screen.getByLabelText(/Correo Electrónico/i);
    fireEvent.change(emailInput, { target: { value: 'noexiste@iglesia.org' } });

    const submitBtn = screen.getByRole('button', { name: /Enviar Enlace de Recuperación/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Usuario no registrado/i)).toBeInTheDocument();
    });
  });
});
