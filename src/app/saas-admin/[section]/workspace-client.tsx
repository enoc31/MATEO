'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { SaasLayoutContent } from '../../../components/SaasLayout';
import { SaasDashboard } from '../../../features/saas/SaasDashboard';
import { SaasOngs } from '../../../features/saas/SaasOngs';
import { SaasUsers } from '../../../features/saas/SaasUsers';
import NextProviders from '../../next-providers';

function Workspace({ section }: { section: string }) {
  const { profile, loading, isPasswordRecovery } = useAuth();
  const router = useRouter();
  const valid = ['dashboard', 'ongs', 'users'].includes(section);
  const destination = isPasswordRecovery
    ? '/update-password'
    : !profile || profile.rol !== 'super_admin'
      ? '/saas-admin'
      : !valid
        ? '/saas-admin/dashboard'
        : null;
  useEffect(() => {
    if (!loading && destination) {
      const suffix = isPasswordRecovery ? window.location.hash + window.location.search : '';
      router.replace(destination + suffix);
    }
  }, [destination, isPasswordRecovery, loading, router]);
  if (loading || destination) return <div>Verificando...</div>;
  const content =
    section === 'ongs' ? <SaasOngs /> : section === 'users' ? <SaasUsers /> : <SaasDashboard />;
  return (
    <SaasLayoutContent pathname={`/saas-admin/${section}`} nativeLinks>
      {content}
    </SaasLayoutContent>
  );
}

export default function SaasWorkspaceClient({ section }: { section: string }) {
  return (
    <NextProviders>
      <Workspace section={section} />
    </NextProviders>
  );
}
