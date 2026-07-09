import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { isSimulationMode } from '../../services/api';

export const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    setMessage(null);

    try {
      if (isSimulationMode) {
        setTimeout(() => {
          setMessage({ type: 'success', text: 'Simulación: Si el correo existe, recibirás instrucciones para restablecer tu contraseña.' });
          setLoading(false);
        }, 1000);
        return;
      }

      // El correo se enviará con un enlace que redirigirá a /update-password
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Si el correo existe, recibirás instrucciones para restablecer tu contraseña.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Ocurrió un error al intentar enviar el correo.' });
    } finally {
      if (!isSimulationMode) setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#f4f5f7',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        background: 'white',
        padding: '3rem 2.5rem',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
        width: '100%',
        maxWidth: '450px',
        textAlign: 'center'
      }}>
        <Shield size={48} color="#1e3a8a" style={{ margin: '0 auto 1.5rem auto' }} />
        <h2 style={{ color: '#1e293b', marginBottom: '0.5rem', fontSize: '1.5rem', fontWeight: 700 }}>
          Recuperar Contraseña
        </h2>
        <p style={{ color: '#64748b', marginBottom: '2rem', fontSize: '0.95rem' }}>
          Ingresa tu correo electrónico y te enviaremos un enlace para que puedas crear una contraseña nueva.
        </p>

        {message && (
          <div style={{
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            backgroundColor: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: message.type === 'success' ? '#065f46' : '#991b1b',
            fontSize: '0.9rem',
            textAlign: 'left'
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#334155', fontWeight: 600, fontSize: '0.9rem' }}>
              Correo Electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '1rem',
                outline: 'none'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.85rem',
              backgroundColor: '#1e3a8a',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              marginBottom: '1.5rem'
            }}
          >
            {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
          </button>
        </form>

        <div style={{ marginTop: '1rem' }}>
          <Link to="/login" style={{ 
            color: '#3b82f6', 
            textDecoration: 'none', 
            fontWeight: 600, 
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}>
            <ArrowLeft size={16} /> Volver al Inicio de Sesión
          </Link>
        </div>
      </div>
    </div>
  );
};
