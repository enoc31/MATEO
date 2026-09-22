import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserManagement } from './UserManagement';
import { api } from '../../services/api';

vi.mock('../../services/api', () => ({
  api: {
    getUsers: vi.fn(),
    updateUserProfile: vi.fn(),
    createInvitationToken: vi.fn(),
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
