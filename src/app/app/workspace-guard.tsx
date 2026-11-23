'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { isSimulationMode } from '../../services/api';
import { EmailUnverified } from '../../features/auth/EmailUnverified';
import { PendingApproval } from '../../App';

export default function WorkspaceGuard({ children }: { children: ReactNode }) {
  const { profile, user, loading, logout, refreshProfile, authError, isPasswordRecovery } =
    useAuth();
  const router = useRouter();
  const unverified = !isSimulationMode && user && !user.email_confirmed_at && !user.confirmed_at;
  const destination = isPasswordRecovery
    ? '/update-password'
    : !profile && !user
      ? '/login'
      : profile?.rol === 'super_admin' && !unverified
        ? '/saas-admin/dashboard'
        : null;
  useEffect(() => {
    if (!loading && destination) {
      const suffix = isPasswordRecovery ? window.location.hash + window.location.search : '';
      router.replace(destination + suffix);
    }
  }, [destination, isPasswordRecovery, loading, router]);
  if (loading || destination) return <div>Verificando...</div>;
  if (!profile)
    return (
      <div style={{ textAlign: 'center', padding: '3rem', fontFamily: 'sans-serif' }}>
        <h2>Error de Perfil de Usuario</h2>
        <p>
          Tu cuenta se ha autenticado, pero tu perfil en la base de datos no pudo ser cargado o
          creado.
        </p>
        {authError && <p>{authError}</p>}
        <button
          onClick={() => {
            void logout().then(() => window.location.reload());
          }}
        >
          Volver al Inicio y Cerrar Sesión
        </button>
      </div>
    );
  if (unverified) return <EmailUnverified email={user.email} logout={logout} />;
  if (
    profile.aprobado === false &&
    profile.rol !== 'administrador' &&
    profile.rol !== 'admin_iglesia'
  ) {
    return <PendingApproval logout={logout} refreshProfile={refreshProfile} userId={user?.id} />;
  }
  return <>{children}</>;
}
