import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EmailUnverified } from './EmailUnverified';
import { supabase } from '../../supabaseClient';

vi.mock('../../supabaseClient', () => ({
  supabase: {
    auth: {
      resend: vi.fn(),
    },
  },
}));

describe('EmailUnverified Component', () => {
  it('renders unverified message with user email', () => {
    render(<EmailUnverified email="test@fundacion.org" logout={vi.fn()} />);

    expect(screen.getByText(/Verificación de Correo Requerida/i)).toBeInTheDocument();
    expect(screen.getByText(/test@fundacion.org/i)).toBeInTheDocument();
  });

  it('triggers email resend when requested', async () => {
    (supabase.auth.resend as any).mockResolvedValue({ error: null });

    render(<EmailUnverified email="test@fundacion.org" logout={vi.fn()} />);

    fireEvent.click(screen.getByText(/Reenviar Correo de Confirmación/i));

    await waitFor(() => {
      expect(supabase.auth.resend).toHaveBeenCalledWith({
        type: 'signup',
        email: 'test@fundacion.org',
      });
      expect(screen.getByText(/Hemos reenviado el enlace de verificación/i)).toBeInTheDocument();
    });
  });

  it('invokes logout callback when clicking logout/correct email', () => {
    const logoutMock = vi.fn();
    render(<EmailUnverified email="typo@gmmail.com" logout={logoutMock} />);

    fireEvent.click(screen.getByText(/Cerrar Sesión \/ Corregir Correo/i));

    expect(logoutMock).toHaveBeenCalled();
  });
});
