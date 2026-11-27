import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { InternalBankIncomePageContent, InternalIncomePageContent } from './InternalIncomePage';
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
      getBeneficiaries: vi.fn(),
      getTasaByDate: vi.fn(),
      getTasasBCV: vi.fn(),
    },
  };
});

vi.mock('../../services/financeApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/financeApi')>();
  return {
    ...actual,
    financeApi: {
      ...actual.financeApi,
      registrarAporteInterno: vi.fn(),
      getCategoriasIngreso: vi.fn(),
    },
  };
});

describe('InternalIncomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    vi.mocked(api.getBeneficiaries).mockResolvedValue([
      {
        id: 'mem-1',
        jornada_id: '',
        nombre: 'Carlos',
        apellido: 'Pérez',
        cedula: 'V-12345678',
        sexo: 'M',
        fecha_nacimiento: '1990-01-01',
        url_firma: null,
        created_at: '',
      },
    ]);
    vi.mocked(api.getTasasBCV).mockResolvedValue([]);
    vi.mocked(api.getTasaByDate).mockResolvedValue({
      id: 't-1',
      fecha: '2026-11-23',
      tasa: 50,
      fuente: 'bcv_api',
      created_at: '',
    });
    vi.mocked(financeApi.getCategoriasIngreso).mockResolvedValue([]);
    vi.mocked(financeApi.registrarAporteInterno).mockResolvedValue({
      id: 'don-1',
      proyecto_id: null,
      transaccion_id: null,
      donante: 'Conteo de Ofrenda en Culto',
      monto: 100,
      descripcion: 'OFRENDA',
      fecha: '2026-11-23',
      moneda: 'USD',
      medio_pago: 'efectivo',
      monto_original: 100,
      tasa_bcv: 50,
      monto_usd: 100,
      monto_ves: 5000,
    });
  });

  it('renders dedicated full-page screen with multi-currency banknote counter and navigates back to /app/finance', async () => {
    const navigate = vi.fn();
    render(<InternalIncomePageContent navigate={navigate} />);

    expect(await screen.findByTestId('internal-income-page')).toBeInTheDocument();
    expect(screen.getByTestId('cash-denomination-counter')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Miembro vinculado/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Concepto/i)).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('rate-input-VES')).toHaveValue(50);
    });

    // Add associated activity (required for cash count)
    fireEvent.change(screen.getByLabelText(/Culto \/ Servicio \/ Actividad asociada \*/i), {
      target: { value: 'Culto Dominical 10:00 AM' },
    });

    // Add additional people involved in the cash count
    fireEvent.change(screen.getByTestId('additional-counter-input'), {
      target: { value: 'Pedro Gómez, María Rodríguez' },
    });
    fireEvent.click(screen.getByTestId('add-counter-btn'));
    expect(screen.getByTestId('counter-chip-Pedro Gómez')).toBeInTheDocument();
    expect(screen.getByTestId('counter-chip-María Rodríguez')).toBeInTheDocument();

    // Count 2 bills of Bs. 500 (= Bs. 1.000 -> $20 USD)
    fireEvent.change(screen.getByTestId('bill-input-VES-500'), { target: { value: '2' } });

    // Switch to EUR and count 1 bill of €100 at rate 1.1 (= $110 USD). Total = $130 USD
    fireEvent.click(screen.getByTestId('cone-tab-EUR'));
    fireEvent.change(screen.getByTestId('rate-input-EUR'), { target: { value: '1.1' } });
    fireEvent.change(screen.getByTestId('bill-input-EUR-100'), { target: { value: '1' } });

    // Allocate partial amount first (Bs. 1000 = $20 USD) -> must block submit because $20 != $130
    fireEvent.change(screen.getByTestId('allocation-amount-0'), { target: { value: '1000' } });
    expect(screen.getByTestId('allocation-balance-status')).toHaveTextContent(
      /Falta asignar \$110,00 USD/i,
    );

    fireEvent.click(screen.getByRole('button', { name: /Guardar Arqueo en Efectivo/i }));
    expect(
      await screen.findByText(/debe cuadrar exactamente con el total contado/i),
    ).toBeInTheDocument();
    expect(financeApi.registrarAporteInterno).not.toHaveBeenCalled();

    // Add second category (diezmo) in EUR for €100 ($110 USD) assigned to member Carlos Pérez
    fireEvent.click(screen.getByTestId('add-allocation-btn'));
    fireEvent.change(screen.getByTestId('allocation-category-1'), { target: { value: 'diezmo' } });
    fireEvent.change(screen.getByTestId('allocation-currency-1'), { target: { value: 'EUR' } });
    fireEvent.click(screen.getByTestId('allocation-fill-remaining-1'));
    expect(screen.getByTestId('allocation-amount-1')).toHaveValue(100);
    expect(screen.getByTestId('allocation-balance-status')).toHaveTextContent(/Cuadrado/i);

    const secondAllocationRow = screen.getByTestId('allocation-row-1');
    const allocMemberInput = within(secondAllocationRow).getByLabelText(
      /Miembro de la comunidad asignado/i,
    );
    fireEvent.change(allocMemberInput, { target: { value: 'Carlos' } });
    fireEvent.click(
      await within(secondAllocationRow).findByRole('option', { name: /Carlos Pérez/i }),
    );

    fireEvent.click(screen.getByRole('button', { name: /Guardar Arqueo en Efectivo/i }));

    await waitFor(() => {
      expect(financeApi.registrarAporteInterno).toHaveBeenCalledTimes(2);
    });

    expect(financeApi.registrarAporteInterno).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        miembro_id: null,
        categoria_aporte: 'ofrenda',
        moneda: 'VES',
        monto_original: 1000,
        monto_usd: 20,
        actividad_o_responsable: 'Culto Dominical 10:00 AM',
        descripcion: expect.stringContaining('Conteo adicional: Pedro Gómez, María Rodríguez'),
      }),
    );

    expect(financeApi.registrarAporteInterno).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        miembro_id: 'mem-1',
        donante_nombre: 'Carlos Pérez',
        categoria_aporte: 'diezmo',
        moneda: 'EUR',
        monto_original: 100,
        monto_usd: 110,
        actividad_o_responsable: 'Culto Dominical 10:00 AM',
      }),
    );

    expect(await screen.findByText(/2 categorías asignadas/i)).toBeInTheDocument();
  });

  it('renders dedicated full-page InternalBankIncomePageContent requiring a linked member and without general option', async () => {
    const navigate = vi.fn();
    render(<InternalBankIncomePageContent navigate={navigate} />);

    expect(await screen.findByTestId('internal-bank-income-page')).toBeInTheDocument();
    expect(screen.queryByTestId('cash-denomination-counter')).not.toBeInTheDocument();
    expect(screen.queryByText(/General \/ Sin miembro específico/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Concepto/i)).not.toBeInTheDocument();

    const memberInput = await screen.findByLabelText(/Miembro vinculado \*/i);
    expect(memberInput.tagName).toBe('INPUT');

    fireEvent.change(screen.getByLabelText(/Monto \(USD\)/i), {
      target: { value: '250' },
    });
    fireEvent.change(screen.getByLabelText(/Referencia/i), {
      target: { value: 'REF-5544' },
    });

    // Submitting without a member must be blocked
    const form = screen.getByRole('button', { name: /Guardar Aporte/i }).closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);

    expect(
      await screen.findByText(
        /Debe seleccionar un miembro vinculado para registrar el aporte interno/i,
      ),
    ).toBeInTheDocument();
    expect(financeApi.registrarAporteInterno).not.toHaveBeenCalled();

    // Searching and selecting a member enables successful submission
    fireEvent.change(memberInput, { target: { value: 'Carlos' } });
    fireEvent.click(await screen.findByRole('option', { name: /Carlos Pérez/i }));
    fireEvent.click(screen.getByRole('button', { name: /Guardar Aporte/i }));

    await waitFor(() => {
      expect(financeApi.registrarAporteInterno).toHaveBeenCalledWith(
        expect.objectContaining({
          miembro_id: 'mem-1',
          donante_nombre: 'Carlos Pérez',
          moneda: 'USD',
          medio_pago: 'transferencia',
          monto_original: 250,
          monto_usd: 250,
          referencia: 'REF-5544',
        }),
      );
    });
  });
});
