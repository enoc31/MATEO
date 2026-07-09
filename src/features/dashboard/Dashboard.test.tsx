import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Dashboard } from './Dashboard';
import { api } from '../../services/api';

// Mock de ResizeObserver (Recharts lo requiere)
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mockeamos recharts para que no arroje errores de width(0) en jsdom
vi.mock('recharts', async () => {
  const OriginalRecharts = await vi.importActual('recharts');
  return {
    ...OriginalRecharts,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  };
});

// Mockeamos el API
vi.mock('../../services/api', () => ({
  api: {
    getCategories: vi.fn(),
    getDashboardMetrics: vi.fn(),
  },
}));

describe('Financial Calculations (Dashboard.tsx)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders correctly with mocked financial data', async () => {
    // Simulamos datos financieros perfectos
    (api.getDashboardMetrics as any).mockResolvedValue({
      totalInflows: 2000,
      reconciledInflows: 2000,
      unreconciledInflows: 0,
      totalOutflows: 500,
      expensesByCategory: { 'cat-1': 500 },
      projectExecution: [
        { id: 'proj-1', nombre: 'Proyecto Prueba', Presupuesto: 1000, Ejecutado: 500 },
      ],
    });

    (api.getCategories as any).mockResolvedValue([
      { id: 'cat-1', nombre: 'Comida', descripcion: '' },
    ]);

    render(<Dashboard />);

    // Verificamos que diga "Cargando tableros..." inicialmente
    expect(screen.getByText(/Cargando tableros/i)).toBeInTheDocument();

    // Esperamos a que los datos se carguen
    await waitFor(() => {
      // El saldo disponible debería ser reconciledInflows (2000) - totalOutflows (500) = 1500
      // La localización es-VE lo formatea como "1.500,00"
      const el = screen.getByText(/1[.,]500[.,]00/);
      expect(el).toBeInTheDocument();
    });

    // Validamos Egresos Aprobados ($500)
    const egresosEls = screen.getAllByText(/500[.,]00/);
    expect(egresosEls.length).toBeGreaterThan(0);

    // Validamos el porcentaje de ejecución
    // Presupuesto total = 1000, Ejecutado = 500 -> 50%
    const percentageEl = screen.getByText(/50[.,]0%/);
    expect(percentageEl).toBeInTheDocument();
  });

  it('handles zero budget gracefully (no division by zero error)', async () => {
    (api.getDashboardMetrics as any).mockResolvedValue({
      totalInflows: 100,
      reconciledInflows: 100,
      unreconciledInflows: 0,
      totalOutflows: 100,
      expensesByCategory: {},
      projectExecution: [], // Sin presupuesto
    });

    (api.getCategories as any).mockResolvedValue([]);

    render(<Dashboard />);

    await waitFor(() => {
      // Debería pintar 0% sin arrojar NaN o Infinity
      expect(screen.getByText(/0[.,]0%/)).toBeInTheDocument();
    });
  });
});
