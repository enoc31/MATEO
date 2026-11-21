import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChurchMembersManager } from './ChurchMembersManager';
import { api } from '../../services/api';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    activeOng: {
      id: 'd8ce7633-e4a0-4498-93ac-fa48f9242f96',
      nombre: 'Primera Iglesia Bautista de Los Teques',
      tipo_organizacion: 'ekklesia',
    },
  }),
}));

vi.mock('../../components/NotificationProvider', () => ({
  useNotifications: () => ({
    addNotification: vi.fn(),
  }),
}));

vi.mock('../../services/api', () => ({
  api: {
    getBeneficiaries: vi.fn(),
    getDonations: vi.fn().mockResolvedValue([]),
  },
}));

describe('ChurchMembersManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('renders members and filters safely even when nullable fields are missing', async () => {
    vi.mocked(api.getBeneficiaries).mockResolvedValue([
      {
        id: 'mem-1',
        jornada_id: 'jor-1',
        url_firma: null,
        created_at: '2026-11-21T00:00:00Z',
        nombre: 'Ricardo',
        apellido: 'Flores',
        cedula: 'V-21651947',
        sexo: 'Masculino',
        fecha_nacimiento: '1992-09-07',
        bautizado: true,
        cargo_eclesiastico: 'PASTOR / OBISPO O SIMILAR',
        tipo_donacion: ['Bautizado', 'Ekklesia'],
      },
      {
        id: 'mem-null',
        jornada_id: 'jor-1',
        url_firma: null,
        created_at: '2026-11-21T00:00:00Z',
        nombre: null as unknown as string,
        apellido: null as unknown as string,
        cedula: null as unknown as string,
        sexo: 'Femenino',
        fecha_nacimiento: '',
        bautizado: false,
      },
    ]);

    render(<ChurchMembersManager />);

    await waitFor(() => {
      expect(screen.getByText(/Ricardo Flores/i)).toBeInTheDocument();
    });

    // Verifica que inicia por defecto en modo lista (tabla)
    expect(screen.getByRole('table')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/Buscar por Nombre, Cédula, Teléfono/i);
    fireEvent.change(searchInput, { target: { value: 'Ricardo' } });

    expect(screen.getByText(/Ricardo Flores/i)).toBeInTheDocument();
  });
});
