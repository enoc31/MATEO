import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserManagement } from './UserManagement';
import { api, requisitionsApi } from '../../services/api';

vi.mock('../../services/api', () => ({
  api: {
    getUsers: vi.fn(),
    updateUserProfile: vi.fn(),
    createInvitationToken: vi.fn(),
  },
  requisitionsApi: {
    getInvitationsByOng: vi.fn(),
    cancelInvitation: vi.fn(),
  },
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'admin-1', email: 'admin@test.com' },
    profile: { id: 'admin-1', email: 'admin@test.com', rol: 'administrador', ong_id: 'ong-1' },
    isSuperAdmin: false,
  }),
}));

describe('UserManagement', () => {
  const mockUsers = [
    {
      id: '2bccc06f-5132-4290-bd5d-c94edfc3e37d',
      email: 'antonio@asgmultiplex.com',
      nombre_completo: 'Antonio Alvarado',
      rol: 'director',
      aprobado: true,
      created_at: '2026-07-27T03:16:00.215Z',
      ong_id: 'ong-1',
    },
    {
      id: 'eaef70d8-149c-4e47-b451-22d1f1ccad9b',
      email: 'meustache@enbalances.com',
      nombre_completo: 'Maurice Germán Eustache Rondón',
      rol: 'administrador',
      aprobado: false,
      created_at: '2026-07-04T20:47:26.031Z',
      ong_id: 'ong-1',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (api.getUsers as any).mockResolvedValue(mockUsers);
    (api.updateUserProfile as any).mockResolvedValue({ success: true });
    (requisitionsApi.getInvitationsByOng as any).mockResolvedValue([]);
  });

  it('renders pending sent invitations waiting for response', async () => {
    (requisitionsApi.getInvitationsByOng as any).mockResolvedValue([
      {
        id: 'inv-1',
        ong_id: 'ong-1',
        email: 'invitado@iglesia.org',
        rol: 'lider_ministerio',
        token: 'inv-token-123',
        estado: 'pendiente',
        created_at: '2026-11-23T12:00:00Z',
        expires_at: '2026-11-30T12:00:00Z',
      },
    ]);

    render(<UserManagement />);
    await waitFor(() => {
      expect(screen.getByText(/Invitaciones Enviadas en Espera de Respuesta/i)).toBeInTheDocument();
      expect(screen.getByText('invitado@iglesia.org')).toBeInTheDocument();
    });
  });

  it('renders user list correctly', async () => {
    render(<UserManagement />);
    await waitFor(() => {
      expect(screen.getByText('Antonio Alvarado')).toBeInTheDocument();
      expect(screen.getByText('Maurice Germán Eustache Rondón')).toBeInTheDocument();
    });
  });

  it('calls updateUserProfile when approving a pending user', async () => {
    render(<UserManagement />);
    await waitFor(() => {
      expect(screen.getByText('Maurice Germán Eustache Rondón')).toBeInTheDocument();
    });

    const approveButton = screen.getByRole('button', { name: /Aprobar Acceso/i });
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(api.updateUserProfile).toHaveBeenCalledWith('eaef70d8-149c-4e47-b451-22d1f1ccad9b', {
        aprobado: true,
        rol: 'administrador',
      });
    });
  });

  it('calls updateUserProfile when suspending a user', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<UserManagement />);
    await waitFor(() => {
      expect(screen.getByText('Antonio Alvarado')).toBeInTheDocument();
    });

    const suspendButton = screen.getByRole('button', { name: /Suspender/i });
    fireEvent.click(suspendButton);

    await waitFor(() => {
      expect(api.updateUserProfile).toHaveBeenCalledWith('2bccc06f-5132-4290-bd5d-c94edfc3e37d', {
        aprobado: false,
      });
    });
  });
});
