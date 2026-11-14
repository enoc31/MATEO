import {
  LayoutDashboard,
  ClipboardList,
  Wallet,
  ArrowRightLeft,
  Scale,
  Search,
  PieChart,
  Camera,
  Users,
  UserCheck,
  CalendarDays,
  Building,
  Tag,
  Package,
  CalendarRange,
  Calculator,
  Landmark,
} from 'lucide-react';

export interface MenuItemConfig {
  id: string;
  label: string;
  iconName: string;
  color: string;
  roles: string[];
  /** Módulo planteado pero aún no disponible: se muestra atenuado y sin navegación. */
  disabled?: boolean;
}

const getOngMenuItems = (): MenuItemConfig[] => [
  {
    id: 'dashboard',
    label: 'Tablero General',
    iconName: 'LayoutDashboard',
    color: '#714B67', // Odoo purple
    roles: ['administrador', 'auditor', 'director', 'donante'],
  },
  {
    id: 'incomes',
    label: 'Donaciones e Ingresos',
    iconName: 'Wallet',
    color: '#10B981', // Emerald
    roles: ['administrador', 'director', 'auditor'],
  },
  {
    id: 'requisitions',
    label: 'Solicitudes de Gasto',
    iconName: 'ClipboardList',
    color: '#3B82F6', // Indigo/Blue
    roles: ['administrador', 'coordinador', 'director'],
  },
  {
    id: 'field-entry',
    label: 'Comprobantes y Gastos',
    iconName: 'Camera',
    color: '#8B5CF6', // Purple/Violet
    roles: ['administrador', 'coordinador', 'director'],
  },
  {
    id: 'beneficiaries',
    label: 'Beneficiarios',
    iconName: 'UserCheck',
    color: '#EC4899', // Pink/Rose
    roles: ['administrador', 'coordinador', 'director', 'auxiliar_campo'],
  },
  {
    id: 'jornadas',
    label: 'Jornadas de Campo',
    iconName: 'CalendarDays',
    color: '#F59E0B', // Orange/Amber
    roles: ['administrador', 'director', 'coordinador'],
  },
  {
    id: 'reconciliation',
    label: 'Conciliación Bancaria',
    iconName: 'Scale',
    color: '#14B8A6', // Teal
    roles: ['administrador'],
  },
  {
    id: 'audit',
    label: 'Auditoría de Fondos',
    iconName: 'Search',
    color: '#06B6D4', // Cyan
    roles: ['administrador', 'auditor'],
  },
  {
    id: 'budgets',
    label: 'Presupuestos y Proyectos',
    iconName: 'PieChart',
    color: '#EF4444', // Red/Rose
    roles: ['administrador', 'auditor', 'director'],
  },
  {
    id: 'tasas',
    label: 'Tasas BCV',
    iconName: 'ArrowRightLeft',
    color: '#64748B', // Slate/Grey
    roles: ['administrador', 'director'],
  },
  {
    id: 'catalog',
    label: 'Catálogo de Partidas',
    iconName: 'Tag',
    color: '#059669', // Emerald green
    roles: ['administrador', 'director'],
  },
  {
    id: 'users',
    label: 'Gestión de Usuarios',
    iconName: 'Users',
    color: '#1E3A8A', // Navy/Blue
    roles: ['administrador'],
  },
  {
    id: 'organization',
    label: 'Perfil de la Organización',
    iconName: 'Building',
    color: '#2563EB', // Royal Blue
    roles: ['administrador', 'director', 'coordinador', 'auditor', 'donante', 'auxiliar_campo'],
  },
];

/**
 * Menú de Mateo Ekklesia. Agrupa los módulos heredados de la ONG según lo acordado:
 * - Ingresos y Gastos: diezmos y ofrendas + solicitudes de gasto + comprobantes.
 * - Contabilidad: conciliación bancaria + estados financieros.
 * - Presupuesto: por ministerio, con el catálogo dentro.
 */
const getEkklesiaMenuItems = (): MenuItemConfig[] => [
  {
    id: 'dashboard',
    label: 'Tablero General',
    iconName: 'LayoutDashboard',
    color: '#714B67',
    roles: ['administrador', 'auditor', 'director', 'donante'],
  },
  {
    id: 'organization',
    label: 'Perfil de la Iglesia',
    iconName: 'Building',
    color: '#2563EB',
    roles: ['administrador', 'director', 'coordinador', 'auditor', 'donante', 'auxiliar_campo'],
  },
  {
    id: 'beneficiaries',
    label: 'Miembros y Comunidad',
    iconName: 'UserCheck',
    color: '#EC4899',
    roles: ['administrador', 'coordinador', 'director', 'auxiliar_campo'],
  },
  {
    id: 'jornadas',
    label: 'Estructura y Ministerios',
    iconName: 'CalendarDays',
    color: '#F59E0B',
    roles: ['administrador', 'director', 'coordinador'],
    disabled: true,
  },
  {
    id: 'finance',
    label: 'Ingresos y Gastos',
    iconName: 'Wallet',
    color: '#10B981',
    roles: ['administrador', 'coordinador', 'director', 'auditor'],
  },
  {
    id: 'budgets',
    label: 'Presupuesto',
    iconName: 'PieChart',
    color: '#EF4444',
    roles: ['administrador', 'auditor', 'director'],
    disabled: true,
  },
  {
    id: 'accounting',
    label: 'Contabilidad',
    iconName: 'Calculator',
    color: '#06B6D4',
    roles: ['administrador', 'auditor'],
  },
  {
    id: 'inventory',
    label: 'Inventario',
    iconName: 'Package',
    color: '#8B5CF6',
    roles: ['administrador', 'director', 'coordinador'],
    disabled: true,
  },
  {
    id: 'calendar',
    label: 'Calendario',
    iconName: 'CalendarRange',
    color: '#0EA5E9',
    roles: ['administrador', 'director', 'coordinador', 'auxiliar_campo'],
    disabled: true,
  },
  {
    id: 'tasas',
    label: 'Tasas BCV',
    iconName: 'ArrowRightLeft',
    color: '#64748B',
    roles: ['administrador', 'director'],
  },
  {
    id: 'users',
    label: 'Gestión de Usuarios',
    iconName: 'Users',
    color: '#1E3A8A',
    roles: ['administrador'],
  },
];

export const getMenuItems = (tipoOrganizacion?: 'ong' | 'ekklesia'): MenuItemConfig[] =>
  tipoOrganizacion === 'ekklesia' ? getEkklesiaMenuItems() : getOngMenuItems();
export const menuItems: MenuItemConfig[] = getMenuItems('ong');

export const getMenuIcon = (name: string, size = 20) => {
  const props = { size, strokeWidth: 1.5 };
  switch (name) {
    case 'LayoutDashboard':
      return <LayoutDashboard {...props} />;
    case 'ClipboardList':
      return <ClipboardList {...props} />;
    case 'Wallet':
      return <Wallet {...props} />;
    case 'ArrowRightLeft':
      return <ArrowRightLeft {...props} />;
    case 'Scale':
      return <Scale {...props} />;
    case 'Search':
      return <Search {...props} />;
    case 'PieChart':
      return <PieChart {...props} />;
    case 'Camera':
      return <Camera {...props} />;
    case 'Users':
      return <Users {...props} />;
    case 'UserCheck':
      return <UserCheck {...props} />;
    case 'CalendarDays':
      return <CalendarDays {...props} />;
    case 'Building':
      return <Building {...props} />;
    case 'Tag':
      return <Tag {...props} />;
    case 'Package':
      return <Package {...props} />;
    case 'CalendarRange':
      return <CalendarRange {...props} />;
    case 'Calculator':
      return <Calculator {...props} />;
    case 'Landmark':
      return <Landmark {...props} />;
    default:
      return null;
  }
};
