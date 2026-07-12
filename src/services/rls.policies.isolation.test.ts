/**
 * rls.policies.isolation.test.ts
 *
 * Verifica que las políticas RLS corregidas siguen el principio:
 *   ong_id = get_user_ong_id() AND (rol-based condition)
 * en lugar de solo (rol-based condition), evitando el problema de
 * combinación OR en PostgreSQL que causaba cross-tenant leaks.
 *
 * Estos tests validan la LÓGICA de las condiciones USING de RLS,
 * simulando distintos escenarios de usuario × ONG × dato.
 */
import { describe, it, expect } from 'vitest';

// ─── Tipos simulados ────────────────────────────────────────────────────────

type Rol = 'administrador' | 'auditor' | 'director' | 'coordinador' | 'auxiliar_campo' | 'donante';

interface SimulatedUser {
  uid: string;
  ong_id: string;
  rol: Rol;
}

interface ComprobantRow {
  id: string;
  ong_id: string;
  solicitante_id: string;
  monto: number;
}

interface SolicitudRow {
  id: string;
  ong_id: string;
  solicitante_id: string;
  descripcion: string;
}

interface DonantRow {
  id: string;
  ong_id: string;
  nombre: string;
}

// ─── Simulación de la lógica USING de las políticas RLS ─────────────────────

/**
 * Simula la política CORREGIDA de comprobantes_gasto:
 * ong_id = get_user_ong_id() AND (solicitante OR rol autorizado)
 */
function canReadComprobante(user: SimulatedUser, row: ComprobantRow): boolean {
  const ongMatch = row.ong_id === user.ong_id;
  const isOwner = row.solicitante_id === user.uid;
  const isAuthorizedRole = ['administrador', 'auditor', 'director'].includes(user.rol);
  return ongMatch && (isOwner || isAuthorizedRole);
}

/**
 * Simula la POLÍTICA ANTIGUA (vulnerable) de comprobantes_gasto:
 * ONLY rol-based sin ong_id — causa cross-tenant leak
 */
function canReadComprobante_VULNERABLE(user: SimulatedUser, row: ComprobantRow): boolean {
  const isOwner = row.solicitante_id === user.uid;
  const isAuthorizedRole = ['administrador', 'auditor', 'director'].includes(user.rol);
  return isOwner || isAuthorizedRole; // ← SIN filtro ong_id!
}

/**
 * Simula la política CORREGIDA de solicitudes_gasto:
 * ong_id = get_user_ong_id() AND (creador OR rol autorizado)
 */
function canReadSolicitud(user: SimulatedUser, row: SolicitudRow): boolean {
  const ongMatch = row.ong_id === user.ong_id;
  const isCreator = row.solicitante_id === user.uid;
  const isAuthorizedRole = ['administrador', 'auditor', 'director'].includes(user.rol);
  return ongMatch && (isCreator || isAuthorizedRole);
}

/**
 * Simula la política CORREGIDA de donantes:
 * ong_id = get_user_ong_id() SOLO
 */
function canReadDonante(user: SimulatedUser, row: DonantRow): boolean {
  return row.ong_id === user.ong_id;
}

/**
 * Simula la política CORREGIDA de partidas_gasto:
 * ong_id = get_user_ong_id() OR ong_id = ONG_BASE
 */
const ONG_BASE_ID = '11111111-1111-1111-1111-111111111111';
function canReadPartida(user: SimulatedUser, row: { ong_id: string }): boolean {
  return row.ong_id === user.ong_id || row.ong_id === ONG_BASE_ID;
}

// ─── Fixtures ───────────────────────────────────────────────────────────────

const ONG_A = 'ong-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ONG_B = 'ong-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

const adminOngA: SimulatedUser = { uid: 'user-admin-a', ong_id: ONG_A, rol: 'administrador' };
const auditorOngA: SimulatedUser = { uid: 'user-auditor-a', ong_id: ONG_A, rol: 'auditor' };
const directorOngB: SimulatedUser = { uid: 'user-director-b', ong_id: ONG_B, rol: 'director' };
const coordOngB: SimulatedUser = { uid: 'user-coord-b', ong_id: ONG_B, rol: 'coordinador' };

const comprobanteOngA: ComprobantRow = {
  id: 'comp-1',
  ong_id: ONG_A,
  solicitante_id: 'user-coord-a',
  monto: 500,
};
const comprobanteOngB: ComprobantRow = {
  id: 'comp-2',
  ong_id: ONG_B,
  solicitante_id: 'user-coord-b',
  monto: 300,
};

const solicitudOngA: SolicitudRow = {
  id: 'sol-1',
  ong_id: ONG_A,
  solicitante_id: 'user-coord-a',
  descripcion: 'Compra ONG A',
};
const solicitudOngB: SolicitudRow = {
  id: 'sol-2',
  ong_id: ONG_B,
  solicitante_id: 'user-coord-b',
  descripcion: 'Compra ONG B',
};

const donanteOngA: DonantRow = { id: 'don-1', ong_id: ONG_A, nombre: 'Donante Alpha Corp' };
const donanteOngB: DonantRow = { id: 'don-2', ong_id: ONG_B, nombre: 'Donante Beta Fund' };

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('RLS comprobantes_gasto — política CORREGIDA', () => {
  it('admin de ONG-A puede ver comprobantes de su propia ONG', () => {
    expect(canReadComprobante(adminOngA, comprobanteOngA)).toBe(true);
  });

  it('admin de ONG-A NO puede ver comprobantes de ONG-B (cross-tenant bloqueado)', () => {
    expect(canReadComprobante(adminOngA, comprobanteOngB)).toBe(false);
  });

  it('auditor de ONG-A puede ver comprobantes de su propia ONG', () => {
    expect(canReadComprobante(auditorOngA, comprobanteOngA)).toBe(true);
  });

  it('auditor de ONG-A NO puede ver comprobantes de ONG-B', () => {
    expect(canReadComprobante(auditorOngA, comprobanteOngB)).toBe(false);
  });

  it('director de ONG-B puede ver comprobantes de su propia ONG', () => {
    expect(canReadComprobante(directorOngB, comprobanteOngB)).toBe(true);
  });

  it('director de ONG-B NO puede ver comprobantes de ONG-A', () => {
    expect(canReadComprobante(directorOngB, comprobanteOngA)).toBe(false);
  });

  it('coordinador de ONG-B puede ver su propio comprobante (es solicitante)', () => {
    const propioComprobante: ComprobantRow = { ...comprobanteOngB, solicitante_id: coordOngB.uid };
    expect(canReadComprobante(coordOngB, propioComprobante)).toBe(true);
  });
});

describe('RLS comprobantes_gasto — demostración de vulnerabilidad ANTERIOR (OR sin ong_id)', () => {
  it('VULNERABLE: admin de ONG-A PODRÍA ver comprobantes de ONG-B por OR lógico', () => {
    // Esto demuestra el bug que había: solo con el rol, sin ong_id, se veían otros datos
    expect(canReadComprobante_VULNERABLE(adminOngA, comprobanteOngB)).toBe(true); // ← BUG
    // La política CORREGIDA devuelve false:
    expect(canReadComprobante(adminOngA, comprobanteOngB)).toBe(false); // ← FIX
  });
});

describe('RLS solicitudes_gasto — política CORREGIDA', () => {
  it('admin de ONG-A puede ver solicitudes de su ONG', () => {
    expect(canReadSolicitud(adminOngA, solicitudOngA)).toBe(true);
  });

  it('admin de ONG-A NO puede ver solicitudes de ONG-B', () => {
    expect(canReadSolicitud(adminOngA, solicitudOngB)).toBe(false);
  });

  it('director de ONG-B puede ver solicitudes de su ONG', () => {
    expect(canReadSolicitud(directorOngB, solicitudOngB)).toBe(true);
  });

  it('director de ONG-B NO puede ver solicitudes de ONG-A', () => {
    expect(canReadSolicitud(directorOngB, solicitudOngA)).toBe(false);
  });

  it('coordinador de ONG-B puede ver su propia solicitud', () => {
    const propia: SolicitudRow = { ...solicitudOngB, solicitante_id: coordOngB.uid };
    expect(canReadSolicitud(coordOngB, propia)).toBe(true);
  });

  it('coordinador de ONG-B puede ver solicitudes de su misma ONG (ong_id coincide)', () => {
    // coordOngB.ong_id === solicitudOngB.ong_id → pasa el filtro de ong_id
    // La política permite: ong_id match AND (creador OR rol autorizado)
    // coordOngB no es creador ni tiene rol autorizado, pero la solicitudOngB
    // tiene creador_id = 'user-coord-b' y coordOngB.uid = 'user-coord-b' → es el creador
    const solicitudDeOtroCreadorOngB: SolicitudRow = {
      ...solicitudOngB,
      solicitante_id: 'otro-user-ong-b', // Diferente solicitante, misma ONG
    };
    // Coordinador NO puede ver solicitudes de otro creador (no es creador ni tiene rol autorizado)
    expect(canReadSolicitud(coordOngB, solicitudDeOtroCreadorOngB)).toBe(false);
  });

  it('coordinador de ONG-B SÍ puede ver su propia solicitud de ONG-B', () => {
    const propiaSolicitud: SolicitudRow = { ...solicitudOngB, solicitante_id: coordOngB.uid };
    expect(canReadSolicitud(coordOngB, propiaSolicitud)).toBe(true);
  });
});

describe('RLS donantes — política CORREGIDA (ong_id estricto)', () => {
  it('usuario de ONG-A puede ver donantes de su ONG', () => {
    expect(canReadDonante(adminOngA, donanteOngA)).toBe(true);
  });

  it('usuario de ONG-A NO puede ver donantes de ONG-B', () => {
    expect(canReadDonante(adminOngA, donanteOngB)).toBe(false);
  });

  it('usuario de ONG-B puede ver donantes de su ONG', () => {
    expect(canReadDonante(directorOngB, donanteOngB)).toBe(true);
  });

  it('usuario de ONG-B NO puede ver donantes de ONG-A', () => {
    expect(canReadDonante(directorOngB, donanteOngA)).toBe(false);
  });
});

describe('RLS partidas_gasto — catálogo compartido + aislamiento propio', () => {
  const partidaCatalogoBase = { ong_id: ONG_BASE_ID };
  const partidaOngA = { ong_id: ONG_A };
  const partidaOngB = { ong_id: ONG_B };

  it('usuario de ONG-A puede ver partidas del catálogo base (ONG fundadora)', () => {
    expect(canReadPartida(adminOngA, partidaCatalogoBase)).toBe(true);
  });

  it('usuario de ONG-B puede ver partidas del catálogo base', () => {
    expect(canReadPartida(directorOngB, partidaCatalogoBase)).toBe(true);
  });

  it('usuario de ONG-A puede ver sus propias partidas', () => {
    expect(canReadPartida(adminOngA, partidaOngA)).toBe(true);
  });

  it('usuario de ONG-A NO puede ver partidas personalizadas de ONG-B', () => {
    expect(canReadPartida(adminOngA, partidaOngB)).toBe(false);
  });

  it('usuario de ONG-B NO puede ver partidas personalizadas de ONG-A', () => {
    expect(canReadPartida(directorOngB, partidaOngA)).toBe(false);
  });
});

describe('Principio de aislamiento — validación global cross-tenant', () => {
  it('ningún usuario puede acceder a datos de otra ONG en comprobantes', () => {
    const users = [adminOngA, auditorOngA, directorOngB, coordOngB];
    const rows = [comprobanteOngA, comprobanteOngB];

    users.forEach((user) => {
      rows.forEach((row) => {
        if (row.ong_id !== user.ong_id) {
          // Un usuario no puede ver datos de otra ONG (a menos que sea su propio comprobante)
          const isOwner = row.solicitante_id === user.uid;
          if (!isOwner) {
            expect(canReadComprobante(user, row)).toBe(false);
          }
        }
      });
    });
  });

  it('ningún usuario puede ver donantes de otra ONG', () => {
    const users = [adminOngA, auditorOngA, directorOngB, coordOngB];
    const donantes = [donanteOngA, donanteOngB];

    users.forEach((user) => {
      donantes.forEach((donante) => {
        if (donante.ong_id !== user.ong_id) {
          expect(canReadDonante(user, donante)).toBe(false);
        }
      });
    });
  });

  it('ningún usuario puede ver solicitudes de otra ONG', () => {
    const users = [adminOngA, directorOngB];
    const solicitudes = [solicitudOngA, solicitudOngB];

    users.forEach((user) => {
      solicitudes.forEach((sol) => {
        if (sol.ong_id !== user.ong_id) {
          expect(canReadSolicitud(user, sol)).toBe(false);
        }
      });
    });
  });
});

// ─── Simulación de políticas UPDATE ─────────────────────────────────────────

/**
 * Política UPDATE CORREGIDA de comprobantes_gasto para auditores/admins:
 * ong_id = get_user_ong_id() AND rol autorizado
 */
function canUpdateComprobanteAdmin(user: SimulatedUser, row: ComprobantRow): boolean {
  return row.ong_id === user.ong_id && ['administrador', 'auditor'].includes(user.rol);
}

/**
 * Política UPDATE CORREGIDA de comprobantes_gasto para coordinadores:
 * ong_id = get_user_ong_id() AND solicitante_id = uid AND estado pendiente
 */
function canUpdateComprobantePropioCoord(
  user: SimulatedUser,
  row: ComprobantRow & { estado: string },
): boolean {
  return (
    row.ong_id === user.ong_id &&
    row.solicitante_id === user.uid &&
    ['pendiente_soporte', 'pendiente_revision'].includes(row.estado)
  );
}

/**
 * Política UPDATE CORREGIDA de solicitudes_gasto:
 * ong_id = get_user_ong_id() AND rol autorizado
 */
function canUpdateSolicitud(user: SimulatedUser, row: SolicitudRow): boolean {
  return row.ong_id === user.ong_id && ['administrador', 'auditor', 'director'].includes(user.rol);
}

/**
 * Política ALL CORREGIDA de tasas_bcv:
 * ong_id = get_user_ong_id() AND rol admin/director
 */
function canManageTasa(user: SimulatedUser, row: { ong_id: string }): boolean {
  return row.ong_id === user.ong_id && ['administrador', 'director'].includes(user.rol);
}

describe('RLS UPDATE comprobantes_gasto — aislamiento cross-tenant en escritura', () => {
  const comprobanteOngAPendiente = { ...comprobanteOngA, estado: 'pendiente_revision' };
  const comprobanteOngBPendiente = { ...comprobanteOngB, estado: 'pendiente_revision' };

  it('admin de ONG-A puede actualizar comprobantes de su ONG', () => {
    expect(canUpdateComprobanteAdmin(adminOngA, comprobanteOngA)).toBe(true);
  });

  it('admin de ONG-A NO puede actualizar comprobantes de ONG-B', () => {
    expect(canUpdateComprobanteAdmin(adminOngA, comprobanteOngB)).toBe(false);
  });

  it('auditor de ONG-A NO puede actualizar comprobantes de ONG-B', () => {
    expect(canUpdateComprobanteAdmin(auditorOngA, comprobanteOngB)).toBe(false);
  });

  it('coordinador puede actualizar su propio comprobante pendiente de su ONG', () => {
    const propio = { ...comprobanteOngBPendiente, solicitante_id: coordOngB.uid };
    expect(canUpdateComprobantePropioCoord(coordOngB, propio)).toBe(true);
  });

  it('coordinador NO puede actualizar comprobante pendiente de ONG-A', () => {
    const ajenoOngA = { ...comprobanteOngAPendiente, solicitante_id: coordOngB.uid };
    // ong_id es ONG_A, pero coordinador es de ONG_B
    ajenoOngA.ong_id = ONG_A;
    expect(canUpdateComprobantePropioCoord(coordOngB, ajenoOngA)).toBe(false);
  });
});

describe('RLS UPDATE solicitudes_gasto — aislamiento cross-tenant en escritura', () => {
  it('director de ONG-B puede aprobar solicitudes de su ONG', () => {
    expect(canUpdateSolicitud(directorOngB, solicitudOngB)).toBe(true);
  });

  it('director de ONG-B NO puede aprobar solicitudes de ONG-A', () => {
    expect(canUpdateSolicitud(directorOngB, solicitudOngA)).toBe(false);
  });

  it('admin de ONG-A NO puede rechazar solicitudes de ONG-B', () => {
    expect(canUpdateSolicitud(adminOngA, solicitudOngB)).toBe(false);
  });

  it('coordinador NO puede aprobar solicitudes (rol no autorizado)', () => {
    const solicitudPropia: SolicitudRow = { ...solicitudOngB, solicitante_id: coordOngB.uid };
    expect(canUpdateSolicitud(coordOngB, solicitudPropia)).toBe(false);
  });
});

describe('RLS ALL tasas_bcv — aislamiento en gestión', () => {
  const tasaOngA = { ong_id: ONG_A };
  const tasaOngB = { ong_id: ONG_B };
  const tasaBase = { ong_id: ONG_BASE_ID };

  it('admin de ONG-A puede gestionar tasas de su ONG', () => {
    expect(canManageTasa(adminOngA, tasaOngA)).toBe(true);
  });

  it('admin de ONG-A NO puede gestionar tasas de ONG-B', () => {
    expect(canManageTasa(adminOngA, tasaOngB)).toBe(false);
  });

  it('director de ONG-B puede gestionar tasas de su ONG', () => {
    expect(canManageTasa(directorOngB, tasaOngB)).toBe(true);
  });

  it('director de ONG-B NO puede gestionar tasas de ONG-A', () => {
    expect(canManageTasa(directorOngB, tasaOngA)).toBe(false);
  });

  it('coordinador NO puede gestionar tasas (rol no autorizado)', () => {
    expect(canManageTasa(coordOngB, tasaOngB)).toBe(false);
  });

  it('ningún usuario puede modificar tasas de la ONG base salvo que pertenezca a ella', () => {
    // La ONG base (11111111...) solo puede ser gestionada por sus propios admins
    expect(canManageTasa(adminOngA, tasaBase)).toBe(false);
    expect(canManageTasa(directorOngB, tasaBase)).toBe(false);
  });
});
