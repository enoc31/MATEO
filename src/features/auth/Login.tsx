import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../context/AuthContext';
import { isSimulationMode } from '../../services/api';
import { supabase } from '../../supabaseClient';

export const Login: React.FC = () => {
  const { refreshProfile } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manejador para login en Supabase real
  const handleRealLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await refreshProfile();
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  // Manejador para simulación local (Inicio rápido con roles preconfigurados)
  const handleSimulatedLogin = async (role: UserRole) => {
    setLoading(true);
    setError(null);
    try {
      // Simulamos la creación de una sesión en el cliente de Supabase
      const mockSession = {
        user: {
          id: `user-${role}`,
          email: `${role}@cnbv.org`,
          user_metadata: { nombre_completo: `Usuario Demo (${role.toUpperCase()})`, rol: role }
        }
      };

      // Guardamos la simulación del perfil directamente en la tabla usuarios_perfiles del localStorage
      const profiles = JSON.parse(localStorage.getItem('cnbv_profiles') || '{}');
      profiles[`user-${role}`] = {
        id: `user-${role}`,
        email: `${role}@cnbv.org`,
        nombre_completo: role === 'administrador' ? 'Director Nacional CNBV' : 
                         role === 'auditor' ? 'Auditor de Finanzas CNBV' : 'Coordinador Ayuda Apure',
        rol: role,
        created_at: new Date().toISOString()
      };
      localStorage.setItem('cnbv_profiles', JSON.stringify(profiles));
      
      // Guardar sesión ficticia activa
      localStorage.setItem('cnbv_mock_session', JSON.stringify(mockSession));
      
      // Forzamos un reload para que el AuthContext capte el cambio
      window.location.reload();
    } catch (err: any) {
      setError('Error al simular inicio de sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f4f5f7 0%, #e2e8f0 100%)',
      padding: '1rem'
    }}>
      <div className="card animate-fade-in-up" style={{
        maxWidth: '450px',
        width: '100%',
        padding: '2.5rem',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
      }}>
        {/* Header con imagen corporativa CNBV */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img 
            src="https://cnbv.org/wp-content/uploads/2020/09/logo-cnbv.jpg" 
            alt="Logo CNBV" 
            style={{ height: '70px', objectFit: 'contain', marginBottom: '1rem' }}
          />
          <h2 style={{ color: 'var(--primary)', fontFamily: 'var(--font-headings)', fontSize: '1.4rem' }}>
            Auditoría de Recursos
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--neutral-dark)', opacity: 0.8, marginTop: '0.25rem' }}>
            Convención Nacional Bautista de Venezuela
          </p>
        </div>

        {error && (
          <div className="badge badge-danger" style={{ 
            width: '100%', 
            padding: '0.75rem', 
            borderRadius: 'var(--radius-sm)', 
            marginBottom: '1rem',
            textAlign: 'center',
            display: 'block'
          }}>
            {error}
          </div>
        )}

        {isSimulationMode ? (
          // Vista Modo Simulación: Permite ingresar con un clic
          <div>
            <div style={{
              backgroundColor: 'rgba(0, 143, 166, 0.08)',
              border: '1px solid var(--accent)',
              borderRadius: 'var(--radius-sm)',
              padding: '1rem',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600 }}>
                💡 Modo Demostración Activo
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--neutral-dark)', marginTop: '0.25rem', opacity: 0.9 }}>
                Para evaluar el sistema de inmediato sin configurar bases de datos, selecciona un rol de prueba:
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button 
                onClick={() => handleSimulatedLogin('administrador')} 
                disabled={loading}
                className="btn btn-primary" 
                style={{ width: '100%', padding: '0.75rem' }}
              >
                Entrar como Administrador (Director)
              </button>
              
              <button 
                onClick={() => handleSimulatedLogin('auditor')} 
                disabled={loading}
                className="btn btn-secondary" 
                style={{ width: '100%', padding: '0.75rem' }}
              >
                Entrar como Auditor (Finanzas)
              </button>

              <button 
                onClick={() => handleSimulatedLogin('coordinador')} 
                disabled={loading}
                className="btn btn-outline" 
                style={{ width: '100%', padding: '0.75rem' }}
              >
                Entrar como Coordinador de Campo
              </button>
            </div>
            
            <p style={{ 
              fontSize: '0.7rem', 
              color: 'var(--neutral-dark)', 
              opacity: 0.6, 
              textAlign: 'center',
              marginTop: '1.5rem' 
            }}>
              Los datos que cargues se guardarán localmente en el navegador.
            </p>
          </div>
        ) : (
          // Vista Login Supabase Real
          <form onSubmit={handleRealLogin}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Correo Electrónico</label>
              <input 
                id="email"
                type="email" 
                className="form-input" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={loading}
                placeholder="ejemplo@cnbv.org"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label className="form-label" htmlFor="password">Contraseña</label>
              <input 
                id="password"
                type="password" 
                className="form-input" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={loading}
                placeholder="••••••••"
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '0.75rem' }}
              disabled={loading}
            >
              {loading ? 'Iniciando sesión...' : 'Ingresar al Sistema'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
