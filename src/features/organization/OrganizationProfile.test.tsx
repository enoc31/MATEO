import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OrganizationProfile } from './OrganizationProfile';

// Mock AuthContext
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    activeOng: {
      id: 'ong-123',
      nombre: 'Iglesia Test',
      logo_url: null,
      tipo_organizacion: 'ekklesia',
    },
    profile: {
      id: 'user-1',
      email: 'admin@test.org',
      nombre_completo: 'Admin Test',
      rol: 'administrador',
      aprobado: true,
      ong_id: 'ong-123',
    },
    refreshProfile: vi.fn(),
  }),
}));

// Mock NotificationProvider
vi.mock('../../components/NotificationProvider', () => ({
  useNotifications: () => ({
    addNotification: vi.fn(),
  }),
}));

// Mock api
vi.mock('../../services/api', () => ({
  api: {
    getOngById: vi.fn().mockResolvedValue({
      id: 'ong-123',
      nombre: 'Iglesia Test',
      logo_url: null,
      tipo_organizacion: 'ekklesia',
      plan: 'trial',
      estado: 'trial',
      trial_ends_at: '2026-10-10T00:00:00.000Z',
      rif_identificacion: 'J-12345678-0',
      pais: 'Venezuela',
      telefono: '0212-1234567',
      direccion: 'Distrito Capital | Libertador | Candelaria | Av. Urdaneta Edif Centro',
      sitio_web: 'https://iglesiatest.org',
    }),
    updateOng: vi.fn(),
  },
  isSimulationMode: false,
}));

describe('OrganizationProfile Component', () => {
  it('renders organization profile data correctly after loading', async () => {
    render(<OrganizationProfile />);

    expect(screen.getByText(/Cargando datos de la organización/i)).toBeInTheDocument();

    const title = await screen.findByText(/Perfil de la Iglesia/i);
    expect(title).toBeInTheDocument();

    expect(screen.getByText('Iglesia Test')).toBeInTheDocument();
    expect(screen.getByText('J-12345678-0')).toBeInTheDocument();
    expect(screen.getByText(/0212-1234567/i)).toBeInTheDocument();
    expect(screen.getByText(/https:\/\/iglesiatest.org/i)).toBeInTheDocument();
  });
});
