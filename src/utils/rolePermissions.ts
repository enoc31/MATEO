export type DefaultCategoriaAporte =
  'diezmo' | 'ofrenda' | 'primicia' | 'misiones' | 'pro_templo' | 'otro';

export type CategoriaAporte = DefaultCategoriaAporte | (string & {});

export interface IncomeCategoryOption {
  value: CategoriaAporte;
  label: string;
}

export const CATEGORIAS_APORTE: IncomeCategoryOption[] = [
  { value: 'diezmo', label: 'Diezmo' },
  { value: 'ofrenda', label: 'Ofrenda' },
  { value: 'primicia', label: 'Primicia' },
  { value: 'misiones', label: 'Misiones' },
  { value: 'pro_templo', label: 'Pro-Templo' },
  { value: 'otro', label: 'Otro' },
];

export function slugifyCategoriaAporte(nombre: string): string {
  const normalized = nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
  return normalized || 'categoria';
}

export const BANCOS_VENEZUELA: string[] = [
  'Banco de Venezuela',
  'Banesco',
  'Banco Mercantil',
  'BBVA Provincial',
  'BNC (Banco Nacional de Crédito)',
  'Bancamiga',
  'Banplus',
  'Banco Exterior',
  'Banco Plaza',
  'Bancaribe',
  'Banco Fondo Común (BFC)',
  '100% Banco',
  'Banco del Tesoro',
  'Banco Bicentenario',
  'Otro Banco / Zelle / Internacional',
];

export const ADMIN_ROLES = ['administrador', 'admin_iglesia'] as const;

export const FINANCE_MANAGE_ROLES = [
  'administrador',
  'admin_iglesia',
  'tesorero',
  'director',
] as const;

export const FINANCE_VIEW_ROLES = [
  'administrador',
  'admin_iglesia',
  'tesorero',
  'pastor',
  'auditor_iglesia',
  'director',
  'auditor',
] as const;

export const EXPENSE_REQUEST_ROLES = [
  'administrador',
  'admin_iglesia',
  'tesorero',
  'pastor',
  'lider_ministerio',
  'coordinador',
  'director',
] as const;

export const EXPENSE_APPROVE_ROLES = [
  'administrador',
  'admin_iglesia',
  'tesorero',
  'pastor',
  'director',
] as const;

export const MEMBER_MANAGE_ROLES = [
  'administrador',
  'admin_iglesia',
  'tesorero',
  'pastor',
  'secretario',
  'director',
  'coordinador',
  'auxiliar_campo',
] as const;

export const MEMBER_FINANCE_VIEW_ROLES = [
  'administrador',
  'admin_iglesia',
  'tesorero',
  'pastor',
  'auditor_iglesia',
  'director',
  'auditor',
] as const;

export interface RoleOption {
  value: string;
  label: string;
  description: string;
}

export const EKKLESIA_ROLE_OPTIONS: RoleOption[] = [
  {
    value: 'admin_iglesia',
    label: 'Administrador de Iglesia',
    description: 'Control total de la iglesia, usuarios, finanzas y configuración',
  },
  {
    value: 'tesorero',
    label: 'Tesorero',
    description: 'Configura cuentas, registra aportes, verifica pagos y aprueba gastos',
  },
  {
    value: 'pastor',
    label: 'Pastor / Consejo Directivo',
    description: 'Consulta finanzas, historial de miembros y aprueba gastos',
  },
  {
    value: 'lider_ministerio',
    label: 'Líder de Ministerio',
    description: 'Solicita presupuestos y rinde comprobantes de su ministerio',
  },
  {
    value: 'auditor_iglesia',
    label: 'Auditor / Contador de Iglesia',
    description: 'Revisión financiera, conciliación y auditoría en solo lectura',
  },
  {
    value: 'secretario',
    label: 'Secretario / Servidor',
    description: 'Registro de miembros y apoyo operativo sin acceso financiero',
  },
];

export const ONG_ROLE_OPTIONS: RoleOption[] = [
  {
    value: 'coordinador',
    label: 'Coordinador',
    description: 'Gestión de proyectos, solicitudes de gasto y campo',
  },
  {
    value: 'director',
    label: 'Director / Ejecutivo',
    description: 'Aprobación de gastos, presupuestos y tablero financiero',
  },
  {
    value: 'auditor',
    label: 'Auditor',
    description: 'Revisión de ingresos, egresos y auditoría de fondos',
  },
  {
    value: 'auxiliar_campo',
    label: 'Auxiliar de Campo',
    description: 'Registro de beneficiarios y jornadas de campo',
  },
  {
    value: 'donante',
    label: 'Donante',
    description: 'Vista de tablero e impacto de donaciones',
  },
  {
    value: 'administrador',
    label: 'Administrador General',
    description: 'Control total de la organización y usuarios',
  },
];

export function getRoleLabel(rol: string, tipoOrganizacion?: 'ong' | 'ekklesia'): string {
  const list = tipoOrganizacion === 'ekklesia' ? EKKLESIA_ROLE_OPTIONS : ONG_ROLE_OPTIONS;
  const match = list.find((item) => item.value === rol);
  if (match) return match.label;
  if (rol === 'administrador') return 'Administrador General';
  if (rol === 'super_admin') return 'Super Administrador';
  return rol.replace(/_/g, ' ');
}

/**
 * Enmascara nombre y apellido para confirmar identidad sin exponer el directorio (HU-6).
 * Ejemplo: ("María", "González") -> "M*** G***"
 */
export function maskPersonName(nombre: string, apellido: string): string {
  const maskToken = (token: string, fallback: string): string => {
    const clean = token.trim();
    if (!clean) return `${fallback}**`;
    const first = clean.charAt(0).toUpperCase();
    const stars = '*'.repeat(Math.min(Math.max(clean.length - 1, 2), 5));
    return `${first}${stars}`;
  };

  return `${maskToken(nombre, 'M')} ${maskToken(apellido, 'I')}`;
}

export function generateConfirmationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 6; i += 1) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `APO-${suffix}`;
}

export function formatCategoriaAporte(
  categoria?: string | null,
  customCategories?: IncomeCategoryOption[],
): string {
  if (!categoria) return 'Ofrenda';
  const customFound = customCategories?.find((c) => c.value === categoria);
  if (customFound) return customFound.label;
  const found = CATEGORIAS_APORTE.find((c) => c.value === categoria);
  if (found) return found.label;
  if (categoria.includes('_')) {
    return categoria
      .split('_')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  return categoria;
}
