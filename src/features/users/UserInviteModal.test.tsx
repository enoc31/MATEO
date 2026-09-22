import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserInviteModal } from './UserInviteModal';
import * as AuthContextModule from '../../context/AuthContext';
import { requisitionsApi } from '../../services/api';

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../supabaseClient', () => ({
  supabase: {
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
    },
  },
}));

vi.mock('../../services/api', async () => {
  const actual: any = await vi.importActual('../../services/api');
  return {
    ...actual,
    requisitionsApi: {
      ...actual.requisitionsApi,
      createInvitation: vi.fn(),
    },
  };
});

describe('UserInviteModal Component', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    (AuthContextModule.useAuth as any).mockReturnValue({
      profile: { id: 'admin-123', ong_id: 'ong-456', rol: 'administrador' },
    });
  });

  it('renders modal when isOpen is true', () => {
    render(<UserInviteModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText(/Invitar Nuevo Usuario/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/usuario@/i)).toBeInTheDocument();
  });

  it('generates invitation link when submitted', async () => {
    ((requisitionsApi as any).createInvitation as any).mockResolvedValue({
      token: 'inv-test-12345',
      email: 'nuevo@ong.org',
      rol: 'coordinador',
      ong_id: 'ong-456',
    });

    render(<UserInviteModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    fireEvent.change(screen.getByPlaceholderText(/usuario@/i), {
      target: { value: 'nuevo@ong.org' },
    });

    fireEvent.click(screen.getByText(/Generar Invitación/i));

    await waitFor(() => {
      expect((requisitionsApi as any).createInvitation).toHaveBeenCalledWith({
        email: 'nuevo@ong.org',
        rol: 'coordinador',
        ong_id: 'ong-456',
        invitado_por: 'admin-123',
      });
      expect(screen.getByText(/¡Invitación Generada Exitosamente!/i)).toBeInTheDocument();
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });
});
