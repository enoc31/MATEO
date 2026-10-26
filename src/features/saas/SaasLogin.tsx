import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { isSimulationMode } from '../../services/api';
import { ShieldAlert, KeyRound, Mail, ArrowRight } from 'lucide-react';

export const SaasLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRealLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      // Auto-asegurar que si es gerardoh31@gmail.com o metadata de super_admin, se aplique rol super_admin
      const isSuperAdminEmail =
        email.trim().toLowerCase() === 'gerardoh31@gmail.com' ||
        data.user.user_metadata?.rol === 'super_admin';

      if (isSuperAdminEmail) {
        await supabase.from('usuarios_perfiles').upsert({
          id: data.user.id,
          email: data.user.email,
          nombre_completo: data.user.user_metadata?.nombre_completo || 'Super Administrador',
          rol: 'super_admin',
          aprobado: true,
        });
      }

      // Verify profile
      const { data: profile } = await supabase
        .from('usuarios_perfiles')
        .select('rol')
        .eq('id', data.user.id)
        .single();

      if (!profile || (profile.rol !== 'super_admin' && !isSuperAdminEmail)) {
        await supabase.auth.signOut();
        throw new Error(
          'Acceso denegado. Este portal es de uso exclusivo para Super Administradores del SaaS.',
        );
      }

      // Force full window reload to enter SaasLayout
      window.location.href = '/saas-admin/dashboard';
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatedLogin = () => {
    setLoading(true);
    setError(null);
    try {
      const mockSession = {
        user: {
          id: 'user-super_admin',
          email: 'superadmin@mateo.org',
          user_metadata: { nombre_completo: 'Super Administrador SaaS', rol: 'super_admin' },
        },
      };

      const profiles = JSON.parse(localStorage.getItem('cnbv_profiles') || '{}');
      profiles['user-super_admin'] = {
        id: 'user-super_admin',
        email: 'superadmin@mateo.org',
        nombre_completo: 'Super Administrador SaaS (Demo)',
        rol: 'super_admin',
        aprobado: true,
        ong_id: '11111111-1111-1111-1111-111111111111',
        created_at: new Date().toISOString(),
      };

      localStorage.setItem('cnbv_profiles', JSON.stringify(profiles));
      localStorage.setItem('cnbv_mock_session', JSON.stringify(mockSession));

      // Redirect to saas dashboard
      setTimeout(() => {
        window.location.href = '/saas-admin/dashboard';
      }, 500);
    } catch {
      setError('Error al simular inicio de sesión');
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#0f172a',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div
        style={{
          background: '#1e293b',
          padding: '3rem 2.5rem',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3), 0 10px 10px -5px rgba(0,0,0,0.2)',
          width: '100%',
          maxWidth: '440px',
          color: '#f8fafc',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              backgroundColor: '#0D9488',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem auto',
            }}
          >
            <ShieldAlert size={32} color="white" />
          </div>
          <h2
            style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', marginBottom: '0.25rem' }}
          >
            MATEO SaaS
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>
            Control Central de la Plataforma
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #ef4444',
              color: '#fca5a5',
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              marginBottom: '1.5rem',
              lineHeight: '1.4',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleRealLogin}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor="email"
              style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#94a3b8',
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
              }}
            >
              Usuario Administrador (Email)
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={16}
                color="#64748b"
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
              />
              <input
                id="email"
                type="email"
                required
                disabled={loading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="superadmin@mateo.org"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.5rem',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem',
              }}
            >
              <label
                htmlFor="password"
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  margin: 0,
                }}
              >
                Contraseña
              </label>
              <Link
                to="/forgot-password"
                style={{
                  fontSize: '0.75rem',
                  color: '#2dd4bf',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <div style={{ position: 'relative' }}>
              <KeyRound
                size={16}
                color="#64748b"
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
              />
              <input
                id="password"
                type="password"
                required
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.5rem',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              backgroundColor: '#0d9488',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '0.75rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0f766e')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0d9488')}
          >
            {loading ? 'Accediendo...' : 'Iniciar Sesión Central'}
            <ArrowRight size={16} />
          </button>
        </form>

        {isSimulationMode && (
          <div
            style={{
              marginTop: '2rem',
              borderTop: '1px solid #334155',
              paddingTop: '1.5rem',
              textAlign: 'center',
            }}
          >
            <span
              style={{
                fontSize: '0.75rem',
                color: '#64748b',
                display: 'block',
                marginBottom: '0.75rem',
              }}
            >
              AMBIENTE LOCAL DE SIMULACIÓN
            </span>
            <button
              onClick={handleSimulatedLogin}
              disabled={loading}
              style={{
                width: '100%',
                backgroundColor: 'rgba(13, 148, 136, 0.1)',
                color: '#2dd4bf',
                border: '1px solid rgba(13, 148, 136, 0.3)',
                borderRadius: '8px',
                padding: '0.6rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(13, 148, 136, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(13, 148, 136, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(13, 148, 136, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(13, 148, 136, 0.3)';
              }}
            >
              Acceso Rápido: Super Administrador
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
