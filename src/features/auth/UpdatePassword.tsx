import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { isSimulationMode } from '../../services/api';

export const UpdatePassword: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // El usuario está listo para cambiar su contraseña
        console.log("Sesión de recuperación iniciada");
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
          setMessage({ type: 'success', text: 'Simulación: Contraseña actualizada correctamente. Redirigiendo...' });
          setTimeout(() => navigate('/login'), 2000);
        }, 1000);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;
      
      setMessage({ type: 'success', text: '¡Contraseña actualizada correctamente! Redirigiendo al inicio de sesión...' });
      
      // Cerrar la sesión de recuperación para forzar el inicio de sesión con la nueva contraseña
      await supabase.auth.signOut();
      
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Ocurrió un error al intentar actualizar la contraseña.' });
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
        <KeyRound size={48} color="#10b981" style={{ margin: '0 auto 1.5rem auto' }} />
        <h2 style={{ color: '#1e293b', marginBottom: '0.5rem', fontSize: '1.5rem', fontWeight: 700 }}>
          Establecer Nueva Contraseña
        </h2>
        <p style={{ color: '#64748b', marginBottom: '2rem', fontSize: '0.95rem' }}>
          Por favor ingresa tu nueva contraseña a continuación.
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
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#334155', fontWeight: 600, fontSize: '0.9rem' }}>
              Nueva Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
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
          
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#334155', fontWeight: 600, fontSize: '0.9rem' }}>
              Confirmar Contraseña
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
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
            disabled={loading || !!(message && message.type === 'success')}
            style={{
              width: '100%',
              padding: '0.85rem',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Guardando...' : 'Guardar Nueva Contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
};
