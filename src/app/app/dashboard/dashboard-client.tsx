'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { LayoutContent } from '../../../components/Layout';
import { DashboardContent as Dashboard } from '../../../features/dashboard/Dashboard';
import { AccessDenied } from '../../../App';
import WorkspaceGuard from '../workspace-guard';

const roles = [
  'administrador',
  'admin_iglesia',
  'tesorero',
  'pastor',
  'auditor_iglesia',
  'auditor',
  'director',
  'donante',
];

function DashboardContent() {
  const router = useRouter();
  const { profile } = useAuth();
  return (
    <LayoutContent pathname="/app/dashboard" navigate={(path) => router.push(path)} nativeLinks>
      {profile && roles.includes(profile.rol) ? (
        <Dashboard navigate={(path) => router.push(path)} />
      ) : (
        <AccessDenied />
      )}
    </LayoutContent>
  );
}

export default function DashboardClient() {
  return (
    <WorkspaceGuard>
      <DashboardContent />
    </WorkspaceGuard>
  );
}
