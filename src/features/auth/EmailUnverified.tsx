import React, { useState } from 'react';
import { Mail, RefreshCw, LogOut, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '../../supabaseClient';

interface EmailUnverifiedProps {
  email?: string;
  logout: () => Promise<void>;
}

export const EmailUnverified: React.FC<EmailUnverifiedProps> = ({ email, logout }) => {
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleResendEmail = async () => {
    if (!email) return;
    setResending(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) throw error;

      setMessage({
        type: 'success',
        text: `Hemos reenviado el enlace de verificación a ${email}. Revisa tu bandeja de entrada o spam.`,
      });
    } catch (err: any) {
      console.error('Error al reenviar correo de confirmación:', err);
      setMessage({
        type: 'error',
        text: err.message || 'No se pudo reenviar el correo. Intenta de nuevo más tarde.',
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
      }}
    >
      <div
        className="card animate-fade-in-up"
        style={{
          maxWidth: '520px',
          width: '100%',
          padding: '2.5rem',
          textAlign: 'center',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.08), 0 10px 10px -5px rgba(0,0,0,0.02)',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(47, 90, 174, 0.1)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem auto',
          }}
        >
          <Mail size={32} />
        </div>

        <h2
          style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            color: 'var(--primary)',
            margin: '0 0 0.5rem 0',
          }}
        >
          Verificación de Correo Requerida
        </h2>

        <p
          style={{
            fontSize: '0.9rem',
            color: '#475569',
            lineHeight: '1.6',
            marginBottom: '1.5rem',
          }}
        >
          Para garantizar la seguridad de la plataforma, hemos enviado un correo de confirmación a:
          <br />
          <strong
            style={{
              color: 'var(--primary)',
              fontSize: '1rem',
              display: 'block',
              marginTop: '0.4rem',
            }}
          >
            {email || 'tu correo electrónico'}
          </strong>
        </p>

        {message && (
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '10px',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor:
                message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: message.type === 'success' ? '#047857' : '#dc2626',
              border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            }}
          >
            {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            {message.text}
          </div>
        )}

        <div
          style={{
            backgroundColor: '#f1f5f9',
            borderRadius: '12px',
            padding: '1.2rem',
            fontSize: '0.82rem',
            color: '#64748b',
            textAlign: 'left',
            marginBottom: '1.8rem',
            lineHeight: '1.5',
          }}
        >
          💡 <strong>¿No recibiste el mensaje o el correo es incorrecto?</strong>
          <ul style={{ margin: '0.4rem 0 0 0', paddingLeft: '1.2rem' }}>
            <li>Revisa tu carpeta de correo no deseado (Spam).</li>
            <li>
              Si escribiste mal tu correo al registrarte, puedes cerrar sesión e iniciar el registro
              nuevamente.
            </li>
          </ul>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            onClick={handleResendEmail}
            disabled={resending}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '0.85rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              borderRadius: '10px',
            }}
          >
            <RefreshCw size={18} className={resending ? 'animate-spin' : ''} />
            {resending ? 'Reenviando Correo...' : 'Reenviar Correo de Confirmación'}
          </button>

          <button
            onClick={logout}
            className="btn btn-outline"
            style={{
              width: '100%',
              padding: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              borderRadius: '10px',
              borderColor: '#cbd5e1',
              color: '#475569',
            }}
          >
            <LogOut size={18} />
            Cerrar Sesión / Corregir Correo
          </button>
        </div>
      </div>
    </div>
  );
};
