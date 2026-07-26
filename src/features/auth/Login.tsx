import React, { useState } from 'react';
import { UserRole } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../supabaseClient';
import { isSimulationMode } from '../../services/api';
import { Link } from 'react-router-dom';
import { Lock, Mail, Building2, KeyRound, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const { refreshProfile } = useAuth();

  // Estados del formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Estados de control
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Manejador para login en Supabase real
  const handleRealLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
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
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
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
      const profiles = JSON.parse(localStorage.getItem('cnbv_profiles') || '{}');
      const foundProfile = Object.values(profiles).find(
        (p: any) => p.email.toLowerCase() === email.toLowerCase(),
      ) as any;

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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f1f5f9',
        backgroundImage: 'radial-gradient(at 50% 0%, rgba(47, 90, 174, 0.06) 0px, transparent 75%)',
        padding: '2rem 1rem',
      }}
    >
      <div
        className="card animate-fade-in-up"
        style={{
          maxWidth: '460px',
          width: '100%',
          padding: '2.5rem',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.08), 0 10px 10px -5px rgba(0,0,0,0.02)',
        }}
      >
        {/* Header con imagen corporativa MATEO */}
        <div style={{ textAlign: 'center', marginBottom: '1.8rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              marginBottom: '0.75rem',
            }}
          >
            <img
              src="/mateo_logo.png"
              alt="Logo MATEO"
              style={{
                height: '56px',
                width: '56px',
                objectFit: 'contain',
                borderRadius: '14px',
                boxShadow: '0 8px 16px -4px rgba(47, 90, 174, 0.2)',
              }}
            />
            <div style={{ textAlign: 'left' }}>
              <div
                style={{
                  fontSize: '1.8rem',
                  fontWeight: 900,
                  color: 'var(--primary)',
                  letterSpacing: '-0.5px',
                  lineHeight: 1,
                }}
              >
                MATEO
              </div>
              <div
                style={{
                  fontSize: '0.65rem',
                  color: '#64748b',
                  fontWeight: 700,
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                }}
              >
                Plataforma de Auditoría & Donaciones
              </div>
            </div>
          </div>
          <h2
            style={{
              color: 'var(--primary)',
              fontSize: '1.1rem',
              fontWeight: 700,
              margin: '0.5rem 0 0 0',
            }}
          >
            Iniciar Sesión
          </h2>
        </div>

        {error && (
          <div
            style={{
              padding: '0.85rem 1rem',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              color: '#dc2626',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '1.25rem',
              textAlign: 'center',
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div
            style={{
              padding: '0.85rem 1rem',
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '10px',
              color: '#047857',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '1.25rem',
              textAlign: 'center',
            }}
          >
            {success}
          </div>
        )}

        {/* Formulario de Login */}
        <form
          noValidate
          onSubmit={isSimulationMode ? handleSimulatedPasswordLogin : handleRealLogin}
          style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
        >
          <div className="form-field">
            <label className="form-field-label" htmlFor="email">
              Correo Electrónico
            </label>
            <div className="input-with-icon">
              <Mail size={18} className="input-icon" />
              <input
                id="email"
                type="email"
                className="form-input-premium"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                placeholder="usuario@tu-ong.org"
              />
            </div>
          </div>

          <div className="form-field">
            <label className="form-field-label" htmlFor="password">
              Contraseña
            </label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                id="password"
                type="password"
                className="form-input-premium"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.85rem',
              fontWeight: 700,
              borderRadius: '10px',
              marginTop: '0.5rem',
              boxShadow: '0 4px 12px rgba(47, 90, 174, 0.25)',
            }}
          >
            {loading ? 'Iniciando Sesión...' : 'Ingresar a la Plataforma'}
          </button>
        </form>

        {/* Accesos de Registro de ONG e Invitaciones */}
        <div
          style={{
            marginTop: '1.8rem',
            borderTop: '1px solid #f1f5f9',
            paddingTop: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
          }}
        >
          {/* CTA Crear Nueva ONG en Trial */}
          <Link
            to="/registro-ong"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.85rem 1rem',
              backgroundColor: 'rgba(47, 90, 174, 0.06)',
              border: '1px solid rgba(47, 90, 174, 0.2)',
              borderRadius: '12px',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Building2 size={20} color="var(--primary)" />
              <div style={{ textAlign: 'left' }}>
                <span
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: 'var(--primary)',
                    display: 'block',
                  }}
                >
                  ¿Deseas registrar una nueva ONG?
                </span>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Prueba Gratuita de 14 Días (Acceso Completo)
                </span>
              </div>
            </div>
            <ArrowRight size={18} color="var(--primary)" />
          </Link>

          {/* Enlace para aceptar invitación */}
          <Link
            to="/aceptar-invitacion"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontSize: '0.82rem',
              color: '#64748b',
              fontWeight: 600,
              textDecoration: 'none',
              padding: '0.4rem',
            }}
          >
            <KeyRound size={16} /> ¿Tienes un código o enlace de invitación?{' '}
            <span style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
              Aceptar Invitación
            </span>
          </Link>
        </div>

        {/* Accesos rápidos en Modo Simulación local */}
        {isSimulationMode && (
          <div
            style={{
              marginTop: '1.5rem',
              paddingTop: '1rem',
              borderTop: '1px dashed #cbd5e1',
              textAlign: 'center',
            }}
          >
            <span
              style={{
                fontSize: '0.72rem',
                color: '#64748b',
                fontWeight: 700,
                display: 'block',
                marginBottom: '0.5rem',
              }}
            >
              DEMO LOCAL SIMULADO (ACCESO RÁPIDO):
            </span>
            <div
              style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center' }}
            >
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
      </div>
    </div>
  );
};
