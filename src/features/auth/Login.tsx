import React, { useState, useEffect } from 'react';
import { Lightbulb, Shield, Briefcase, Scale, MapPin, Users, Gift } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { isSimulationMode, api } from '../../services/api';
import { supabase } from '../../supabaseClient';

export const Login: React.FC = () => {
  const { refreshProfile } = useAuth();

  // Estados generales del formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [rolSugerido, setRolSugerido] = useState<UserRole>('coordinador');

  // Estados de control
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estados de organizaciones para registro
  const [ongs, setOngs] = useState<{ id: string; nombre: string }[]>([]);
  const [selectedOngId, setSelectedOngId] = useState('');
  const [newOngName, setNewOngName] = useState('');

  // Control Anti-Bots (reCAPTCHA)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  // Cargar Google reCAPTCHA v2 de forma dinámica y explícita
  useEffect(() => {
    if (!isRegister || isSimulationMode) return;

    // Callbacks globales para reCAPTCHA
    (window as any).onRecaptchaSuccess = (token: string) => {
      setCaptchaToken(token);
    };
    (window as any).onRecaptchaExpired = () => {
      setCaptchaToken(null);
    };

    const renderRecaptcha = () => {
      if ((window as any).grecaptcha && document.getElementById('recaptcha-container')) {
        try {
          (window as any).grecaptcha.render('recaptcha-container', {
            sitekey:
              import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI',
            callback: 'onRecaptchaSuccess',
            'expired-callback': 'onRecaptchaExpired',
          });
        } catch (e) {
          console.warn('grecaptcha render warning:', e);
        }
      }
    };

    if (!document.getElementById('recaptcha-script')) {
      const script = document.createElement('script');
      script.id = 'recaptcha-script';
      script.src = 'https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit';
      script.async = true;
      script.defer = true;
      (window as any).onRecaptchaLoad = () => {
        renderRecaptcha();
      };
      document.body.appendChild(script);
    } else {
      // Esperar brevemente a que React monte el contenedor en el DOM
      setTimeout(renderRecaptcha, 100);
    }

    return () => {
      // Limpiar callbacks globales al desmontar
      delete (window as any).onRecaptchaSuccess;
      delete (window as any).onRecaptchaExpired;
      delete (window as any).onRecaptchaLoad;
    };
  }, [isRegister]);

  // Fetch ONGs list on mount
  useEffect(() => {
    const loadOngs = async () => {
      try {
        const list = await api.getOngs();
        setOngs(list);
        if (list.length > 0) {
          setSelectedOngId(list[0].id);
        } else {
          setSelectedOngId('new');
        }
      } catch (err) {
        console.error('Error fetching ONGs for registration:', err);
      }
    };
    loadOngs();
  }, []);

  // Manejador para login en Supabase real
  const handleRealLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await refreshProfile();
    } catch (err: any) {
      const friendlyMessage =
        err.message === '{}'
          ? 'Error de conexión o del servidor (500). Verifica que el servicio de Supabase esté activo y configurado.'
          : err.message || 'Error al iniciar sesión';
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  // Manejador para registro en Supabase real
  const handleRealRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !nombreCompleto) return;

    if (!captchaToken) {
      setError('Por favor completa el reCAPTCHA para registrarte.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      let finalOngId = selectedOngId;
      if (selectedOngId === 'new') {
        if (!newOngName.trim()) {
          throw new Error('Por favor ingresa el nombre de la organización');
        }
        const newOng = await api.createOng(newOngName.trim());
        finalOngId = newOng.id;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre_completo: nombreCompleto,
            rol: rolSugerido,
            ong_id: finalOngId,
          },
        },
      });
      if (error) throw error;

      setSuccess(
        '¡Registro exitoso! Tu cuenta ha sido creada y está pendiente de aprobación por un administrador.',
      );
      setIsRegister(false);
      setNombreCompleto('');
      setPassword('');
      setNewOngName('');
      setCaptchaToken(null);
    } catch (err: any) {
      setError(err.message || 'Error al registrar usuario');
    } finally {
      setLoading(false);
    }
  };

  // Manejador para login en simulación local (Inicio rápido con roles preconfigurados)
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
        aprobado: true, // Los preconfigurados ya están aprobados
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

  // Manejador para login simulado personalizado (por correo y contraseña)
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

      // En simulación aceptamos cualquier contraseña para este demo local
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

  // Manejador para registro simulado local
  const handleSimulatedRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !nombreCompleto) return;

    if (!captchaToken) {
      setError('Por favor completa el reCAPTCHA para registrarte.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const userId = `user-sim-${Date.now()}`;
      const profiles = JSON.parse(localStorage.getItem('cnbv_profiles') || '{}');

      // Validar si ya existe el correo
      const emailExists = Object.values(profiles).some(
        (p: any) => p.email.toLowerCase() === email.toLowerCase(),
      );
      if (emailExists) {
        setError('El correo electrónico ya está registrado.');
        setLoading(false);
        return;
      }

      let finalOngId = selectedOngId;
      if (selectedOngId === 'new') {
        if (!newOngName.trim()) {
          throw new Error('Por favor ingresa el nombre de la organización');
        }
        const newOng = await api.createOng(newOngName.trim());
        finalOngId = newOng.id;
      }

      profiles[userId] = {
        id: userId,
        email,
        nombre_completo: nombreCompleto,
        rol: rolSugerido,
        aprobado: false, // Inicia pendiente de aprobación
        ong_id: finalOngId,
        created_at: new Date().toISOString(),
      };

      localStorage.setItem('cnbv_profiles', JSON.stringify(profiles));
      setSuccess(
        '¡Registro simulado exitoso! Tu cuenta ha sido creada y está pendiente de aprobación por el Administrador.',
      );
      setIsRegister(false);
      setNombreCompleto('');
      setPassword('');
      setNewOngName('');
      setCaptchaToken(null);
    } catch (err: any) {
      setError(err.message || 'Error al simular registro');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMode = () => {
    setIsRegister(!isRegister);
    setError(null);
    setSuccess(null);
    setCaptchaToken(null);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f4f5f7 0%, #e2e8f0 100%)',
        padding: '1rem',
      }}
    >
      <div
        className="card animate-fade-in-up"
        style={{
          maxWidth: '450px',
          width: '100%',
          padding: '2.5rem',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
        }}
      >
        {/* Header con imagen corporativa MATEO */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              marginBottom: '1rem',
            }}
          >
            <img
              src="/mateo_logo.png"
              alt="Logo MATEO"
              style={{ height: '64px', width: '64px', objectFit: 'contain', borderRadius: '12px' }}
            />
            <div style={{ textAlign: 'left' }}>
              <div
                style={{
                  fontSize: '2rem',
                  fontWeight: 900,
                  color: 'var(--primary)',
                  letterSpacing: '-1px',
                  lineHeight: 1,
                }}
              >
                MATEO
              </div>
              <div
                style={{
                  fontSize: '0.7rem',
                  color: 'var(--neutral-dark)',
                  opacity: 0.7,
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                }}
              >
                Gestión Humanitaria
              </div>
            </div>
          </div>
          <h2
            style={{
              color: 'var(--primary)',
              fontFamily: 'var(--font-headings)',
              fontSize: '1.1rem',
              fontWeight: 600,
              marginTop: '0.5rem',
            }}
          >
            {isRegister ? 'Crea tu cuenta' : 'Bienvenido de nuevo'}
          </h2>
        </div>

        {error && (
          <div
            className="badge badge-danger"
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1rem',
              textAlign: 'center',
              display: 'block',
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            className="badge"
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1.5rem',
              textAlign: 'center',
              backgroundColor: 'rgba(0, 143, 166, 0.1)',
              color: 'var(--accent)',
              border: '1px solid var(--accent)',
              display: 'block',
              lineHeight: '1.4',
              fontSize: '0.8rem',
            }}
          >
            {success}
          </div>
        )}

        {isRegister ? (
          // ==================== FORMULARIO DE REGISTRO ====================
          <form onSubmit={isSimulationMode ? handleSimulatedRegister : handleRealRegister}>
            <div className="form-group">
              <label className="form-label" htmlFor="nombreCompleto">
                Nombre Completo
              </label>
              <input
                id="nombreCompleto"
                type="text"
                className="form-input"
                value={nombreCompleto}
                onChange={(e) => setNombreCompleto(e.target.value)}
                required
                disabled={loading}
                placeholder="Juan Pérez"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Correo Electrónico
              </label>
              <input
                id="email"
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                placeholder="ejemplo@cnbv.org"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                placeholder="••••••••"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" htmlFor="rolSugerido">
                Rol Solicitado
              </label>
              <select
                id="rolSugerido"
                className="form-input"
                value={rolSugerido}
                onChange={(e) => setRolSugerido(e.target.value as UserRole)}
                required
                disabled={loading}
              >
                <option value="coordinador">Coordinador de Campo (Carga de comprobantes)</option>
                <option value="auxiliar_campo">Auxiliar de Campo (Carga y Requisiciones)</option>
                <option value="auditor">Auditor (Finanzas, Conciliación y Reportes)</option>
                <option value="director">Director (Reportes, Requisición y Carga)</option>
                <option value="donante">Donante (Ver Tableros)</option>
                <option value="administrador">Administrador (Control Total)</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" htmlFor="selectedOngId">
                Organización (ONG)
              </label>
              <select
                id="selectedOngId"
                className="form-input"
                value={selectedOngId}
                onChange={(e) => setSelectedOngId(e.target.value)}
                required
                disabled={loading}
              >
                {ongs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nombre}
                  </option>
                ))}
                <option value="new">+ Registrar Nueva Organización...</option>
              </select>
            </div>

            {selectedOngId === 'new' && (
              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label" htmlFor="newOngName">
                  Nombre de la Nueva Organización
                </label>
                <input
                  id="newOngName"
                  type="text"
                  className="form-input"
                  required
                  value={newOngName}
                  onChange={(e) => setNewOngName(e.target.value)}
                  disabled={loading}
                  placeholder="Ej. Fundación Sonrisas"
                />
              </div>
            )}

            {/* Control Anti-Bots (reCAPTCHA) */}
            {isSimulationMode ? (
              <div
                className="form-group"
                style={{
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  background: '#f4f5f7',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                }}
              >
                <input
                  id="simulatedCaptcha"
                  type="checkbox"
                  checked={!!captchaToken}
                  onChange={(e) => setCaptchaToken(e.target.checked ? 'mock-token' : null)}
                  style={{
                    marginRight: '0.5rem',
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer',
                  }}
                />
                <label
                  htmlFor="simulatedCaptcha"
                  style={{
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    color: '#4b5563',
                    userSelect: 'none',
                  }}
                >
                  [Simulado] No soy un robot (reCAPTCHA v2)
                </label>
              </div>
            ) : (
              <div
                className="form-group"
                style={{
                  marginBottom: '1.5rem',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <div id="recaptcha-container"></div>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem' }}
              disabled={loading}
            >
              {loading ? 'Creando cuenta...' : 'Solicitar Registro'}
            </button>
          </form>
        ) : (
          // ==================== FORMULARIO DE ACCESO ====================
          <div>
            {isSimulationMode && (
              <div
                style={{
                  backgroundColor: 'rgba(0, 143, 166, 0.08)',
                  border: '1px solid var(--accent)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  textAlign: 'center',
                }}
              >
                <p style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600 }}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Lightbulb size={18} style={{ marginRight: '6px' }} /> Modo Demostración Activo
                  </span>
                </p>
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--neutral-dark)',
                    marginTop: '0.25rem',
                    opacity: 0.9,
                  }}
                >
                  Selecciona un rol pre-aprobado para ingresar de inmediato:
                </p>
              </div>
            )}

            {isSimulationMode ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.5rem',
                  marginBottom: '1.5rem',
                }}
              >
                <button
                  onClick={() => handleSimulatedLogin('administrador')}
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ padding: '0.6rem', fontSize: '0.8rem', gridColumn: 'span 2' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    <Shield size={16} style={{ marginRight: '6px' }} /> Super Admin (Control Total)
                  </span>
                </button>

                <button
                  onClick={() => handleSimulatedLogin('director')}
                  disabled={loading}
                  className="btn btn-secondary"
                  style={{ padding: '0.6rem', fontSize: '0.8rem' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    <Briefcase size={16} style={{ marginRight: '6px' }} /> Director
                  </span>
                </button>

                <button
                  onClick={() => handleSimulatedLogin('auditor')}
                  disabled={loading}
                  className="btn btn-outline"
                  style={{ padding: '0.6rem', fontSize: '0.8rem' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    <Scale size={16} style={{ marginRight: '6px' }} /> Auditor
                  </span>
                </button>

                <button
                  onClick={() => handleSimulatedLogin('coordinador')}
                  disabled={loading}
                  className="btn btn-outline"
                  style={{ padding: '0.6rem', fontSize: '0.8rem' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    <MapPin size={16} style={{ marginRight: '6px' }} /> Coordinador
                  </span>
                </button>

                <button
                  onClick={() => handleSimulatedLogin('auxiliar_campo')}
                  disabled={loading}
                  className="btn btn-outline"
                  style={{ padding: '0.6rem', fontSize: '0.8rem' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    <Users size={16} style={{ marginRight: '6px' }} /> Auxiliar Campo
                  </span>
                </button>

                <button
                  onClick={() => handleSimulatedLogin('donante')}
                  disabled={loading}
                  className="btn btn-outline"
                  style={{ padding: '0.6rem', fontSize: '0.8rem', gridColumn: 'span 2' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    <Gift size={16} style={{ marginRight: '6px' }} /> Donante (Solo Tableros)
                  </span>
                </button>
              </div>
            ) : null}

            {/* Formulario de Correo/Contraseña (Real o Simulado) */}
            <form onSubmit={isSimulationMode ? handleSimulatedPasswordLogin : handleRealLogin}>
              {isSimulationMode && (
                <div style={{ textAlign: 'center', margin: '1rem 0', position: 'relative' }}>
                  <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0' }} />
                  <span
                    style={{
                      position: 'absolute',
                      top: '-10px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: '#ffffff',
                      padding: '0 0.5rem',
                      fontSize: '0.7rem',
                      color: 'var(--neutral-dark)',
                      opacity: 0.7,
                    }}
                  >
                    O ingresa con cuenta creada
                  </span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  Correo Electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="ejemplo@cnbv.org"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.5rem',
                  }}
                >
                  <label className="form-label" htmlFor="password" style={{ marginBottom: 0 }}>
                    Contraseña
                  </label>
                  <Link
                    to="/forgot-password"
                    style={{
                      color: '#3b82f6',
                      fontSize: '0.85rem',
                      textDecoration: 'none',
                      fontWeight: 600,
                    }}
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
          </div>
        )}

        {/* Enlace para alternar entre Login y Registro */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button
            onClick={handleToggleMode}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              textDecoration: 'underline',
            }}
          >
            {isRegister
              ? '¿Ya tienes una cuenta? Iniciar Sesión'
              : '¿No tienes una cuenta? Regístrate aquí'}
          </button>
        </div>
      </div>
    </div>
  );
};
