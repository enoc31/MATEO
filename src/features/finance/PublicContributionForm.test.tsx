import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PublicContributionForm } from './PublicContributionForm';
import { financeApi } from '../../services/financeApi';
import { api } from '../../services/api';

vi.mock('../../services/financeApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/financeApi')>();
  return {
    ...actual,
    financeApi: {
      ...actual.financeApi,
      getPublicOngInfo: vi.fn(),
      getPublicCuentasReceptoras: vi.fn(),
      getPublicCategoriasIngreso: vi.fn(),
      buscarMiembroParaAporte: vi.fn(),
      submitReporteAporte: vi.fn(),
    },
  };
});

vi.mock('../../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/api')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      getTasaByDate: vi.fn(),
      getTasasBCV: vi.fn(),
    },
  };
});

describe('PublicContributionForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(financeApi.getPublicOngInfo).mockResolvedValue({
      id: 'ong-1',
      nombre: 'Iglesia Gracia y Paz',
      logo_url: null,
      tipo_organizacion: 'ekklesia',
    });
    vi.mocked(financeApi.getPublicCuentasReceptoras).mockResolvedValue([
      {
        id: 'cta-1',
        ong_id: 'ong-1',
        tipo: 'pago_movil',
        banco: 'Banesco',
        numero_cuenta: null,
        telefono: '0414-1234567',
        rif_cedula: 'J-12345678-9',
        titular: 'Iglesia Gracia y Paz',
        tipo_fondo: 'Diezmos y Ofrendas',
        activa: true,
      },
    ]);
    vi.mocked(financeApi.getPublicCategoriasIngreso).mockResolvedValue([
      { value: 'diezmo', label: 'Diezmo' },
      { value: 'ofrenda', label: 'Ofrenda' },
      { value: 'fondo_juvenil', label: 'Fondo Juvenil' },
    ]);
    vi.mocked(api.getTasaByDate).mockResolvedValue({
      id: 't1',
      fecha: '2026-11-21',
      tasa: 100,
      fuente: 'bcv_api',
      created_at: '',
    });
  });

  const renderPage = () =>
    render(
      <MemoryRouter initialEntries={['/aportar/ong-1']}>
        <Routes>
          <Route path="/aportar/:ongId" element={<PublicContributionForm />} />
        </Routes>
      </MemoryRouter>,
    );

  it('renders church accounts and calculates VES to USD equivalent', async () => {
    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Iglesia Gracia y Paz' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/0414-1234567/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pago móvil/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Transferencia/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Efectivo/i })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Monto \(VES\)/i), { target: { value: '500' } });
    expect(await screen.findByText('$5,00')).toBeInTheDocument();
  });

  it('allows exact cedula lookup with masked confirmation and submitting a Transferencia without reference when same-bank is checked', async () => {
    vi.mocked(financeApi.buscarMiembroParaAporte).mockResolvedValue({
      encontrado: true,
      miembro_id: 'mem-99',
      nombre_enmascarado: 'M**** G****',
    });
    vi.mocked(financeApi.submitReporteAporte).mockResolvedValue({
      id: 'rep-99',
      codigo_confirmacion: 'APO-XYZ123',
      ong_id: 'ong-1',
      cuenta_receptora_id: null,
      miembro_id: 'mem-99',
      es_anonimo: false,
      nombre_aportante: null,
      telefono_aportante: null,
      cedula_aportante: '20123456',
      categoria_aporte: 'diezmo',
      moneda: 'VES',
      monto_original: 1000,
      tasa_bcv: 100,
      monto_usd: 10,
      monto_ves: 1000,
      medio_pago: 'transferencia',
      referencia: null,
      sin_referencia_mismo_banco: true,
      banco_emisor: 'BBVA Provincial',
      telefono_emisor: null,
      fecha_pago: '2026-11-21',
      actividad_o_responsable: null,
      comprobante_url: null,
      estado: 'pendiente',
      motivo_rechazo: null,
      verificado_por: null,
      verificado_at: null,
      donacion_id: null,
      created_at: new Date().toISOString(),
    });

    renderPage();
    await screen.findByRole('heading', { name: 'Iglesia Gracia y Paz' });
    await screen.findByText(/100\.0000 Bs\/\$/i);

    fireEvent.change(screen.getByLabelText(/Tipo de documento/i), {
      target: { value: 'E' },
    });
    fireEvent.change(screen.getByLabelText(/Buscar por Cédula/i), {
      target: { value: 'E-20.123.456' },
    });
    expect(screen.getByLabelText(/Buscar por Cédula/i)).toHaveValue('20123456');
    fireEvent.click(screen.getByRole('button', { name: /Buscar/i }));
    expect(financeApi.buscarMiembroParaAporte).toHaveBeenCalledWith('ong-1', 'E-20123456');
    expect(await screen.findByText(/M\*\*\*\* G\*\*\*\*/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Monto \(VES\)/i), { target: { value: '1000' } });
    fireEvent.click(screen.getByRole('button', { name: /Transferencia/i }));
    fireEvent.change(screen.getByLabelText(/Banco Emisor/i), {
      target: { value: 'BBVA Provincial' },
    });
    fireEvent.click(screen.getByLabelText(/Transferencia del mismo banco/i));

    fireEvent.click(screen.getByRole('button', { name: /Enviar Reporte de Aporte/i }));

    await waitFor(() => {
      expect(screen.getByText('APO-XYZ123')).toBeInTheDocument();
    });
  });
});
