export const migratedSections = [
  'reconciliation',
  'field-entry',
  'miembros',
  'jornadas',
  'requisitions',
  'users',
  'tasas',
  'catalog',
  'organization',
  'audit',
  'incomes',
  'budgets',
  'finance',
  'expenses',
  'audit-detail',
  'nuevo-ingreso',
  'registrar-aporte',
  'arqueo-efectivo',
  'importar-extracto',
  'create-project',
  'budget-wizard',
  'accounting',
] as const;

export type MigratedSection = (typeof migratedSections)[number];

export function isMigratedSection(section: string): section is MigratedSection {
  return (migratedSections as readonly string[]).includes(section);
}
