import React, { useState } from 'react';
import type { UserRole } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../supabaseClient';
import { isSimulationMode } from '../../services/api';
import { Link } from 'react-router-dom';
import { NativeLink } from '../../components/NativeLink';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import {
  traceOperation,
  recordMetric,
  emitLog,
  recordException,
  forceFlushTelemetry,
} from '../../services/telemetry';
import './Login.css';

const REMEMBERED_EMAIL_KEY = 'mateo_remembered_email';

export const Login: React.FC<{ nativeLinks?: boolean }> = ({ nativeLinks = false }) => {
  const LoginLink = nativeLinks ? NativeLink : Link;
  const { refreshProfile } = useAuth();

  // Estados del formulario
  const [email, setEmail] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(REMEMBERED_EMAIL_KEY) || '';
    }
    return '';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    if (typeof window !== 'undefined') {
      return Boolean(localStorage.getItem(REMEMBERED_EMAIL_KEY));
    }
    return false;
  });

  // Estados de control
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('reset') === 'success') {
        setSuccess(
          '¡Tu contraseña ha sido actualizada exitosamente! Por favor ingresa con tu nueva clave.',
        );
      }
    }
  }, []);

  // Manejador para login con Google OAuth
  const handleGoogleLogin = async () => {
    if (isSimulationMode) {
      setError('El acceso con Google OAuth solo está disponible conectado a Supabase.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/app`,
        },
      });
      if (oauthError) throw oauthError;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión con Google';
      recordException(err instanceof Error ? err : new Error(message), {
        operation: 'auth.login.google',
      });
      setError(message);
      setLoading(false);
    }
  };

  // Manejador para login en Supabase real
  const handleRealLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (typeof window !== 'undefined') {
      if (rememberMe) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }
    }

    try {
      await traceOperation(
        'auth.login',
        async () => {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) {
            if (error.message.includes('Invalid login credentials')) {
              throw new Error('Credenciales inválidas. Verifica tu correo y contraseña.');
            } else if (error.message.includes('Email not confirmed')) {
              throw new Error(
                'Tu correo electrónico no ha sido verificado. Por favor revisa tu bandeja de entrada.',
              );
            }
            throw error;
          }
          await refreshProfile();
        },
        { 'auth.method': 'password' },
      );

      recordMetric('mateo_auth_logins_total', 1, { status: 'success', method: 'password' });
      recordMetric('mateo_auth_login_success_total', 1, { method: 'password' });
      emitLog('INFO', 'Usuario inició sesión exitosamente');
      forceFlushTelemetry().catch(() => {});
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión';
      recordMetric('mateo_auth_logins_total', 1, { status: 'failure', method: 'password' });
      recordMetric('mateo_auth_login_failure_total', 1, { method: 'password' });
      recordException(err instanceof Error ? err : new Error(message), { operation: 'auth.login' });
      setError(message);
      forceFlushTelemetry().catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  // Manejador para login en simulación local
  const handleSimulatedLogin = async (role: UserRole) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const mockSession = {
        user: {
          id: `user-${role}`,
          email: `${role}@cnbv.org`,
          user_metadata: { nombre_completo: `Usuario Demo (${role.toUpperCase()})`, rol: role },
        },
      };

      const profiles = JSON.parse(localStorage.getItem('cnbv_profiles') || '{}');
      profiles[`user-${role}`] = {
        id: `user-${role}`,
        email: `${role}@cnbv.org`,
        nombre_completo:
          role === 'administrador'
            ? 'Director Nacional CNBV (Admin)'
            : role === 'director'
              ? 'Dr. Mateo Silva (Director)'
              : role === 'auditor'
                ? 'Auditor de Finanzas CNBV'
                : role === 'auxiliar_campo'
                  ? 'Pedro Páez (Auxiliar de Campo)'
                  : role === 'donante'
                    ? 'Donante Internacional (Alianza)'
                    : 'Coordinador Ayuda Apure',
        rol: role,
        ong_id: '11111111-1111-1111-1111-111111111111',
        aprobado: true,
        created_at: new Date().toISOString(),
      };
      localStorage.setItem('cnbv_profiles', JSON.stringify(profiles));
      localStorage.setItem('cnbv_mock_session', JSON.stringify(mockSession));

      window.location.reload();
    } catch {
      setError('Error al simular inicio de sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatedPasswordLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const profiles = JSON.parse(localStorage.getItem('cnbv_profiles') || '{}') as Record<
        string,
        { id: string; email: string; nombre_completo: string; rol: UserRole }
      >;
      const foundProfile = Object.values(profiles).find(
        (p) => p.email.toLowerCase() === email.toLowerCase(),
      );

      if (!foundProfile) {
        setError('Usuario no encontrado en la base de datos simulada local.');
        setLoading(false);
        return;
      }

      const mockSession = {
        user: {
          id: foundProfile.id,
          email: foundProfile.email,
          user_metadata: { nombre_completo: foundProfile.nombre_completo, rol: foundProfile.rol },
        },
      };

      localStorage.setItem('cnbv_mock_session', JSON.stringify(mockSession));
      window.location.reload();
    } catch {
      setError('Error al iniciar sesión simulada');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-top-accent" aria-hidden="true" />

      <main className="login-grid">
        {/* Columna izquierda: Formulario de acceso */}
        <section className="login-form-col">
          {error && <div className="login-alert login-alert--error">⚠️ {error}</div>}
          {success && <div className="login-alert login-alert--success">{success}</div>}

          <button
            type="button"
            className="login-google-btn"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
              />
            </svg>
            <span>Iniciar sesión con Google</span>
          </button>

          <div className="login-divider">o accede con tu correo</div>

          <form
            noValidate
            className="login-form"
            onSubmit={isSimulationMode ? handleSimulatedPasswordLogin : handleRealLogin}
          >
            <div>
              <label className="login-label" htmlFor="email">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                className="login-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                placeholder="Introduce tu correo electrónico"
              />
            </div>

            <div>
              <label className="login-label" htmlFor="password">
                Contraseña
              </label>
              <div className="login-input-wrap">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="login-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="Introduce tu contraseña"
                />
                <button
                  type="button"
                  className="login-eye-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                </button>
              </div>
            </div>

            <div className="login-options-row">
              <label className="login-remember-label">
                <input
                  type="checkbox"
                  className="login-remember-checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Recuérdame</span>
              </label>
              <LoginLink to="/forgot-password" className="login-forgot-link">
                ¿Olvidaste tu contraseña?
              </LoginLink>
            </div>

            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? 'Iniciando Sesión...' : 'Iniciar sesión'}
            </button>
          </form>

          <div className="login-footer-links">
            <div>
              ¿Aún no tienes cuenta?{' '}
              <LoginLink to="/registro-ong" className="login-link-primary">
                Crea una cuenta
              </LoginLink>{' '}
              <LoginLink to="/registro-ong" className="login-link-secondary">
                Regístrate
              </LoginLink>
            </div>

            <LoginLink to="/aceptar-invitacion" className="login-invite-link">
              <KeyRound size={15} />
              <span>¿Tienes un código de invitación? Aceptar Invitación</span>
            </LoginLink>
          </div>

          {isSimulationMode && (
            <div className="login-sim-box">
              <span className="login-sim-title">DEMO LOCAL SIMULADO (ACCESO RÁPIDO):</span>
              <div className="login-sim-actions">
                <button
                  type="button"
                  onClick={() => handleSimulatedLogin('administrador')}
                  className="btn btn-outline"
                  style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem', borderRadius: '6px' }}
                >
                  Admin ONG
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulatedLogin('coordinador')}
                  className="btn btn-outline"
                  style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem', borderRadius: '6px' }}
                >
                  Coordinador
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulatedLogin('auditor')}
                  className="btn btn-outline"
                  style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem', borderRadius: '6px' }}
                >
                  Auditor
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulatedLogin('super_admin')}
                  className="btn btn-outline"
                  style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem', borderRadius: '6px' }}
                >
                  SuperAdmin
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Columna derecha: Logotipo MATEO */}
        <section className="login-brand-showcase" aria-label="Identidad MATEO">
          <img src="/mateo_logo_wordmark.png" alt="Logo Mateo" className="login-brand-logo" />
        </section>
      </main>
    </div>
  );
};
