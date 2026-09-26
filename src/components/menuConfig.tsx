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
} from 'lucide-react';

export interface MenuItemConfig {
  id: string;
  label: string;
  iconName: string;
  color: string;
  roles: string[];
}

export const getMenuItems = (tipoOrganizacion?: 'ong' | 'ekklesia'): MenuItemConfig[] => {
  const isEkklesia = tipoOrganizacion === 'ekklesia';

  return [
    {
      id: 'dashboard',
      label: 'Tablero General',
      iconName: 'LayoutDashboard',
      color: '#714B67', // Odoo purple
      roles: ['administrador', 'auditor', 'director', 'donante'],
    },
    {
      id: 'incomes',
      label: isEkklesia ? 'Diezmos y Ofrendas' : 'Donaciones e Ingresos',
      iconName: 'Wallet',
      color: '#10B981', // Emerald
      roles: ['administrador', 'director', 'auditor'],
    },
    {
      id: 'requisitions',
      label: isEkklesia ? 'Solicitudes Ministeriales' : 'Solicitudes de Gasto',
      iconName: 'ClipboardList',
      color: '#3B82F6', // Indigo/Blue
      roles: ['administrador', 'coordinador', 'director'],
    },
    {
      id: 'field-entry',
      label: isEkklesia ? 'Comprobantes y Gastos' : 'Comprobantes y Gastos',
      iconName: 'Camera',
      color: '#8B5CF6', // Purple/Violet
      roles: ['administrador', 'coordinador', 'director'],
    },
    {
      id: 'beneficiaries',
      label: isEkklesia ? 'Relación de Miembros' : 'Beneficiarios',
      iconName: 'UserCheck',
      color: '#EC4899', // Pink/Rose
      roles: ['administrador', 'coordinador', 'director', 'auxiliar_campo'],
    },
    {
      id: 'jornadas',
      label: isEkklesia ? 'Estructura y Ministerios' : 'Jornadas de Campo',
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
      label: isEkklesia ? 'Estados Financieros (EEFF)' : 'Auditoría de Fondos',
      iconName: 'Search',
      color: '#06B6D4', // Cyan
      roles: ['administrador', 'auditor'],
    },
    {
      id: 'budgets',
      label: isEkklesia ? 'Presupuesto de Obra' : 'Presupuestos y Proyectos',
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
      label: isEkklesia ? 'Catálogo Ministerial' : 'Catálogo de Partidas',
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
      label: isEkklesia ? 'Perfil de la Iglesia' : 'Perfil de la Organización',
      iconName: 'Building',
      color: '#2563EB', // Royal Blue
      roles: ['administrador', 'director', 'coordinador', 'auditor', 'donante', 'auxiliar_campo'],
    },
  ];
};

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
    default:
      return null;
  }
};
