import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { isSimulationMode } from '../services/api';
import { checkAndSyncBCVRate } from '../utils/bcvSync';

export type UserRole =
  | 'administrador'
  | 'auditor'
  | 'coordinador'
  | 'director'
  | 'auxiliar_campo'
  | 'donante'
  | 'super_admin'
  | 'admin_iglesia'
  | 'tesorero'
  | 'pastor'
  | 'lider_ministerio'
  | 'auditor_iglesia'
  | 'secretario';

export interface UserProfile {
  id: string;
  email: string;
  nombre_completo: string;
  rol: UserRole;
  aprobado: boolean;
  ong_id: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  activeOng: {
    id?: string;
    nombre: string;
    logo_url: string | null;
    tipo_organizacion?: 'ong' | 'ekklesia';
  } | null;
  loading: boolean;
  authError: string | null;
  isPasswordRecovery: boolean;
  setIsPasswordRecovery: (value: boolean) => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeOng, setActiveOng] = useState<{
    id?: string;
    nombre: string;
    logo_url: string | null;
    tipo_organizacion?: 'ong' | 'ekklesia';
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      return hash.includes('type=recovery') || search.includes('type=recovery');
    }
    return false;
  });

  const fetchProfile = async (currentUser: User) => {
    if (!isSimulationMode) {
      try {
        const { data, error } = await supabase
          .from('usuarios_perfiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        if (error) {
          if (error.code === 'PGRST116' || error.message?.includes('0 rows')) {
            const meta = currentUser.user_metadata;
            // IMPORTANTE: No usar ONG por defecto como fallback.
            // Si el usuario no tiene ong_id en su metadata, quedará sin ONG (null)
            // hasta que un SuperAdmin lo configure, evitando contaminación entre tenants.
            const metaOngIdRaw = meta?.ong_id;
            let parsedOngId: string | null = null;
            if (metaOngIdRaw && typeof metaOngIdRaw === 'string' && metaOngIdRaw.length > 0) {
              parsedOngId = metaOngIdRaw;
            }
            const newProfile = {
              id: currentUser.id,
              email: currentUser.email,
              nombre_completo: meta?.nombre_completo || 'Usuario',
              rol: meta?.rol || 'donante',
              aprobado: meta?.aprobado !== undefined ? Boolean(meta.aprobado) : false,
              ong_id: parsedOngId,
            };

            const { data: upsertedData, error: upsertError } = await supabase
              .from('usuarios_perfiles')
              .upsert(newProfile)
              .select()
              .single();

            if (!upsertError && upsertedData) {
              const insertedProfile = upsertedData as UserProfile;
              setProfile(insertedProfile);
              setAuthError(null);
              // Fetch active ONG for the newly created profile
              if (insertedProfile.ong_id) {
                const { data: ongData } = await supabase
                  .from('ongs')
                  .select('id, nombre, logo_url, tipo_organizacion')
                  .eq('id', insertedProfile.ong_id)
                  .single();
                if (ongData) {
                  setActiveOng(ongData);
                }
              }
              return;
            } else {
              console.error('Error auto-creating profile:', upsertError);
              setAuthError(
                `No se pudo crear el perfil: ${upsertError?.message || 'Error desconocido'}`,
              );
            }
          } else {
            setAuthError(`Error (Fetch): ${error.message || 'Error desconocido'}`);
          }
          console.error('Error fetching user profile:', error);
          setProfile(null);
          setActiveOng(null);
        } else {
          let profileData = data as UserProfile;
          const metaRol = currentUser.user_metadata?.rol;
          const isSuperAdminEmail =
            currentUser.email?.toLowerCase() === 'gerardoh31@gmail.com' ||
            metaRol === 'super_admin' ||
            profileData.rol === 'super_admin';

          // Auto-corregir perfil si es SuperAdmin o Administrador
          if (isSuperAdminEmail && (profileData.rol !== 'super_admin' || !profileData.aprobado)) {
            profileData = { ...profileData, rol: 'super_admin', aprobado: true };
            supabase
              .from('usuarios_perfiles')
              .upsert({
                id: currentUser.id,
                email: currentUser.email,
                nombre_completo:
                  currentUser.user_metadata?.nombre_completo || 'Super Administrador',
                rol: 'super_admin',
                aprobado: true,
              })
              .then();
          } else if (
            (metaRol === 'administrador' || metaRol === 'admin_iglesia') &&
            (profileData.rol !== metaRol || !profileData.aprobado)
          ) {
            profileData = { ...profileData, rol: metaRol, aprobado: true };
            supabase
              .from('usuarios_perfiles')
              .update({ rol: metaRol, aprobado: true })
              .eq('id', currentUser.id)
              .then();
          } else if (
            (profileData.rol === 'administrador' || profileData.rol === 'admin_iglesia') &&
            !profileData.aprobado
          ) {
            profileData = { ...profileData, aprobado: true };
            supabase
              .from('usuarios_perfiles')
              .update({ aprobado: true })
              .eq('id', currentUser.id)
              .then();
          } else if (!profileData.aprobado && !isSuperAdminEmail) {
            // PRIMER INICIO DE SESIÓN: el usuario fue creado por un administrador con
            // aprobado=false (pendiente de activación). Al autenticarse exitosamente
            // con sus credenciales, lo activamos automáticamente.
            profileData = { ...profileData, aprobado: true };
            supabase
              .from('usuarios_perfiles')
              .update({ aprobado: true })
              .eq('id', currentUser.id)
              .then();
          }

          setProfile(profileData);
          setAuthError(null);

          // Fetch active ONG
          if (profileData.ong_id) {
            const { data: ongData, error: ongError } = await supabase
              .from('ongs')
              .select('id, nombre, logo_url, tipo_organizacion')
              .eq('id', profileData.ong_id)
              .single();
            if (!ongError && ongData) {
              setActiveOng(ongData);
            } else {
              console.error('Error fetching active ONG:', ongError);
              setActiveOng(null);
            }
          }
        }
      } catch (e: any) {
        console.error('Error in fetchProfile:', e);
        setAuthError(`Excepción: ${e.message || 'Error desconocido'}`);
        setProfile(null);
        setActiveOng(null);
      }
    } else {
      const profiles = JSON.parse(localStorage.getItem('cnbv_profiles') || '{}');
      const mockProfile = profiles[currentUser.id];
      if (mockProfile) {
        const profileData = mockProfile as UserProfile;
        setProfile(profileData);
        setActiveOng({
          id: profileData.ong_id || '11111111-1111-1111-1111-111111111111',
          nombre: 'Convención Nacional Bautista de Venezuela (Simulado)',
          logo_url: 'https://cnbv.org/wp-content/uploads/2020/09/logo-cnbv.jpg',
        });
      } else {
        setProfile(null);
        setActiveOng(null);
      }
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };

  useEffect(() => {
    let mounted = true;
    let authSubscription: any = null;

    const initializeAuth = async () => {
      if (!isSimulationMode) {
        try {
          // Timeout de 10 segundos para evitar que la pantalla se quede colgada
          const getSessionPromise = supabase.auth.getSession();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout de conexión a Supabase')), 10000),
          );

          const {
            data: { session },
          } = (await Promise.race([getSessionPromise, timeoutPromise])) as any;

          if (session && mounted) {
            const hasRecovery =
              window.location.hash.includes('type=recovery') ||
              window.location.search.includes('type=recovery');

            if (hasRecovery) {
              console.warn(
                '[Security] Recovery token in URL. Locking session to /update-password.',
              );
              setIsPasswordRecovery(true);
              setUser(session.user);
              setProfile(null);
              setActiveOng(null);
              setLoading(false);
              if (!window.location.pathname.startsWith('/update-password')) {
                window.location.replace(
                  '/update-password' + window.location.hash + window.location.search,
                );
              }
              return;
            }

            setUser(session.user);
            await fetchProfile(session.user);
          }
        } catch (e) {
          console.error('Error en inicialización de sesión:', e);
          if (mounted) setAuthError('Error de red o conexión al servidor. Intente recargar.');
        } finally {
          if (mounted) setLoading(false);
        }
      } else {
        try {
          const mockSessionStr = localStorage.getItem('cnbv_mock_session');
          if (mockSessionStr) {
            const mockSession = JSON.parse(mockSessionStr);
            setUser(mockSession.user as User);
            await fetchProfile(mockSession.user);
          }
        } catch (e) {
          console.error('Error getting mock session:', e);
        } finally {
          if (mounted) setLoading(false);
        }
      }
    };

    initializeAuth();

    // Intento de sincronización silenciosa (Lazy Sync) de tasa BCV
    checkAndSyncBCVRate().catch((e) => console.error('Error en Lazy Sync BCV', e));

    if (!isSimulationMode) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;

        if (event === 'PASSWORD_RECOVERY') {
          console.warn('[Security] PASSWORD_RECOVERY event received. Locking to /update-password.');
          setIsPasswordRecovery(true);
          if (session) {
            setUser(session.user);
          }
          setProfile(null);
          setActiveOng(null);
          setLoading(false);
          if (!window.location.pathname.startsWith('/update-password')) {
            window.location.replace(
              '/update-password' + window.location.hash + window.location.search,
            );
          }
          return;
        }

        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          if (session) {
            const hasRecovery =
              window.location.hash.includes('type=recovery') ||
              window.location.search.includes('type=recovery');

            if (hasRecovery) {
              console.warn('[Security] Suppressing standard profile load for recovery session.');
              setIsPasswordRecovery(true);
              setUser(session.user);
              setProfile(null);
              setActiveOng(null);
              setLoading(false);
              if (!window.location.pathname.startsWith('/update-password')) {
                window.location.replace(
                  '/update-password' + window.location.hash + window.location.search,
                );
              }
              return;
            }

            setUser(session.user);
            setLoading(true); // Mostrar loading mientras busca perfil
            await fetchProfile(session.user);
            setLoading(false);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setIsPasswordRecovery(false);
        }
      });
      authSubscription = data.subscription;
    }

    return () => {
      mounted = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  const logout = async () => {
    setLoading(true);
    if (!isSimulationMode) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error('Logout error:', e);
      }
    } else {
      localStorage.removeItem('cnbv_mock_session');
    }
    setUser(null);
    setProfile(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        activeOng,
        loading,
        authError,
        isPasswordRecovery,
        setIsPasswordRecovery,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
