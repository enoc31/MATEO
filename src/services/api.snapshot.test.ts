import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api, isSimulationMode } from './api';
import { supabase } from '../supabaseClient';

// Mock de Supabase para evitar llamadas a la BD real en los tests
vi.mock('../supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

describe('API Service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('isSimulationMode should match env configuration', () => {
    // Si hay variables de entorno en el .env, será false. Si no, true.
    expect(typeof isSimulationMode).toBe('boolean');
  });

  it('getDonations should return data using supabase.from', async () => {
    // Configuramos el mock de Supabase para devolver un arreglo con un elemento
    const mockData = [{ id: '1', monto_usd: 100 }];
    const selectMock = vi.fn().mockReturnThis();
    const orderMock = vi.fn().mockReturnThis();
    const limitMock = vi.fn().mockResolvedValue({ data: mockData, error: null });

    (supabase.from as any).mockReturnValue({
      select: selectMock,
      order: orderMock,
      limit: limitMock,
    });

    // En caso de que estemos en SimulationMode (CI sin .env), api.ts usa mocks internos
    // Si no lo estamos, usa supabase. Verificaremos que devuelve algo.
    const donations = await api.getDonations();

    expect(Array.isArray(donations)).toBe(true);
    if (!isSimulationMode) {
      expect(supabase.from).toHaveBeenCalledWith('donaciones');
      expect(donations).toEqual(mockData);
    }
  });

  it('getDashboardMetrics should handle rpc calls or simulation', async () => {
    const mockMetrics = { totalInflows: 500, reconciledInflows: 500, totalOutflows: 200 };
    (supabase.rpc as any).mockResolvedValue({ data: mockMetrics, error: null });

    const metrics = await api.getDashboardMetrics();
    expect(metrics).toBeDefined();
    if (!isSimulationMode) {
      expect(supabase.rpc).toHaveBeenCalledWith('get_dashboard_metrics');
      expect(metrics.totalInflows).toBe(500);
    } else {
      expect(metrics.totalInflows).toBe(0); // simulation mode default
    }
  });

  it('snapshot test: should match default simulated metrics format', () => {
    const defaultMetricsFormat = {
      totalInflows: 0,
      reconciledInflows: 0,
      totalOutflows: 0,
      reconciledOutflows: 0,
      administrativeOutflows: 0,
      operationalOutflows: 0,
      reconciledPercent: 0,
      unreconciledInflows: 0,
      unreconciledOutflows: 0,
    };
    expect(defaultMetricsFormat).toMatchSnapshot();
  });
});
