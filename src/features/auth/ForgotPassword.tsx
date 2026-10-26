import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { isSimulationMode } from '../../services/api';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setMessage(null);

    try {
      if (isSimulationMode) {
        setTimeout(() => {
          setMessage({
            type: 'success',
            text: 'Simulación: Si el correo existe, recibirás instrucciones para restablecer tu contraseña.',
          });
          setLoading(false);
        }, 800);
        return;
      }

      // El correo se enviará con un enlace que redirigirá a la URL oficial de producción de Mateo Ekklesia
      const isLocalhost =
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

      const productionDomain = 'https://www.mateo-ekklesia.com';
      const redirectUrl = isLocalhost
        ? `${window.location.origin}/update-password`
        : `${productionDomain}/update-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      setMessage({
        type: 'success',
        text: 'Si el correo electrónico está registrado, recibirás un enlace seguro para crear tu nueva contraseña en los próximos minutos.',
      });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Ocurrió un error al intentar enviar el correo.';
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
            Recuperar Contraseña
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0, lineHeight: 1.5 }}>
            Ingresa tu correo electrónico registrado y te enviaremos un enlace seguro para crear una
            nueva contraseña.
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
            <div>
              <span>{message.text}</span>
              {isSimulationMode && message.type === 'success' && (
                <div style={{ marginTop: '0.75rem' }}>
                  <Link
                    to="/update-password"
                    className="btn btn-primary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.78rem',
                      padding: '0.4rem 0.75rem',
                      borderRadius: '6px',
                      textDecoration: 'none',
                    }}
                  >
                    Probar Cambio de Contraseña (Demo) <ArrowRight size={14} />
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
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

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.85rem',
              fontWeight: 700,
              borderRadius: '10px',
              marginTop: '0.25rem',
              boxShadow: '0 4px 12px rgba(47, 90, 174, 0.25)',
            }}
          >
            {loading ? 'Enviando enlace...' : 'Enviar Enlace de Recuperación'}
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
          <Link
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
          </Link>
        </div>
      </div>
    </div>
  );
};
