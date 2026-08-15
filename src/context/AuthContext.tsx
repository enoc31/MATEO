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
  | 'super_admin';

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
  activeOng: { nombre: string; logo_url: string | null } | null;
  loading: boolean;
  authError: string | null;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeOng, setActiveOng] = useState<{ nombre: string; logo_url: string | null } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

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

            const { data: insertedData, error: insertError } = await supabase
              .from('usuarios_perfiles')
              .insert([newProfile])
              .select()
              .single();

            if (!insertError && insertedData) {
              const insertedProfile = insertedData as UserProfile;
              setProfile(insertedProfile);
              setAuthError(null);
              // Fetch active ONG for the newly created profile
              const { data: ongData } = await supabase
                .from('ongs')
                .select('nombre, logo_url')
                .eq('id', insertedProfile.ong_id)
                .single();
              if (ongData) {
                setActiveOng(ongData);
              }
              return;
            } else {
              console.error('Error auto-creating profile:', insertError);
              setAuthError(
                `No se pudo crear el perfil: ${insertError?.message || 'Error desconocido'}`,
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
            metaRol === 'administrador' &&
            (profileData.rol !== 'administrador' || !profileData.aprobado)
          ) {
            profileData = { ...profileData, rol: 'administrador', aprobado: true };
            supabase
              .from('usuarios_perfiles')
              .update({ rol: 'administrador', aprobado: true })
              .eq('id', currentUser.id)
              .then();
          } else if (profileData.rol === 'administrador' && !profileData.aprobado) {
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
              .select('nombre, logo_url')
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
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          if (session) {
            setUser(session.user);
            setLoading(true); // Mostrar loading mientras busca perfil
            await fetchProfile(session.user);
            setLoading(false);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
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
      value={{ user, profile, activeOng, loading, authError, logout, refreshProfile }}
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
