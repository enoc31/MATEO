import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FinanceHub } from './FinanceHub';
import * as AuthContextModule from '../../context/AuthContext';
import { api } from '../../services/api';
import { financeApi } from '../../services/financeApi';

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/api')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      getDonations: vi.fn(),
      getBankTransactions: vi.fn(),
    },
  };
});

vi.mock('../../services/financeApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/financeApi')>();
  return {
    ...actual,
    financeApi: {
      ...actual.financeApi,
      getReportesAportes: vi.fn(),
      getCuentasReceptoras: vi.fn(),
      getCategoriasIngreso: vi.fn(),
    },
  };
});

describe('FinanceHub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getDonations).mockResolvedValue([]);
    vi.mocked(api.getBankTransactions).mockResolvedValue([]);
    vi.mocked(financeApi.getCuentasReceptoras).mockResolvedValue([]);
    vi.mocked(financeApi.getCategoriasIngreso).mockResolvedValue([]);
    vi.mocked(financeApi.getReportesAportes).mockResolvedValue([
      {
        id: 'rep-1',
        codigo_confirmacion: 'APO-ABC123',
        ong_id: 'ong-1',
        cuenta_receptora_id: null,
        miembro_id: null,
        es_anonimo: false,
        nombre_aportante: 'Pedro Pérez',
        telefono_aportante: '04140001122',
        cedula_aportante: null,
        categoria_aporte: 'diezmo',
        moneda: 'USD',
        monto_original: 50,
        tasa_bcv: null,
        monto_usd: 50,
        monto_ves: null,
        medio_pago: 'pago_movil',
        referencia: '777888',
        sin_referencia_mismo_banco: false,
        banco_emisor: 'Banesco',
        telefono_emisor: '04140001122',
        fecha_pago: '2026-11-21',
        actividad_o_responsable: null,
        comprobante_url: null,
        estado: 'pendiente',
        motivo_rechazo: null,
        verificado_por: null,
        verificado_at: null,
        donacion_id: null,
        created_at: new Date().toISOString(),
      },
    ]);
  });

  it('shows all 4 Ingresos tabs and pending count badge for tesorero without Gastos tab', async () => {
    vi.mocked(AuthContextModule.useAuth).mockReturnValue({
      profile: {
        id: 'u-1',
        email: 'tesorero@iglesia.org',
        nombre_completo: 'Tesorero',
        rol: 'tesorero',
        aprobado: true,
        ong_id: 'ong-1',
        created_at: '',
      },
      activeOng: {
        id: 'ong-1',
        nombre: 'Iglesia Central',
        logo_url: null,
        tipo_organizacion: 'ekklesia',
      },
    } as ReturnType<typeof AuthContextModule.useAuth>);

    render(
      <MemoryRouter>
        <FinanceHub />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('tab', { name: /Resumen/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Por Verificar/i })).toBeInTheDocument();
    expect(screen.getByTestId('pending-reports-badge')).toHaveTextContent('1');
    expect(screen.getByRole('tab', { name: /Ingresos/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Cuentas & Enlace/i })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Gastos/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /Por Verificar/i }));
    expect(await screen.findByText('APO-ABC123')).toBeInTheDocument();
  });

  it('does not expose income tabs to lider_ministerio (HU-21)', async () => {
    vi.mocked(AuthContextModule.useAuth).mockReturnValue({
      profile: {
        id: 'u-2',
        email: 'lider@iglesia.org',
        nombre_completo: 'Líder Jóvenes',
        rol: 'lider_ministerio',
        aprobado: true,
        ong_id: 'ong-1',
        created_at: '',
      },
      activeOng: {
        id: 'ong-1',
        nombre: 'Iglesia Central',
        logo_url: null,
        tipo_organizacion: 'ekklesia',
      },
    } as ReturnType<typeof AuthContextModule.useAuth>);

    render(
      <MemoryRouter>
        <FinanceHub />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText(/No tienes permisos para consultar el módulo de Ingresos/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Resumen/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Ingresos/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Por Verificar/i })).not.toBeInTheDocument();
  });
});
