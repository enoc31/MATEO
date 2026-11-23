import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { InternalIncomeModal } from './InternalIncomeModal';
import { api } from '../../services/api';
import { financeApi } from '../../services/financeApi';

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

describe('InternalIncomeModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('displays the banknote counter only when payment method is efectivo', async () => {
    render(
      <InternalIncomeModal
        isOpen={true}
        ongId="ong-1"
        userId="u-1"
        onClose={vi.fn()}
        onSuccess={vi.fn().mockResolvedValue(undefined)}
        onFeedback={vi.fn()}
      />,
    );

    expect(await screen.findByTestId('cash-denomination-counter')).toBeInTheDocument();
    expect(screen.getByTestId('cone-tab-VES')).toBeInTheDocument();
    expect(screen.getByTestId('cone-tab-USD')).toBeInTheDocument();
    expect(screen.getByTestId('cone-tab-EUR')).toBeInTheDocument();
    expect(screen.getByTestId('cone-tab-COP')).toBeInTheDocument();

    // Switch method to transferencia -> banknote counter disappears, standard monto input appears
    fireEvent.change(screen.getByLabelText(/Método/i), {
      target: { value: 'transferencia' },
    });

    expect(screen.queryByTestId('cash-denomination-counter')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Monto \(USD\)/i)).toBeInTheDocument();
  });

  it('registers multiple currency cones in a single cash counting session with bill breakdowns', async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn().mockResolvedValue(undefined);
    const onFeedback = vi.fn();

    render(
      <InternalIncomeModal
        isOpen={true}
        ongId="ong-1"
        userId="u-1"
        onClose={onClose}
        onSuccess={onSuccess}
        onFeedback={onFeedback}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('rate-input-VES')).toHaveValue(50);
    });

    // 1. Count 4 bills of Bs. 500 (= Bs. 2.000 -> $40 USD at rate 50)
    fireEvent.change(screen.getByTestId('bill-input-VES-500'), { target: { value: '4' } });

    // 2. Switch to USD and count 2 bills of $50 (= $100 USD)
    fireEvent.click(screen.getByTestId('cone-tab-USD'));
    fireEvent.change(screen.getByTestId('bill-input-USD-50'), { target: { value: '2' } });

    // 3. Switch to COP, set rate 4000, and count 2 bills of $100.000 COP (= $50 USD)
    fireEvent.click(screen.getByTestId('cone-tab-COP'));
    fireEvent.change(screen.getByTestId('rate-input-COP'), { target: { value: '4000' } });
    fireEvent.change(screen.getByTestId('bill-input-COP-100000'), { target: { value: '2' } });

    fireEvent.click(screen.getByRole('button', { name: /Guardar Aporte/i }));

    await waitFor(() => {
      expect(financeApi.registrarAporteInterno).toHaveBeenCalledTimes(3);
    });

    expect(financeApi.registrarAporteInterno).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        moneda: 'VES',
        medio_pago: 'efectivo',
        monto_original: 2000,
        tasa_bcv: 50,
        monto_usd: 40,
        monto_ves: 2000,
        descripcion: expect.stringContaining('Arqueo VES [4 billetes]'),
      }),
    );

    expect(financeApi.registrarAporteInterno).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        moneda: 'USD',
        medio_pago: 'efectivo',
        monto_original: 100,
        monto_usd: 100,
        descripcion: expect.stringContaining('Arqueo USD [2 billetes]'),
      }),
    );

    expect(financeApi.registrarAporteInterno).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        moneda: 'COP',
        medio_pago: 'efectivo',
        monto_original: 200000,
        tasa_bcv: 4000,
        monto_usd: 50,
        descripcion: expect.stringContaining('Arqueo COP [2 billetes]'),
      }),
    );

    expect(onSuccess).toHaveBeenCalled();
    expect(onFeedback).toHaveBeenCalledWith(
      expect.stringContaining('3 conos monetarios'),
      'success',
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('shows validation error if cash mode is submitted with zero counted bills', async () => {
    const onFeedback = vi.fn();
    render(
      <InternalIncomeModal
        isOpen={true}
        ongId="ong-1"
        userId="u-1"
        onClose={vi.fn()}
        onSuccess={vi.fn().mockResolvedValue(undefined)}
        onFeedback={onFeedback}
      />,
    );

    await screen.findByTestId('cash-denomination-counter');
    fireEvent.click(screen.getByRole('button', { name: /Guardar Aporte/i }));

    expect(onFeedback).toHaveBeenCalledWith(
      'Debe ingresar la cantidad de billetes contados en al menos un cono monetario.',
      'error',
    );
    expect(financeApi.registrarAporteInterno).not.toHaveBeenCalled();
  });
});
