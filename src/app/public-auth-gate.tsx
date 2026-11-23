'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export default function PublicAuthGate({ children }: { children: ReactNode }) {
  const { profile, loading, isPasswordRecovery } = useAuth();
  const router = useRouter();
  const destination = isPasswordRecovery
    ? '/update-password'
    : profile
      ? profile.rol === 'super_admin'
        ? '/saas-admin/dashboard'
        : '/app'
      : null;

  useEffect(() => {
    if (!loading && destination) {
      const suffix = isPasswordRecovery ? window.location.hash + window.location.search : '';
      router.replace(destination + suffix);
    }
  }, [destination, isPasswordRecovery, loading, router]);

  if (loading || destination) return <div>Cargando...</div>;
  return <>{children}</>;
}
