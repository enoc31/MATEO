import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FinanceIncomesTable } from './FinanceIncomesTable';
import { FinanceExpensesTable } from './FinanceExpensesTable';
import { VerificationQueueTab } from './VerificationQueueTab';
import type { Donation, Requisition } from '../../services/api';
import type { ReporteAporte } from '../../services/financeApi';

const sampleDonations: Donation[] = [
  {
    id: 'don-1',
    proyecto_id: null,
    transaccion_id: null,
    donante: 'Diego Martínez',
    monto: 16.33,
    descripcion: 'Diezmo dominical',
    fecha: '2026-11-21',
    moneda: 'VES',
    medio_pago: 'efectivo',
    monto_original: 15000,
    tasa_bcv: 918.76,
    monto_usd: 16.33,
    monto_ves: 15000,
    categoria_aporte: 'diezmo',
    referencia: 'REF-001',
  },
  {
    id: 'don-2',
    proyecto_id: null,
    transaccion_id: null,
    donante: 'Valentina Morales',
    monto: 150000,
    descripcion: 'Ofrenda misiones',
    fecha: '2026-11-21',
    moneda: 'USD',
    medio_pago: 'transferencia',
    monto_original: 150000,
    tasa_bcv: null,
    monto_usd: 150000,
    monto_ves: null,
    categoria_aporte: 'misiones',
    referencia: 'REF-002',
  },
];

const sampleRequisitions: Requisition[] = [
  {
    id: 'req-1',
    codigo: 'SOL-001',
    solicitante_id: 'user-1',
    solicitante_nombre: 'Pedro Páez',
    proyecto_id: 'proj-1',
    proyecto_nombre: 'Ayuda Social',
    partida_id: 'part-1',
    partida_nombre: 'Alimentos',
    monto_solicitado: 1250.5,
    motivo: 'Compra de víveres',
    estado: 'aprobada_ejecucion',
    validador_1_id: null,
    validado_1_at: null,
    validador_2_id: null,
    validado_2_at: null,
    rechazado_por: null,
    rechazado_at: null,
    motivo_rechazo: null,
    created_at: '2026-11-21T00:00:00Z',
    updated_at: '2026-11-21T00:00:00Z',
  },
];

describe('Finance Figma Data Tables', () => {
  it('renders FinanceIncomesTable with formatted VES/USD amounts, tabs, and expandable detail', () => {
    render(
      <FinanceIncomesTable
        donations={sampleDonations}
        canManage={true}
        onImportStatement={vi.fn()}
        onRegisterInternal={vi.fn()}
      />,
    );

    expect(screen.getByText('Diego Martínez')).toBeInTheDocument();
    expect(screen.getByText('Bs. 15.000,00')).toBeInTheDocument();
    expect(screen.getByText('$16,33')).toBeInTheDocument();

    // Acta de Ingreso (PDF) link appears only on cash income rows (don-1) and not on bank transfer rows (don-2)
    expect(screen.getByTestId('download-acta-btn-don-1')).toBeInTheDocument();
    expect(screen.queryByTestId('download-acta-btn-don-2')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Diezmos' }));
    expect(screen.getByText('Diego Martínez')).toBeInTheDocument();
    expect(screen.queryByText('Valentina Morales')).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /Ver detalle de aporte de Diego Martínez/i }),
    );
    expect(screen.getByText('Diezmo dominical')).toBeInTheDocument();
  });

  it('renders FinanceExpensesTable with formatted amount and status pill', () => {
    const onNavigate = vi.fn();
    render(
      <FinanceExpensesTable
        requisitions={sampleRequisitions}
        onNavigateRequisitions={onNavigate}
      />,
    );

    expect(screen.getByText(/SOL-001 · Compra de víveres/i)).toBeInTheDocument();
    expect(screen.getAllByText('$1.250,50').length).toBeGreaterThanOrEqual(2);
    fireEvent.click(screen.getByRole('button', { name: 'Ver más' }));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it('renders VerificationQueueTab with a Ver comprobante link on every pending report and opens viewer modal', () => {
    const sampleReportes: ReporteAporte[] = [
      {
        id: 'rep-1',
        codigo_confirmacion: 'APO-VSKL8Y',
        ong_id: 'ong-1',
        cuenta_receptora_id: null,
        miembro_id: 'ben-1',
        miembro_nombre: 'Diego Martínez',
        miembro_cedula: 'V-12345678',
        es_anonimo: false,
        nombre_aportante: null,
        telefono_aportante: null,
        cedula_aportante: null,
        categoria_aporte: 'ofrenda',
        moneda: 'USD',
        monto_original: 15000,
        tasa_bcv: 918.7662,
        monto_usd: 15000,
        monto_ves: null,
        medio_pago: 'transferencia',
        referencia: '124569',
        sin_referencia_mismo_banco: false,
        banco_emisor: 'Banco Bicentenario',
        telefono_emisor: null,
        fecha_pago: '2026-11-21',
        actividad_o_responsable: null,
        comprobante_url: null,
        estado: 'pendiente',
        motivo_rechazo: null,
        verificado_por: null,
        verificado_at: null,
        donacion_id: null,
        created_at: '2026-11-21T00:00:00Z',
      },
    ];

    render(
      <VerificationQueueTab
        reportes={sampleReportes}
        donations={[]}
        bankTxs={[]}
        canManage={true}
        onRefresh={vi.fn()}
        onFeedback={vi.fn()}
      />,
    );

    expect(screen.getByText(/Diego Martínez · C\.I\. V-12345678/i)).toBeInTheDocument();
    const receiptBtn = screen.getByRole('button', { name: /Ver comprobante/i });
    expect(receiptBtn).toBeInTheDocument();

    fireEvent.click(receiptBtn);
    expect(screen.getByRole('dialog', { name: /Visor de comprobante/i })).toBeInTheDocument();
    expect(screen.getByAltText(/Comprobante APO-VSKL8Y/i)).toBeInTheDocument();
  });
});
