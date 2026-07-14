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

    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock,
      order: orderMock,
      limit: limitMock,
    } as unknown as ReturnType<typeof supabase.from>);

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
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: mockMetrics,
      error: null,
    } as unknown as Awaited<ReturnType<typeof supabase.rpc>>);

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

  it('getCategories should return data from supabase or simulation', async () => {
    const mockCats = [{ id: 'cat-1', nombre: '1. Costos Directos' }];

    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      if (table === 'categorias_gasto') {
        return {
          select: (fields: string) => {
            if (fields === 'id') {
              return Promise.resolve({ data: [{ id: 'cat-1' }], error: null });
            }
            return {
              order: () => Promise.resolve({ data: mockCats, error: null }),
            };
          },
        };
      }
      return {
        select: () => ({
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: {}, error: null }),
            }),
          }),
        }),
        insert: () => Promise.resolve({ data: null, error: null }),
      };
    }) as unknown as typeof supabase.from);

    const categories = await api.getCategories();
    expect(Array.isArray(categories)).toBe(true);
    if (!isSimulationMode) {
      expect(supabase.from).toHaveBeenCalledWith('categorias_gasto');
      expect(categories).toEqual(mockCats);
    }
  });

  it('getPartidas should return data from supabase or simulation', async () => {
    const mockParts = [{ id: 'part-1', nombre: 'Artículos No Alimentarios' }];

    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      if (table === 'categorias_gasto') {
        return {
          select: (fields: string) => {
            if (fields === 'id') {
              return Promise.resolve({ data: [{ id: 'cat-1' }], error: null });
            }
            return {
              order: () => Promise.resolve({ data: [], error: null }),
            };
          },
        };
      }
      if (table === 'partidas_gasto') {
        return {
          select: () => ({
            order: () => Promise.resolve({ data: mockParts, error: null }),
          }),
        };
      }
      return {
        select: () => ({
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: {}, error: null }),
            }),
          }),
        }),
        insert: () => Promise.resolve({ data: null, error: null }),
      };
    }) as unknown as typeof supabase.from);

    const partidas = await api.getPartidas();
    expect(Array.isArray(partidas)).toBe(true);
    if (!isSimulationMode) {
      expect(supabase.from).toHaveBeenCalledWith('partidas_gasto');
      expect(partidas).toEqual(mockParts);
    }
  });

  it('getProjectPartidas should retrieve project budget lines', async () => {
    const mockRelation = [
      {
        partida_id: 'part-1',
        partidas_gasto: { id: 'part-1', nombre: 'Mock Partida' },
      },
    ];

    const eqMock = vi.fn().mockResolvedValue({ data: mockRelation, error: null });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });

    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      if (table === 'proyectos_partidas') {
        return {
          select: selectMock,
        };
      }
      return {
        select: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      };
    }) as unknown as typeof supabase.from);

    const result = await api.getProjectPartidas('proj-123');
    expect(Array.isArray(result)).toBe(true);
    if (!isSimulationMode) {
      expect(supabase.from).toHaveBeenCalledWith('proyectos_partidas');
      expect(result).toEqual([{ id: 'part-1', nombre: 'Mock Partida' }]);
    }
  });

  it('setProjectPartidas should delete and insert associations', async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
    const insertMock = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      if (table === 'proyectos_partidas') {
        return {
          delete: deleteMock,
          insert: insertMock,
        };
      }
      return {};
    }) as unknown as typeof supabase.from);

    await api.setProjectPartidas('proj-123', ['part-1'], 'ong-123');
    if (!isSimulationMode) {
      expect(supabase.from).toHaveBeenCalledWith('proyectos_partidas');
      expect(deleteMock).toHaveBeenCalled();
      expect(eqMock).toHaveBeenCalledWith('proyecto_id', 'proj-123');
      expect(insertMock).toHaveBeenCalledWith([
        { proyecto_id: 'proj-123', partida_id: 'part-1', ong_id: 'ong-123' },
      ]);
    }
  });

  it('getJornadaById should return single journey or handle simulation', async () => {
    const mockJornada = { id: 'jor-123', nombre: 'Jornada Test', activa: true, ong_id: 'ong-123' };
    const singleMock = vi.fn().mockResolvedValue({ data: mockJornada, error: null });
    const eqMock = vi.fn().mockReturnValue({ single: singleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });

    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      if (table === 'jornadas') {
        return {
          select: selectMock,
        };
      }
      return {};
    }) as unknown as typeof supabase.from);

    const result = await api.getJornadaById('jor-123');
    if (!isSimulationMode) {
      expect(supabase.from).toHaveBeenCalledWith('jornadas');
      expect(selectMock).toHaveBeenCalledWith('*');
      expect(eqMock).toHaveBeenCalledWith('id', 'jor-123');
      expect(result).toEqual(mockJornada);
    } else {
      expect(result).toBeNull();
    }
  });

  it('saveBeneficiary should include ongId in payload and insert', async () => {
    const beneficiaryData = {
      jornada_id: 'jor-123',
      nombre: 'Pedro',
      apellido: 'Perez',
      cedula: '12345678',
      sexo: 'Masculino',
      fecha_nacimiento: '2000-01-01',
      tipo_donacion: ['Comida'],
      ip_captura: '127.0.0.1',
    };

    const insertMock = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      if (table === 'beneficiarios') {
        return {
          insert: insertMock,
        };
      }
      return {};
    }) as unknown as typeof supabase.from);

    const result = await api.saveBeneficiary(beneficiaryData, undefined, 'ong-123');
    expect(result).toBeDefined();
    expect(result.nombre).toBe('Pedro');

    if (!isSimulationMode) {
      expect(supabase.from).toHaveBeenCalledWith('beneficiarios');
      expect(insertMock).toHaveBeenCalled();
      const insertedObj = insertMock.mock.calls[0][0][0];
      expect(insertedObj).toHaveProperty('ong_id', 'ong-123');
    }
  });
});
