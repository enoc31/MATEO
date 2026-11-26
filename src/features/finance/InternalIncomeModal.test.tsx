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
    vi.mocked(financeApi.registrarAporteInterno).mockResolvedValue({
      id: 'don-1',
      proyecto_id: null,
      transaccion_id: null,
      donante: 'Aporte Interno',
      monto: 100,
      descripcion: 'OFRENDA',
      fecha: '2026-11-23',
      moneda: 'USD',
      medio_pago: 'transferencia',
      monto_original: 100,
      tasa_bcv: 50,
      monto_usd: 100,
      monto_ves: 5000,
    });
  });

  it('renders dedicated modal for transferencia and pago_movil without banknote counter', async () => {
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

    expect(
      await screen.findByText(/Registrar Aporte Interno \(Transferencia \/ Pago Móvil\)/i),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('cash-denomination-counter')).not.toBeInTheDocument();
    expect(screen.queryByText(/General \/ Sin miembro específico/i)).not.toBeInTheDocument();

    const memberInput = await screen.findByLabelText(/Miembro vinculado \*/i);
    expect(memberInput.tagName).toBe('INPUT');

    fireEvent.change(memberInput, { target: { value: 'Carlos' } });
    fireEvent.click(await screen.findByRole('option', { name: /Carlos Pérez/i }));
    fireEvent.change(screen.getByLabelText(/Monto \(USD\)/i), {
      target: { value: '150' },
    });
    fireEvent.change(screen.getByLabelText(/Referencia/i), {
      target: { value: '998877' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Guardar Aporte/i }));

    await waitFor(() => {
      expect(financeApi.registrarAporteInterno).toHaveBeenCalledWith(
        expect.objectContaining({
          miembro_id: 'mem-1',
          donante_nombre: 'Carlos Pérez',
          moneda: 'USD',
          medio_pago: 'transferencia',
          monto_original: 150,
          monto_usd: 150,
          referencia: '998877',
        }),
      );
    });

    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
