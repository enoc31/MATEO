import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { isSimulationMode } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { NativeLink } from '../../components/NativeLink';

export const UpdatePassword: React.FC = () => {
  const navigate = useNavigate();
  return <UpdatePasswordForm navigate={navigate} />;
};

export const UpdatePasswordForm: React.FC<{
  navigate: (path: string) => void;
  nativeLinks?: boolean;
}> = ({ navigate, nativeLinks = false }) => {
  const PasswordLink = nativeLinks ? NativeLink : Link;
  const { setIsPasswordRecovery } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        console.log('Sesión de recuperación iniciada');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas no coinciden.' });
      return;
    }

    if (password.length < 6) {
      setMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      if (isSimulationMode) {
        setTimeout(() => {
          setMessage({
            type: 'success',
            text: 'Simulación: Contraseña actualizada correctamente. Redirigiendo al inicio de sesión...',
          });
          setTimeout(() => navigate('/login'), 2000);
        }, 800);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setMessage({
        type: 'success',
        text: '¡Contraseña actualizada exitosamente! Redirigiendo al inicio de sesión...',
      });

      // Cerrar la sesión de recuperación para forzar el inicio de sesión con la nueva contraseña
      await supabase.auth.signOut();
      setIsPasswordRecovery(false);

      setTimeout(() => {
        navigate('/login?reset=success');
      }, 2000);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al intentar actualizar la contraseña.';
      setMessage({
        type: 'error',
        text: errorMessage,
      });
    } finally {
      if (!isSimulationMode) setLoading(false);
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
        fontFamily: 'Inter, sans-serif',
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
              fontSize: '1.25rem',
              fontWeight: 700,
              margin: '0.75rem 0 0.35rem 0',
            }}
          >
            Establecer Nueva Contraseña
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0, lineHeight: 1.5 }}>
            Ingresa tu nueva contraseña para proteger y acceder a tu cuenta.
          </p>
        </div>

        {message && (
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '10px',
              marginBottom: '1.25rem',
              backgroundColor:
                message.type === 'success' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${
                message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'
              }`,
              color: message.type === 'success' ? '#047857' : '#dc2626',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.6rem',
              lineHeight: 1.4,
            }}
          >
            {message.type === 'success' ? (
              <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            ) : (
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
        >
          <div className="form-field">
            <label className="form-field-label" htmlFor="new-password">
              Nueva Contraseña
            </label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                id="new-password"
                type="password"
                className="form-input-premium"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading || !!(message && message.type === 'success')}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          </div>

          <div className="form-field">
            <label className="form-field-label" htmlFor="confirm-password">
              Confirmar Contraseña
            </label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                id="confirm-password"
                type="password"
                className="form-input-premium"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading || !!(message && message.type === 'success')}
                placeholder="Repite tu contraseña"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !!(message && message.type === 'success')}
            style={{
              width: '100%',
              padding: '0.85rem',
              fontWeight: 700,
              borderRadius: '10px',
              marginTop: '0.25rem',
              boxShadow: '0 4px 12px rgba(47, 90, 174, 0.25)',
            }}
          >
            {loading ? 'Guardando...' : 'Guardar Nueva Contraseña'}
          </button>
        </form>

        <div
          style={{
            marginTop: '1.8rem',
            borderTop: '1px solid #f1f5f9',
            paddingTop: '1.25rem',
            textAlign: 'center',
          }}
        >
          <PasswordLink
            to="/login"
            style={{
              color: 'var(--primary)',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
          >
            <ArrowLeft size={16} /> Volver al Inicio de Sesión
          </PasswordLink>
        </div>
      </div>
    </div>
  );
};
