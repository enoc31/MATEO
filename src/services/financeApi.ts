import { supabase } from '../supabaseClient';
import {
  api,
  isSimulationMode,
  type BankTransaction,
  type Beneficiary,
  type Donation,
  type Ong,
} from './api';
import { uploadToGCS } from './storage';
import {
  generateConfirmationCode,
  maskPersonName,
  type CategoriaAporte,
} from '../utils/rolePermissions';

export type TipoCuentaReceptora = 'transferencia' | 'pago_movil';
export type MedioPagoAporte = 'transferencia' | 'pago_movil' | 'efectivo';
export type EstadoReporteAporte = 'pendiente' | 'aprobado' | 'rechazado';

export interface CuentaReceptora {
  id: string;
  ong_id: string;
  tipo: TipoCuentaReceptora;
  banco: string;
  numero_cuenta: string | null;
  telefono: string | null;
  rif_cedula: string;
  titular: string;
  tipo_fondo: string;
  activa: boolean;
  created_at?: string;
}

export interface ReporteAporte {
  id: string;
  codigo_confirmacion: string;
  ong_id: string;
  cuenta_receptora_id: string | null;
  miembro_id: string | null;
  miembro_nombre?: string | null;
  es_anonimo: boolean;
  nombre_aportante: string | null;
  telefono_aportante: string | null;
  cedula_aportante: string | null;
  categoria_aporte: CategoriaAporte;
  moneda: 'USD' | 'VES';
  monto_original: number;
  tasa_bcv: number | null;
  monto_usd: number;
  monto_ves: number | null;
  medio_pago: MedioPagoAporte;
  referencia: string | null;
  sin_referencia_mismo_banco: boolean;
  banco_emisor: string | null;
  telefono_emisor: string | null;
  fecha_pago: string;
  actividad_o_responsable: string | null;
  comprobante_url: string | null;
  estado: EstadoReporteAporte;
  motivo_rechazo: string | null;
  verificado_por: string | null;
  verificado_at: string | null;
  donacion_id: string | null;
  created_at: string;
}

export interface PublicOngInfo {
  id: string;
  nombre: string;
  logo_url: string | null;
  tipo_organizacion?: 'ong' | 'ekklesia';
}

export interface MemberLookupResult {
  encontrado: boolean;
  miembro_id?: string;
  nombre_enmascarado?: string;
}

export interface DuplicateReferenceInfo {
  hasDuplicate: boolean;
  reason?: string;
}

export interface SubmitReporteAporteInput {
  ong_id: string;
  cuenta_receptora_id: string | null;
  miembro_id: string | null;
  miembro_nombre?: string | null;
  es_anonimo: boolean;
  nombre_aportante: string | null;
  telefono_aportante: string | null;
  cedula_aportante: string | null;
  categoria_aporte: CategoriaAporte;
  moneda: 'USD' | 'VES';
  monto_original: number;
  tasa_bcv: number | null;
  monto_usd: number;
  monto_ves: number | null;
  medio_pago: MedioPagoAporte;
  referencia: string | null;
  sin_referencia_mismo_banco: boolean;
  banco_emisor: string | null;
  telefono_emisor: string | null;
  fecha_pago: string;
  actividad_o_responsable: string | null;
  comprobante_url: string | null;
}

export interface ApproveReporteAporteInput {
  reporteId: string;
  tasaBcv?: number | null;
  transaccionId?: string | null;
  verifierUserId?: string;
}

export interface InternalAporteInput {
  ong_id?: string;
  miembro_id?: string | null;
  donante_nombre: string;
  categoria_aporte: CategoriaAporte;
  moneda: 'USD' | 'VES';
  monto_original: number;
  tasa_bcv: number | null;
  monto_usd: number;
  monto_ves: number | null;
  medio_pago: MedioPagoAporte;
  referencia?: string | null;
  banco_emisor?: string | null;
  telefono_emisor?: string | null;
  fecha: string;
  actividad_o_responsable?: string | null;
  comprobante_url?: string | null;
  cuenta_receptora_id?: string | null;
  descripcion?: string;
  userId?: string;
}

const CUENTAS_STORAGE_KEY = 'cnbv_cuentas_receptoras';
const REPORTES_STORAGE_KEY = 'cnbv_reportes_aportes';

const INITIAL_CUENTAS: CuentaReceptora[] = [
  {
    id: 'cta-sim-1',
    ong_id: '11111111-1111-1111-1111-111111111111',
    tipo: 'pago_movil',
    banco: 'Banco de Venezuela',
    numero_cuenta: null,
    telefono: '0414-0001122',
    rif_cedula: 'J-00012345-6',
    titular: 'Iglesia / Tesorería General',
    tipo_fondo: 'Diezmos y Ofrendas',
    activa: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'cta-sim-2',
    ong_id: '11111111-1111-1111-1111-111111111111',
    tipo: 'transferencia',
    banco: 'Banesco',
    numero_cuenta: '0134-0000-00-0001234567',
    telefono: null,
    rif_cedula: 'J-00012345-6',
    titular: 'Iglesia / Tesorería General',
    tipo_fondo: 'Pro-Templo y Misiones',
    activa: true,
    created_at: new Date().toISOString(),
  },
];

function getStoredCuentas(): CuentaReceptora[] {
  const raw = localStorage.getItem(CUENTAS_STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(CUENTAS_STORAGE_KEY, JSON.stringify(INITIAL_CUENTAS));
    return INITIAL_CUENTAS;
  }
  return JSON.parse(raw) as CuentaReceptora[];
}

function getStoredReportes(): ReporteAporte[] {
  const raw = localStorage.getItem(REPORTES_STORAGE_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as ReporteAporte[];
}

function normalizeRef(value?: string | null): string {
  return (value || '').replace(/\s+/g, '').toUpperCase();
}

export function findDuplicateReferences(
  reportes: ReporteAporte[],
  donations: Donation[],
): Record<string, DuplicateReferenceInfo> {
  const result: Record<string, DuplicateReferenceInfo> = {};

  const refCountInReportes = new Map<string, string[]>();
  for (const r of reportes) {
    if (r.estado === 'rechazado') continue;
    const norm = normalizeRef(r.referencia);
    if (!norm) continue;
    const list = refCountInReportes.get(norm) || [];
    list.push(r.id);
    refCountInReportes.set(norm, list);
  }

  const donationRefs = new Set<string>();
  for (const d of donations) {
    const norm = normalizeRef(d.referencia);
    if (norm) donationRefs.add(norm);
  }

  for (const r of reportes) {
    const norm = normalizeRef(r.referencia);
    if (!norm) {
      result[r.id] = { hasDuplicate: false };
      continue;
    }

    const otherReports = (refCountInReportes.get(norm) || []).filter((id) => id !== r.id);
    const matchesExistingDonation = r.estado === 'pendiente' && donationRefs.has(norm);

    if (otherReports.length > 0 && matchesExistingDonation) {
      result[r.id] = {
        hasDuplicate: true,
        reason: `Referencia "${r.referencia}" ya existe en otro reporte y en un ingreso confirmado.`,
      };
    } else if (otherReports.length > 0) {
      result[r.id] = {
        hasDuplicate: true,
        reason: `Referencia "${r.referencia}" aparece duplicada en otro reporte de aporte.`,
      };
    } else if (matchesExistingDonation) {
      result[r.id] = {
        hasDuplicate: true,
        reason: `Referencia "${r.referencia}" ya fue registrada en un ingreso confirmado previo.`,
      };
    } else {
      result[r.id] = { hasDuplicate: false };
    }
  }

  return result;
}

export const financeApi = {
  getPublicTasaBcv: async (ongId: string, fecha: string): Promise<number | null> => {
    if (!isSimulationMode && ongId) {
      const { data, error } = await supabase.rpc('get_public_tasa_bcv', {
        p_ong_id: ongId,
        p_fecha: fecha,
      });
      if (!error && data !== null && data !== undefined) {
        const parsed = Number(data);
        if (Number.isFinite(parsed) && parsed > 1) {
          return parsed;
        }
      }
    }

    let rateObj = await api.getTasaByDate(fecha);
    if (!rateObj || rateObj.tasa <= 1) {
      const todas = await api.getTasasBCV();
      if (todas && todas.length > 0) {
        rateObj = todas[0];
      }
    }
    return rateObj && rateObj.tasa > 1 ? rateObj.tasa : null;
  },

  getPublicOngInfo: async (ongId: string): Promise<PublicOngInfo | null> => {
    if (!isSimulationMode) {
      const { data, error } = await supabase
        .from('ongs')
        .select('id, nombre, logo_url, tipo_organizacion')
        .eq('id', ongId)
        .single();
      if (error || !data) return null;
      return data as PublicOngInfo;
    }

    const ongs = JSON.parse(localStorage.getItem('cnbv_ongs') || '[]') as Ong[];
    const match = ongs.find((o) => o.id === ongId);
    if (match) {
      return {
        id: match.id,
        nombre: match.nombre,
        logo_url: match.logo_url,
        tipo_organizacion: match.tipo_organizacion || 'ekklesia',
      };
    }
    return {
      id: ongId,
      nombre: 'Iglesia / Organización (Modo Demo)',
      logo_url: '/mateo_logo.png',
      tipo_organizacion: 'ekklesia',
    };
  },

  getCuentasReceptoras: async (ongId?: string): Promise<CuentaReceptora[]> => {
    if (!isSimulationMode) {
      let query = supabase
        .from('cuentas_receptoras_iglesia')
        .select('*')
        .order('created_at', { ascending: false });
      if (ongId) {
        query = query.eq('ong_id', ongId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as CuentaReceptora[];
    }

    const all = getStoredCuentas();
    return ongId ? all.filter((c) => c.ong_id === ongId || c.ong_id.startsWith('11111111')) : all;
  },

  getPublicCuentasReceptoras: async (ongId: string): Promise<CuentaReceptora[]> => {
    if (!isSimulationMode) {
      const { data, error } = await supabase
        .from('cuentas_receptoras_iglesia')
        .select('*')
        .eq('ong_id', ongId)
        .eq('activa', true)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as CuentaReceptora[];
    }

    const all = getStoredCuentas();
    return all.filter(
      (c) =>
        c.activa && (c.ong_id === ongId || ongId === 'demo' || c.ong_id.startsWith('11111111')),
    );
  },

  createCuentaReceptora: async (
    input: Omit<CuentaReceptora, 'id' | 'created_at' | 'ong_id'>,
    ongId?: string,
  ): Promise<CuentaReceptora> => {
    if (!isSimulationMode) {
      const payload = ongId ? { ...input, ong_id: ongId } : input;
      const { data, error } = await supabase
        .from('cuentas_receptoras_iglesia')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return data as CuentaReceptora;
    }

    const all = getStoredCuentas();
    const created: CuentaReceptora = {
      ...input,
      id: `cta-${Date.now()}`,
      ong_id: ongId || '11111111-1111-1111-1111-111111111111',
      created_at: new Date().toISOString(),
    };
    all.unshift(created);
    localStorage.setItem(CUENTAS_STORAGE_KEY, JSON.stringify(all));
    return created;
  },

  updateCuentaReceptora: async (
    id: string,
    updates: Partial<Omit<CuentaReceptora, 'id' | 'ong_id' | 'created_at'>>,
  ): Promise<CuentaReceptora> => {
    if (!isSimulationMode) {
      const { data, error } = await supabase
        .from('cuentas_receptoras_iglesia')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as CuentaReceptora;
    }

    const all = getStoredCuentas();
    const idx = all.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Cuenta receptora no encontrada');
    const updated = { ...all[idx], ...updates };
    all[idx] = updated;
    localStorage.setItem(CUENTAS_STORAGE_KEY, JSON.stringify(all));
    return updated;
  },

  deleteCuentaReceptora: async (id: string): Promise<void> => {
    if (!isSimulationMode) {
      const { error } = await supabase.from('cuentas_receptoras_iglesia').delete().eq('id', id);
      if (error) throw error;
      return;
    }

    const all = getStoredCuentas().filter((c) => c.id !== id);
    localStorage.setItem(CUENTAS_STORAGE_KEY, JSON.stringify(all));
  },

  buscarMiembroParaAporte: async (ongId: string, cedula: string): Promise<MemberLookupResult> => {
    const cleanCedula = cedula.replace(/[^0-9A-Za-z]/g, '');
    if (cleanCedula.length < 4) {
      return { encontrado: false };
    }

    if (!isSimulationMode) {
      const { data, error } = await supabase.rpc('buscar_miembro_para_aporte', {
        p_ong_id: ongId,
        p_cedula: cleanCedula,
      });
      if (error) throw error;
      return (data as MemberLookupResult) || { encontrado: false };
    }

    const members = await api.getBeneficiaries();
    const found = members.find(
      (m: Beneficiary) =>
        m.cedula.replace(/[^0-9A-Za-z]/g, '').toLowerCase() === cleanCedula.toLowerCase(),
    );
    if (!found) {
      return { encontrado: false };
    }

    return {
      encontrado: true,
      miembro_id: found.id,
      nombre_enmascarado: maskPersonName(found.nombre, found.apellido),
    };
  },

  uploadComprobanteAporte: async (file: File): Promise<string> => {
    if (!isSimulationMode) {
      const uploaded = await uploadToGCS(file);
      return uploaded.url;
    }

    return URL.createObjectURL(file);
  },

  submitReporteAporte: async (input: SubmitReporteAporteInput): Promise<ReporteAporte> => {
    const codigo = generateConfirmationCode();

    if (!isSimulationMode) {
      const { data, error } = await supabase.rpc('registrar_reporte_aporte', {
        p_ong_id: input.ong_id,
        p_cuenta_receptora_id: input.cuenta_receptora_id,
        p_miembro_id: input.miembro_id,
        p_es_anonimo: input.es_anonimo,
        p_nombre_aportante: input.nombre_aportante,
        p_telefono_aportante: input.telefono_aportante,
        p_cedula_aportante: input.cedula_aportante,
        p_categoria_aporte: input.categoria_aporte,
        p_moneda: input.moneda,
        p_monto_original: input.monto_original,
        p_tasa_bcv: input.tasa_bcv,
        p_monto_usd: input.monto_usd,
        p_monto_ves: input.monto_ves,
        p_medio_pago: input.medio_pago,
        p_banco_emisor: input.banco_emisor,
        p_telefono_emisor: input.telefono_emisor,
        p_referencia: input.referencia,
        p_sin_referencia_mismo_banco: input.sin_referencia_mismo_banco,
        p_fecha_pago: input.fecha_pago,
        p_actividad_o_responsable: input.actividad_o_responsable,
        p_comprobante_url: input.comprobante_url,
        p_codigo_confirmacion: codigo,
      });
      if (error) throw error;
      return data as ReporteAporte;
    }

    const all = getStoredReportes();
    const created: ReporteAporte = {
      ...input,
      id: `rep-${Date.now()}`,
      codigo_confirmacion: codigo,
      estado: 'pendiente',
      motivo_rechazo: null,
      verificado_por: null,
      verificado_at: null,
      donacion_id: null,
      created_at: new Date().toISOString(),
    };
    all.unshift(created);
    localStorage.setItem(REPORTES_STORAGE_KEY, JSON.stringify(all));
    return created;
  },

  getReportesAportes: async (ongId?: string): Promise<ReporteAporte[]> => {
    if (!isSimulationMode) {
      let query = supabase
        .from('reportes_aportes')
        .select('*')
        .order('created_at', { ascending: false });
      if (ongId) {
        query = query.eq('ong_id', ongId);
      }
      const { data, error } = await query;
      if (error) throw error;
      const reports = (data || []) as ReporteAporte[];
      const memberIds = Array.from(
        new Set(reports.map((r) => r.miembro_id).filter((id): id is string => Boolean(id))),
      );
      if (memberIds.length > 0) {
        const { data: membersData } = await supabase
          .from('beneficiaries')
          .select('id, nombre, apellido')
          .in('id', memberIds);
        const nameMap = new Map<string, string>();
        for (const m of (membersData || []) as { id: string; nombre: string; apellido: string }[]) {
          const fullName = `${m.nombre || ''} ${m.apellido || ''}`.trim();
          if (fullName) nameMap.set(m.id, fullName);
        }
        return reports.map((r) =>
          r.miembro_id && nameMap.has(r.miembro_id)
            ? { ...r, miembro_nombre: nameMap.get(r.miembro_id) || null }
            : r,
        );
      }
      return reports;
    }

    const all = getStoredReportes();
    const filtered = ongId
      ? all.filter((r) => r.ong_id === ongId || r.ong_id.startsWith('11111111'))
      : all;
    const hasMemberLinks = filtered.some((r) => Boolean(r.miembro_id));
    if (hasMemberLinks) {
      const members = await api.getBeneficiaries(ongId);
      const nameMap = new Map<string, string>();
      for (const m of members) {
        const fullName = `${m.nombre || ''} ${m.apellido || ''}`.trim();
        if (fullName) nameMap.set(m.id, fullName);
      }
      return filtered.map((r) =>
        r.miembro_id && nameMap.has(r.miembro_id)
          ? { ...r, miembro_nombre: nameMap.get(r.miembro_id) || null }
          : r,
      );
    }
    return filtered;
  },

  aprobarReporteAporte: async (input: ApproveReporteAporteInput): Promise<string> => {
    const { reporteId, tasaBcv, transaccionId, verifierUserId } = input;

    if (!isSimulationMode) {
      const { data, error } = await supabase.rpc('aprobar_reporte_aporte', {
        p_reporte_id: reporteId,
        p_tasa_bcv: tasaBcv ?? null,
        p_transaccion_id: transaccionId ?? null,
      });
      if (error) throw error;
      return String(data);
    }

    const reportes = getStoredReportes();
    const idx = reportes.findIndex((r) => r.id === reporteId);
    if (idx === -1) throw new Error('Reporte de aporte no encontrado');
    const rep = reportes[idx];
    if (rep.estado !== 'pendiente') {
      throw new Error('Este reporte ya fue procesado');
    }

    const finalTasa = tasaBcv ?? rep.tasa_bcv;
    const finalUsd =
      rep.moneda === 'VES' && finalTasa && finalTasa > 0
        ? parseFloat((rep.monto_original / finalTasa).toFixed(2))
        : rep.monto_usd;
    const finalVes = rep.moneda === 'VES' ? rep.monto_original : rep.monto_ves;

    let donanteLabel = rep.nombre_aportante || 'Visitante';
    if (rep.es_anonimo) {
      donanteLabel = 'Aporte Anónimo / Visitante';
    } else if (rep.miembro_id) {
      const members = await api.getBeneficiaries();
      const member = members.find((m) => m.id === rep.miembro_id);
      if (member) {
        donanteLabel = `${member.nombre} ${member.apellido}`.trim();
      }
    }

    const createdDonation = await api.createDonation({
      proyecto_id: null,
      transaccion_id: transaccionId ?? null,
      donante: donanteLabel,
      monto: finalUsd,
      descripcion: `${rep.categoria_aporte.toUpperCase()} (${rep.codigo_confirmacion})${
        rep.actividad_o_responsable ? ` — ${rep.actividad_o_responsable}` : ''
      }`,
      fecha: rep.fecha_pago,
      moneda: rep.moneda,
      medio_pago: rep.medio_pago,
      monto_original: rep.monto_original,
      tasa_bcv: finalTasa,
      monto_usd: finalUsd,
      monto_ves: finalVes,
      categoria_aporte: rep.categoria_aporte,
      referencia: rep.referencia,
      banco_emisor: rep.banco_emisor,
      telefono_emisor: rep.telefono_emisor,
      comprobante_url: rep.comprobante_url,
      miembro_id: rep.miembro_id,
      cuenta_receptora_id: rep.cuenta_receptora_id,
      reporte_origen_id: rep.id,
      actividad_o_responsable: rep.actividad_o_responsable,
    });

    if (transaccionId) {
      const txs = JSON.parse(
        localStorage.getItem('cnbv_bank_transactions') || '[]',
      ) as BankTransaction[];
      const txIdx = txs.findIndex((t) => t.id === transaccionId);
      if (txIdx !== -1) {
        txs[txIdx] = { ...txs[txIdx], estado: 'conciliado' };
        localStorage.setItem('cnbv_bank_transactions', JSON.stringify(txs));
      }
    }

    reportes[idx] = {
      ...rep,
      estado: 'aprobado',
      tasa_bcv: finalTasa,
      monto_usd: finalUsd,
      monto_ves: finalVes,
      verificado_por: verifierUserId || 'sim-verifier',
      verificado_at: new Date().toISOString(),
      donacion_id: createdDonation.id,
    };
    localStorage.setItem(REPORTES_STORAGE_KEY, JSON.stringify(reportes));
    return createdDonation.id;
  },

  rechazarReporteAporte: async (
    reporteId: string,
    motivo: string,
    verifierUserId?: string,
  ): Promise<void> => {
    const cleanMotivo = motivo.trim();
    if (!cleanMotivo) {
      throw new Error('Debe indicar un motivo de rechazo.');
    }

    if (!isSimulationMode) {
      const { error } = await supabase.rpc('rechazar_reporte_aporte', {
        p_reporte_id: reporteId,
        p_motivo: cleanMotivo,
      });
      if (error) throw error;
      return;
    }

    const reportes = getStoredReportes();
    const idx = reportes.findIndex((r) => r.id === reporteId);
    if (idx === -1) throw new Error('Reporte de aporte no encontrado');
    if (reportes[idx].estado !== 'pendiente') {
      throw new Error('Este reporte ya fue procesado');
    }

    reportes[idx] = {
      ...reportes[idx],
      estado: 'rechazado',
      motivo_rechazo: cleanMotivo,
      verificado_por: verifierUserId || 'sim-verifier',
      verificado_at: new Date().toISOString(),
    };
    localStorage.setItem(REPORTES_STORAGE_KEY, JSON.stringify(reportes));
  },

  registrarAporteInterno: async (input: InternalAporteInput): Promise<Donation> => {
    const desc =
      input.descripcion?.trim() ||
      `${input.categoria_aporte.toUpperCase()} — Registro Interno${
        input.actividad_o_responsable ? ` (${input.actividad_o_responsable})` : ''
      }`;

    return api.createDonation({
      proyecto_id: null,
      transaccion_id: null,
      donante: input.donante_nombre.trim() || 'Aporte Interno / Culto',
      monto: input.monto_usd,
      descripcion: desc,
      fecha: input.fecha,
      moneda: input.moneda,
      medio_pago: input.medio_pago,
      monto_original: input.monto_original,
      tasa_bcv: input.tasa_bcv,
      monto_usd: input.monto_usd,
      monto_ves: input.monto_ves,
      categoria_aporte: input.categoria_aporte,
      referencia: input.referencia ?? null,
      banco_emisor: input.banco_emisor ?? null,
      telefono_emisor: input.telefono_emisor ?? null,
      comprobante_url: input.comprobante_url ?? null,
      miembro_id: input.miembro_id ?? null,
      cuenta_receptora_id: input.cuenta_receptora_id ?? null,
      actividad_o_responsable: input.actividad_o_responsable ?? null,
    });
  },
};
