import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { isSimulationMode } from '../services/api';

export type UserRole = 'administrador' | 'auditor' | 'coordinador' | 'director' | 'auxiliar_campo' | 'donante';

export interface UserProfile {
  id: string;
  email: string;
  nombre_completo: string;
  rol: UserRole;
  aprobado: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    if (!isSimulationMode) {
      try {
        const { data, error } = await supabase
          .from('usuarios_perfiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error fetching user profile:', error);
          setProfile(null);
        } else {
          setProfile(data as UserProfile);
        }
      } catch (e) {
        console.error('Error in fetchProfile:', e);
        setProfile(null);
      }
    } else {
      // Simulación Local
      const profiles = JSON.parse(localStorage.getItem('cnbv_profiles') || '{}');
      const mockProfile = profiles[userId];
      if (mockProfile) {
        setProfile(mockProfile as UserProfile);
      } else {
        setProfile(null);
      }
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      if (!isSimulationMode) {
        // Inicialización Real
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setUser(session.user);
            await fetchProfile(session.user.id);
          }
        } catch (e) {
          console.error('Error getting initial session:', e);
        } finally {
          setLoading(false);
        }
      } else {
        // Inicialización Simulación
        try {
          const mockSessionStr = localStorage.getItem('cnbv_mock_session');
          if (mockSessionStr) {
            const mockSession = JSON.parse(mockSessionStr);
            setUser(mockSession.user as User);
            await fetchProfile(mockSession.user.id);
          }
        } catch (e) {
          console.error('Error getting mock session:', e);
        } finally {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    if (!isSimulationMode) {
      // Suscribirse a cambios reales en Supabase Auth
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        setLoading(true);
        if (session) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const logout = async () => {
    setLoading(true);
    if (!isSimulationMode) {
      await supabase.auth.signOut();
    } else {
      localStorage.removeItem('cnbv_mock_session');
    }
    setUser(null);
    setProfile(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout, refreshProfile }}>
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
