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
} from 'lucide-react';

export interface MenuItemConfig {
  id: string;
  label: string;
  iconName: string;
  color: string;
  roles: string[];
}

export const menuItems: MenuItemConfig[] = [
  {
    id: 'dashboard',
    label: 'Tableros',
    iconName: 'LayoutDashboard',
    color: '#714B67', // Odoo purple
    roles: ['administrador', 'auditor', 'director', 'donante'],
  },
  {
    id: 'incomes',
    label: 'Ingresos',
    iconName: 'Wallet',
    color: '#10B981', // Emerald
    roles: ['administrador', 'director', 'auditor'],
  },
  {
    id: 'requisitions',
    label: 'Requisiciones',
    iconName: 'ClipboardList',
    color: '#3B82F6', // Indigo/Blue
    roles: ['administrador', 'coordinador', 'director'],
  },
  {
    id: 'field-entry',
    label: 'Cargar Gastos',
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
    label: 'Jornadas',
    iconName: 'CalendarDays',
    color: '#F59E0B', // Orange/Amber
    roles: ['administrador', 'director', 'coordinador'],
  },
  {
    id: 'reconciliation',
    label: 'Conciliación',
    iconName: 'Scale',
    color: '#14B8A6', // Teal
    roles: ['administrador'],
  },
  {
    id: 'audit',
    label: 'Auditoría',
    iconName: 'Search',
    color: '#06B6D4', // Cyan
    roles: ['administrador', 'auditor'],
  },
  {
    id: 'budgets',
    label: 'Presupuestos',
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
    id: 'users',
    label: 'Usuarios',
    iconName: 'Users',
    color: '#1E3A8A', // Navy/Blue
    roles: ['administrador'],
  },
];

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
    default:
      return null;
  }
};
