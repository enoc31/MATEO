import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    vi.mocked(api.getBeneficiaries).mockResolvedValue([]);
    vi.mocked(api.getTasasBCV).mockResolvedValue([]);
    vi.mocked(api.getTasaByDate).mockResolvedValue({
      id: 't-1',
      fecha: '2026-11-23',
      tasa: 50,
      fuente: 'bcv_api',
      created_at: '',
    });
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

    await waitFor(() => {
      expect(screen.getByTestId('rate-input-VES')).toHaveValue(50);
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

    // Switch to EUR and count 1 bill of €100 at rate 1.1 (= $110 USD)
    fireEvent.click(screen.getByTestId('cone-tab-EUR'));
    fireEvent.change(screen.getByTestId('rate-input-EUR'), { target: { value: '1.1' } });
    fireEvent.change(screen.getByTestId('bill-input-EUR-100'), { target: { value: '1' } });

    fireEvent.click(screen.getByRole('button', { name: /Guardar Arqueo en Efectivo/i }));

    await waitFor(() => {
      expect(financeApi.registrarAporteInterno).toHaveBeenCalledTimes(2);
    });

    expect(financeApi.registrarAporteInterno).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        descripcion: expect.stringContaining('Conteo adicional: Pedro Gómez, María Rodríguez'),
      }),
    );

    expect(await screen.findByText(/2 conos monetarios/i)).toBeInTheDocument();
  });

  it('renders dedicated full-page InternalBankIncomePageContent for bank transfers and mobile payments without modals', async () => {
    const navigate = vi.fn();
    render(<InternalBankIncomePageContent navigate={navigate} />);

    expect(await screen.findByTestId('internal-bank-income-page')).toBeInTheDocument();
    expect(screen.queryByTestId('cash-denomination-counter')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Monto \(USD\)/i), {
      target: { value: '250' },
    });
    fireEvent.change(screen.getByLabelText(/Referencia/i), {
      target: { value: 'REF-5544' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Guardar Aporte/i }));

    await waitFor(() => {
      expect(financeApi.registrarAporteInterno).toHaveBeenCalledWith(
        expect.objectContaining({
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
