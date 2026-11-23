'use client';

import { lazy, Suspense, type ComponentType } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { LayoutContent } from '../../../components/Layout';
import { SkeletonPageLoader } from '../../../components/SkeletonPageLoader';
import { AccessDenied } from '../../../App';
import { ModuleHub } from '../../../components/ModuleHub';
import { BudgetWizard } from '../../../features/budgets/BudgetWizard';
import WorkspaceGuard from '../workspace-guard';
import type { MigratedSection } from './sections';

function Accounting() {
  const { profile } = useAuth();
  return (
    <ModuleHub
      nativeLinks
      title="Contabilidad"
      description="Conciliación bancaria y estados financieros de la iglesia."
      statusNote="Módulo en consolidación: hoy reúne las pantallas existentes."
      userRole={profile?.rol}
      links={[
        {
          to: '/app/reconciliation',
          label: 'Conciliación Bancaria',
          description: 'Conciliar movimientos con el estado de cuenta.',
          roles: ['administrador', 'admin_iglesia', 'tesorero', 'auditor_iglesia'],
        },
        {
          to: '/app/audit',
          label: 'Estados Financieros (EEFF)',
          description: 'Informes y estados financieros.',
          roles: ['administrador', 'admin_iglesia', 'tesorero', 'auditor_iglesia', 'auditor'],
        },
      ]}
    />
  );
}

function Wizard({ navigate }: { navigate: (path: string | number) => void }) {
  return (
    <BudgetWizard
      isOpen
      onClose={() => navigate(-1)}
      onSuccess={() => {
        alert('Presupuesto guardado exitosamente.');
        navigate(-1);
      }}
    />
  );
}

const modules: Record<
  MigratedSection,
  {
    roles: readonly string[];
    component: ComponentType<{ navigate: (path: string | number) => void; search: string }>;
  }
> = {
  'create-project': {
    roles: ['administrador', 'admin_iglesia', 'director'],
    component: lazy(() =>
      import('../../../features/budgets/CreateProjectPage').then((m) => ({
        default: m.CreateProjectPageContent,
      })),
    ),
  },
  'budget-wizard': {
    roles: [
      'administrador',
      'admin_iglesia',
      'tesorero',
      'pastor',
      'lider_ministerio',
      'auditor_iglesia',
      'secretario',
      'director',
      'coordinador',
      'auditor',
      'donante',
      'auxiliar_campo',
    ],
    component: Wizard,
  },
  accounting: {
    roles: ['administrador', 'admin_iglesia', 'tesorero', 'auditor_iglesia', 'auditor'],
    component: Accounting,
  },
  'audit-detail': {
    roles: [
      'administrador',
      'admin_iglesia',
      'tesorero',
      'pastor',
      'lider_ministerio',
      'auditor_iglesia',
      'secretario',
      'director',
      'coordinador',
      'auditor',
      'donante',
      'auxiliar_campo',
    ],
    component: lazy(() =>
      import('../../../features/audit/AuditDetail').then((m) => ({
        default: m.AuditDetailContent,
      })),
    ),
  },
  'nuevo-ingreso': {
    roles: [
      'administrador',
      'admin_iglesia',
      'tesorero',
      'pastor',
      'lider_ministerio',
      'auditor_iglesia',
      'secretario',
      'director',
      'coordinador',
      'auditor',
      'donante',
      'auxiliar_campo',
    ],
    component: lazy(() =>
      import('../../../features/incomes/IncomeRegistrationForm').then((m) => ({
        default: m.IncomeRegistrationFormContent,
      })),
    ),
  },
  'registrar-aporte': {
    roles: ['administrador', 'admin_iglesia', 'tesorero', 'director'],
    component: lazy(() =>
      import('../../../features/finance/InternalIncomePage').then((m) => ({
        default: m.InternalIncomePageContent,
      })),
    ),
  },
  'importar-extracto': {
    roles: [
      'administrador',
      'admin_iglesia',
      'tesorero',
      'pastor',
      'lider_ministerio',
      'auditor_iglesia',
      'secretario',
      'director',
      'coordinador',
      'auditor',
      'donante',
      'auxiliar_campo',
    ],
    component: lazy(() =>
      import('../../../features/incomes/ImportBankStatement').then((m) => ({
        default: m.ImportBankStatementContent,
      })),
    ),
  },
  audit: {
    roles: ['administrador', 'admin_iglesia', 'tesorero', 'auditor_iglesia', 'auditor'],
    component: lazy(() =>
      import('../../../features/audit/Audit').then((m) => ({ default: m.AuditContent })),
    ),
  },
  incomes: {
    roles: [
      'administrador',
      'admin_iglesia',
      'tesorero',
      'pastor',
      'auditor_iglesia',
      'director',
      'auditor',
    ],
    component: lazy(() =>
      import('../../../features/incomes/IncomesManager').then((m) => ({
        default: m.IncomesManagerContent,
      })),
    ),
  },
  budgets: {
    roles: [
      'administrador',
      'admin_iglesia',
      'tesorero',
      'pastor',
      'auditor_iglesia',
      'auditor',
      'director',
    ],
    component: lazy(() =>
      import('../../../features/budgets/BudgetsAndReports').then((m) => ({
        default: m.BudgetsAndReportsContent,
      })),
    ),
  },
  finance: {
    roles: [
      'administrador',
      'admin_iglesia',
      'tesorero',
      'pastor',
      'auditor_iglesia',
      'lider_ministerio',
      'coordinador',
      'director',
      'auditor',
    ],
    component: lazy(() =>
      import('../../../features/finance/FinanceHub').then((m) => ({
        default: m.FinanceHubContent,
      })),
    ),
  },
  reconciliation: {
    roles: ['administrador', 'admin_iglesia', 'tesorero', 'auditor_iglesia'],
    component: lazy(() =>
      import('../../../features/reconciliation/Reconciliation').then((m) => ({
        default: m.Reconciliation,
      })),
    ),
  },
  'field-entry': {
    roles: [
      'administrador',
      'admin_iglesia',
      'tesorero',
      'pastor',
      'lider_ministerio',
      'coordinador',
      'director',
    ],
    component: lazy(() =>
      import('../../../features/mobile-entry/MobileEntry').then((m) => ({
        default: m.MobileEntry,
      })),
    ),
  },
  miembros: {
    roles: [
      'administrador',
      'admin_iglesia',
      'tesorero',
      'pastor',
      'secretario',
      'director',
      'auxiliar_campo',
      'coordinador',
    ],
    component: lazy(() =>
      import('../../../features/beneficiaries/BeneficiaryRegistry').then((m) => ({
        default: m.BeneficiaryRegistry,
      })),
    ),
  },
  jornadas: {
    roles: ['administrador', 'admin_iglesia', 'pastor', 'director', 'coordinador'],
    component: lazy(() =>
      import('../../../features/beneficiaries/JornadasManager').then((m) => ({
        default: m.JornadasManager,
      })),
    ),
  },
  requisitions: {
    roles: [
      'administrador',
      'admin_iglesia',
      'tesorero',
      'pastor',
      'lider_ministerio',
      'coordinador',
      'director',
    ],
    component: lazy(() =>
      import('../../../features/requisitions/RequisitionsManager').then((m) => ({
        default: m.RequisitionsManager,
      })),
    ),
  },
  users: {
    roles: ['administrador', 'admin_iglesia'],
    component: lazy(() =>
      import('../../../features/users/UserManagement').then((m) => ({ default: m.UserManagement })),
    ),
  },
  tasas: {
    roles: ['administrador', 'admin_iglesia', 'tesorero', 'director'],
    component: lazy(() =>
      import('../../../features/tasas/TasasManager').then((m) => ({ default: m.TasasManager })),
    ),
  },
  catalog: {
    roles: ['administrador', 'admin_iglesia', 'director'],
    component: lazy(() =>
      import('../../../features/budgets/CustomCatalogManager').then((m) => ({
        default: m.CustomCatalogManager,
      })),
    ),
  },
  organization: {
    roles: [
      'administrador',
      'admin_iglesia',
      'tesorero',
      'pastor',
      'lider_ministerio',
      'auditor_iglesia',
      'secretario',
      'director',
      'coordinador',
      'auditor',
      'donante',
      'auxiliar_campo',
    ],
    component: lazy(() =>
      import('../../../features/organization/OrganizationProfile').then((m) => ({
        default: m.OrganizationProfile,
      })),
    ),
  },
};

function Module({ section }: { section: MigratedSection }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const navigate = (path: string | number) =>
    typeof path === 'number' ? window.history.go(path) : router.push(path);
  const { profile } = useAuth();
  const { component: Component, roles } = modules[section];
  return (
    <LayoutContent pathname={`/app/${section}`} navigate={navigate} nativeLinks>
      <Suspense fallback={<SkeletonPageLoader />}>
        {profile && roles.includes(profile.rol) ? (
          <Component navigate={navigate} search={search ? `?${search}` : ''} />
        ) : (
          <AccessDenied />
        )}
      </Suspense>
    </LayoutContent>
  );
}

export default function ModuleClient({ section }: { section: MigratedSection }) {
  return (
    <WorkspaceGuard>
      <Module section={section} />
    </WorkspaceGuard>
  );
}
