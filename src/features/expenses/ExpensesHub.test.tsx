import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ExpensesHub } from './ExpensesHub';
import { ExpensesTable } from './ExpensesTable';
import { requisitionsApi, type Requisition } from '../../services/api';

vi.mock('../../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/api')>();
  return {
    ...actual,
    requisitionsApi: {
      ...actual.requisitionsApi,
      getRequisitions: vi.fn(),
    },
  };
});

const sampleRequisitions: Requisition[] = [
  {
    id: 'req-1',
    codigo: 'REQ-2026-001',
    proyecto_id: 'proj-1',
    proyecto_nombre: 'Ministerio de Jóvenes',
    solicitante_id: 'u-1',
    solicitante_nombre: 'Ana Líder',
    partida_id: 'part-1',
    partida_nombre: 'Equipos de Sonido',
    monto_solicitado: 150,
    motivo: 'Micrófonos para culto',
    estado: 'aprobada_ejecucion',
    fecha_solicitud: '2026-04-10',
  },
  {
    id: 'req-2',
    codigo: 'REQ-2026-002',
    proyecto_id: 'proj-2',
    proyecto_nombre: 'Acción Social',
    solicitante_id: 'u-2',
    solicitante_nombre: 'Luis Coordinador',
    partida_id: 'part-2',
    partida_nombre: 'Alimentos',
    monto_solicitado: 80,
    motivo: 'Jornada comunitaria',
    estado: 'pendiente_admin',
    fecha_solicitud: '2026-04-12',
  },
];

describe('ExpensesHub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requisitionsApi.getRequisitions).mockResolvedValue(sampleRequisitions);
  });

  it('renders Gastos KPIs, tabs, and switches to Listado de Gastos table', async () => {
    render(
      <MemoryRouter>
        <ExpensesHub />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: /^Gastos$/i })).toBeInTheDocument();
    expect(await screen.findByText(/\$150,00/)).toBeInTheDocument();
    expect(screen.getByTestId('pending-expenses-badge')).toHaveTextContent('1');

    fireEvent.click(screen.getByRole('tab', { name: /Listado de Gastos/i }));
    expect(await screen.findByText(/REQ-2026-001 · Micrófonos para culto/i)).toBeInTheDocument();
    expect(screen.getByText(/REQ-2026-002 · Jornada comunitaria/i)).toBeInTheDocument();
  });

  it('renders ExpensesTable with formatted amount and status pill', () => {
    const onNavigate = vi.fn();
    render(<ExpensesTable requisitions={sampleRequisitions} onNavigateRequisitions={onNavigate} />);

    expect(screen.getByText(/REQ-2026-001 · Micrófonos para culto/i)).toBeInTheDocument();
    expect(screen.getByText('Aprobada')).toBeInTheDocument();
    expect(screen.getByText('Pendiente Admin')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Ver más' })[0]);
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
