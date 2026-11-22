import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api')>();
  return {
    ...actual,
    isSimulationMode: true,
    api: {
      ...actual.api,
      getBeneficiaries: vi.fn().mockResolvedValue([
        {
          id: 'ben-1',
          jornada_id: 'jor-1',
          nombre: 'Carlos',
          apellido: 'Mendoza',
          cedula: '18555444',
          sexo: 'Masculino',
          fecha_nacimiento: '1990-01-01',
        },
      ]),
      createDonation: vi.fn().mockImplementation(async (d) => ({
        ...d,
        id: 'don-sim-99',
        created_at: new Date().toISOString(),
      })),
    },
  };
});

import { financeApi, findDuplicateReferences, type ReporteAporte } from './financeApi';
import type { Donation } from './api';

describe('financeApi (Modo Simulación)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('detects duplicate references across pending reports and confirmed donations', () => {
    const reportes: ReporteAporte[] = [
      {
        id: 'rep-1',
        codigo_confirmacion: 'APO-111111',
        ong_id: 'ong-1',
        cuenta_receptora_id: null,
        miembro_id: null,
        es_anonimo: false,
        nombre_aportante: 'Juan',
        telefono_aportante: null,
        cedula_aportante: null,
        categoria_aporte: 'diezmo',
        moneda: 'VES',
        monto_original: 1000,
        tasa_bcv: 100,
        monto_usd: 10,
        monto_ves: 1000,
        medio_pago: 'pago_movil',
        referencia: '998877',
        sin_referencia_mismo_banco: false,
        banco_emisor: 'Banesco',
        telefono_emisor: '04141112233',
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
    ];

    const donations: Donation[] = [
      {
        id: 'don-1',
        proyecto_id: null,
        transaccion_id: null,
        donante: 'Juan',
        monto: 10,
        descripcion: 'Diezmo',
        fecha: '2026-11-20',
        moneda: 'VES',
        medio_pago: 'pago_movil',
        monto_original: 1000,
        tasa_bcv: 100,
        monto_usd: 10,
        monto_ves: 1000,
        referencia: '998877',
      },
    ];

    const dups = findDuplicateReferences(reportes, donations);
    expect(dups['rep-1'].hasDuplicate).toBe(true);
  });

  it('submits, approves, and creates a confirmed donation with member link', async () => {
    localStorage.setItem(
      'cnbv_beneficiaries',
      JSON.stringify([
        {
          id: 'ben-1',
          jornada_id: 'jor-1',
          nombre: 'Carlos',
          apellido: 'Mendoza',
          cedula: '18555444',
          sexo: 'Masculino',
          fecha_nacimiento: '1990-01-01',
        },
      ]),
    );

    const lookup = await financeApi.buscarMiembroParaAporte('ong-1', '18555444');
    expect(lookup.encontrado).toBe(true);
    expect(lookup.nombre_enmascarado).toBe('C***** M*****');

    const report = await financeApi.submitReporteAporte({
      ong_id: 'ong-1',
      cuenta_receptora_id: null,
      miembro_id: lookup.miembro_id || null,
      es_anonimo: false,
      nombre_aportante: null,
      telefono_aportante: null,
      cedula_aportante: '18555444',
      categoria_aporte: 'diezmo',
      moneda: 'VES',
      monto_original: 500,
      tasa_bcv: 50,
      monto_usd: 10,
      monto_ves: 500,
      medio_pago: 'pago_movil',
      referencia: '123456',
      sin_referencia_mismo_banco: false,
      banco_emisor: 'Banesco',
      telefono_emisor: '04141234567',
      fecha_pago: '2026-11-21',
      actividad_o_responsable: null,
      comprobante_url: null,
    });

    expect(report.codigo_confirmacion).toMatch(/^APO-/);
    expect(report.estado).toBe('pendiente');

    const donationId = await financeApi.aprobarReporteAporte({
      reporteId: report.id,
      tasaBcv: 100,
      verifierUserId: 'tesorero-1',
    });

    expect(donationId).toBeTruthy();
    const storedReportes = await financeApi.getReportesAportes('ong-1');
    expect(storedReportes[0].estado).toBe('aprobado');
    expect(storedReportes[0].monto_usd).toBe(5);
    expect(storedReportes[0].miembro_nombre).toBe('Carlos Mendoza');
    expect(storedReportes[0].miembro_cedula).toBe('18555444');
  });

  it('rejects a pending report requiring a mandatory reason', async () => {
    const report = await financeApi.submitReporteAporte({
      ong_id: 'ong-1',
      cuenta_receptora_id: null,
      miembro_id: null,
      es_anonimo: true,
      nombre_aportante: null,
      telefono_aportante: null,
      cedula_aportante: null,
      categoria_aporte: 'ofrenda',
      moneda: 'USD',
      monto_original: 25,
      tasa_bcv: null,
      monto_usd: 25,
      monto_ves: null,
      medio_pago: 'efectivo',
      referencia: null,
      sin_referencia_mismo_banco: false,
      banco_emisor: null,
      telefono_emisor: null,
      fecha_pago: '2026-11-21',
      actividad_o_responsable: 'Culto Dominical',
      comprobante_url: null,
    });

    await expect(financeApi.rechazarReporteAporte(report.id, '   ')).rejects.toThrow(
      /motivo de rechazo/i,
    );

    await financeApi.rechazarReporteAporte(report.id, 'No entregado en caja');
    const updated = await financeApi.getReportesAportes('ong-1');
    expect(updated[0].estado).toBe('rechazado');
    expect(updated[0].motivo_rechazo).toBe('No entregado en caja');
  });
});
