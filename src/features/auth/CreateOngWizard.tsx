import React, { useState, useEffect } from 'react';
import {
  Building2,
  User,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Lock,
  Sparkles,
  Globe,
  Phone,
  MapPin,
  FileText,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api, isSimulationMode } from '../../services/api';
import { supabase } from '../../supabaseClient';

interface CustomWindow extends Window {
  onWizardRecaptchaSuccess?: (token: string) => void;
  onWizardRecaptchaExpired?: () => void;
  onWizardRecaptchaLoad?: () => void;
  grecaptcha?: {
    render: (container: string | HTMLElement, options: Record<string, string>) => void;
  };
}

const customWindow = window as CustomWindow;

export const CreateOngWizard: React.FC = () => {
  const navigate = useNavigate();

  // Paso actual (1: ONG, 2: Admin, 3: Verificación, 4: Éxito)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Paso 1: Datos Legales de la ONG
  const [nombreOng, setNombreOng] = useState('');
  const [rif, setRif] = useState('');
  const [pais, setPais] = useState('Venezuela');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [sitioWeb, setSitioWeb] = useState('');

  // Paso 2: Datos del Administrador
  const [nombreAdmin, setNombreAdmin] = useState('');
  const [cargo, setCargo] = useState('Director Ejecutivo');
  const [emailAdmin, setEmailAdmin] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Paso 3: Verificación Anti-Bot & Legal
  const [declaracionLegal, setDeclaracionLegal] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  // Estados de interfaz
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOngData, setCreatedOngData] = useState<{
    id: string;
    nombre: string;
    trialEndsAt: string;
  } | null>(null);

  // Carga explícita de Google reCAPTCHA v2 en el Paso 3
  useEffect(() => {
    if (step !== 3 || isSimulationMode) return;

    customWindow.onWizardRecaptchaSuccess = (token: string) => {
      setCaptchaToken(token);
    };
    customWindow.onWizardRecaptchaExpired = () => {
      setCaptchaToken(null);
    };

    const renderRecaptcha = () => {
      if (customWindow.grecaptcha && document.getElementById('wizard-recaptcha-container')) {
        try {
          customWindow.grecaptcha.render('wizard-recaptcha-container', {
            sitekey:
              import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI',
            callback: 'onWizardRecaptchaSuccess',
            'expired-callback': 'onWizardRecaptchaExpired',
          });
        } catch (e) {
          console.warn('grecaptcha render warning:', e);
        }
      }
    };

    if (!document.getElementById('recaptcha-script')) {
      const script = document.createElement('script');
      script.id = 'recaptcha-script';
      script.src =
        'https://www.google.com/recaptcha/api.js?onload=onWizardRecaptchaLoad&render=explicit';
      script.async = true;
      script.defer = true;
      customWindow.onWizardRecaptchaLoad = () => {
        renderRecaptcha();
      };
      document.body.appendChild(script);
    } else {
      setTimeout(renderRecaptcha, 100);
    }

    return () => {
      delete customWindow.onWizardRecaptchaSuccess;
      delete customWindow.onWizardRecaptchaExpired;
      delete customWindow.onWizardRecaptchaLoad;
    };
  }, [step]);

  // Validaciones del Paso 1
  const validateStep1 = () => {
    setError(null);
    if (!nombreOng.trim()) {
      setError('Por favor ingresa el nombre legal de la organización.');
      return false;
    }
    if (!rif.trim()) {
      setError('Por favor ingresa el RIF o Identificación Fiscal de la ONG.');
      return false;
    }
    if (!telefono.trim()) {
      setError('Por favor ingresa un teléfono oficial de contacto.');
      return false;
    }
    return true;
  };

  // Validaciones del Paso 2
  const validateStep2 = () => {
    setError(null);
    if (!nombreAdmin.trim()) {
      setError('Por favor ingresa el nombre completo del administrador.');
      return false;
    }
    if (!emailAdmin.trim() || !emailAdmin.includes('@')) {
      setError('Por favor ingresa un correo electrónico válido.');
      return false;
    }
    if (!password || password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return false;
    }
    return true;
  };

  const handleNextFromStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep1()) setStep(2);
  };

  const handleNextFromStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep2()) setStep(3);
  };

  // Enviar el registro completo
  const handleSubmitFinal = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!declaracionLegal) {
      setError('Debes aceptar la declaración de responsabilidad legal para continuar.');
      return;
    }

    if (!isSimulationMode && !captchaToken) {
      setError('Por favor completa el reCAPTCHA de verificación anti-bot.');
      return;
    }

    setLoading(true);
    try {
      // 1. Crear la ONG con datos legales y trial de 14 días
      const newOng = await api.createOng({
        nombre: nombreOng.trim(),
        rif_identificacion: rif.trim(),
        pais: pais.trim(),
        telefono: telefono.trim(),
        direccion: direccion.trim() || null,
        sitio_web: sitioWeb.trim() || null,
        plan: 'trial',
        estado: 'trial',
      });

      // 2. Registrar la cuenta del Administrador en Supabase Auth
      if (!isSimulationMode) {
        const { error: authErr } = await supabase.auth.signUp({
          email: emailAdmin.trim(),
          password,
          options: {
            data: {
              nombre_completo: nombreAdmin.trim(),
              cargo: cargo.trim(),
              rol: 'administrador',
              aprobado: true, // El primer creador de la ONG es aprobado automáticamente como su Admin
              ong_id: newOng.id,
            },
          },
        });
        if (authErr) throw authErr;

        // 3. Notificar al Super Admin vía Edge Function
        supabase.functions
          .invoke('notify-registration', {
            body: {
              email: emailAdmin.trim(),
              nombre: nombreAdmin.trim(),
              cargo: cargo.trim(),
              ongNombre: nombreOng.trim(),
              rif: rif.trim(),
              pais,
              telefono,
              plan: 'trial',
              trialEndsAt: newOng.trial_ends_at,
              esNuevoTenant: true,
            },
          })
          .catch((err) => console.error('Error enviando notificación al Super Admin:', err));
      }

      // Guardar información para la pantalla de confirmación
      const trialEndsFormatted = newOng.trial_ends_at
        ? new Date(newOng.trial_ends_at).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        : '14 días a partir de hoy';

      setCreatedOngData({
        id: newOng.id,
        nombre: newOng.nombre,
        trialEndsAt: trialEndsFormatted,
      });

      setStep(4); // Pasar al paso final de éxito
    } catch (err: any) {
      console.error('Error al registrar la nueva ONG:', err);
      setError(err.message || 'Ocurrió un error al procesar el registro de la organización.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f4f5f7',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
      }}
    >
      {/* Header con Marca */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <img
          src="/mateo_logo.png"
          alt="MATEO Logo"
          style={{
            height: '56px',
            width: '56px',
            objectFit: 'contain',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          }}
        />
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            color: 'var(--primary)',
            marginTop: '0.5rem',
            margin: 0,
          }}
        >
          MATEO ONG
        </h1>
        <p
          style={{
            fontSize: '0.85rem',
            color: 'var(--neutral-dark)',
            opacity: 0.8,
            marginTop: '0.2rem',
          }}
        >
          Auditoría, Donaciones & Transparencia Financiera
        </p>
      </div>

      {/* Tarjeta Contenedora Principal */}
      <div
        className="card animate-fade-in-up"
        style={{
          maxWidth: '620px',
          width: '100%',
          padding: '2.5rem',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.08), 0 10px 10px -5px rgba(0,0,0,0.02)',
          backgroundColor: '#ffffff',
        }}
      >
        {/* Banner de Trial Gratis de 14 Días */}
        {step !== 4 && (
          <div
            style={{
              backgroundColor: 'rgba(0, 143, 166, 0.08)',
              border: '1px solid rgba(0, 143, 166, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Sparkles size={20} color="var(--primary)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}>
                Prueba Gratuita de 14 Días (Acceso Completo)
              </span>
            </div>
            <span
              style={{
                fontSize: '0.75rem',
                backgroundColor: 'var(--primary)',
                color: 'white',
                padding: '0.2rem 0.6rem',
                borderRadius: '12px',
                fontWeight: 700,
              }}
            >
              Sin Tarjeta
            </span>
          </div>
        )}

        {/* Indicador de Progreso del Wizard */}
        {step !== 4 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '2rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: step >= 1 ? 'var(--primary)' : '#e2e8f0',
                  color: step >= 1 ? '#ffffff' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                }}
              >
                1
              </div>
              <span
                style={{
                  fontSize: '0.82rem',
                  fontWeight: step === 1 ? 700 : 500,
                  color: step === 1 ? 'var(--primary)' : '#64748b',
                }}
              >
                ONG Legal
              </span>
            </div>

            <div
              style={{ flex: 1, height: '2px', backgroundColor: '#e2e8f0', margin: '0 0.5rem' }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: step >= 2 ? 'var(--primary)' : '#e2e8f0',
                  color: step >= 2 ? '#ffffff' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                }}
              >
                2
              </div>
              <span
                style={{
                  fontSize: '0.82rem',
                  fontWeight: step === 2 ? 700 : 500,
                  color: step === 2 ? 'var(--primary)' : '#64748b',
                }}
              >
                Administrador
              </span>
            </div>

            <div
              style={{ flex: 1, height: '2px', backgroundColor: '#e2e8f0', margin: '0 0.5rem' }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: step >= 3 ? 'var(--primary)' : '#e2e8f0',
                  color: step >= 3 ? '#ffffff' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                }}
              >
                3
              </div>
              <span
                style={{
                  fontSize: '0.82rem',
                  fontWeight: step === 3 ? 700 : 500,
                  color: step === 3 ? 'var(--primary)' : '#64748b',
                }}
              >
                Verificación
              </span>
            </div>
          </div>
        )}

        {/* Mensaje de Error */}
        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#dc2626',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '1.5rem',
            }}
          >
            {error}
          </div>
        )}

        {/* ========================================================================= */}
        {/* PASO 1: DATOS LEGALES DE LA ONG                                           */}
        {/* ========================================================================= */}
        {step === 1 && (
          <form
            noValidate
            onSubmit={handleNextFromStep1}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}
          >
            <div
              style={{ borderBottom: '1px solid #e2e8f0', pb: '0.5rem', marginBottom: '0.5rem' }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.15rem',
                  color: 'var(--primary)',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Building2 size={20} /> Datos Legales de la Organización
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                Información oficial de la ONG para la auditoría y facturación.
              </p>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  marginBottom: '0.3rem',
                  color: 'var(--neutral-dark)',
                }}
              >
                Nombre Legal de la ONG *
              </label>
              <input
                type="text"
                className="input"
                placeholder="Ej. Fundación Manos de Esperanza"
                value={nombreOng}
                onChange={(e) => setNombreOng(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '0.3rem',
                    color: 'var(--neutral-dark)',
                  }}
                >
                  RIF / Identificación Fiscal *
                </label>
                <div style={{ position: 'relative' }}>
                  <FileText
                    size={16}
                    style={{ position: 'absolute', left: '10px', top: '12px', color: '#94a3b8' }}
                  />
                  <input
                    type="text"
                    className="input"
                    style={{ paddingLeft: '2.2rem' }}
                    placeholder="J-12345678-9"
                    value={rif}
                    onChange={(e) => setRif(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '0.3rem',
                    color: 'var(--neutral-dark)',
                  }}
                >
                  País de Operación *
                </label>
                <div style={{ position: 'relative' }}>
                  <Globe
                    size={16}
                    style={{ position: 'absolute', left: '10px', top: '12px', color: '#94a3b8' }}
                  />
                  <input
                    type="text"
                    className="input"
                    style={{ paddingLeft: '2.2rem' }}
                    placeholder="Venezuela"
                    value={pais}
                    onChange={(e) => setPais(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '0.3rem',
                    color: 'var(--neutral-dark)',
                  }}
                >
                  Teléfono Oficial *
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone
                    size={16}
                    style={{ position: 'absolute', left: '10px', top: '12px', color: '#94a3b8' }}
                  />
                  <input
                    type="tel"
                    className="input"
                    style={{ paddingLeft: '2.2rem' }}
                    placeholder="+58 412 1234567"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '0.3rem',
                    color: 'var(--neutral-dark)',
                  }}
                >
                  Sitio Web / Red Social (Opcional)
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="https://fundacion.org"
                  value={sitioWeb}
                  onChange={(e) => setSitioWeb(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  marginBottom: '0.3rem',
                  color: 'var(--neutral-dark)',
                }}
              >
                Dirección Física Oficial (Opcional)
              </label>
              <div style={{ position: 'relative' }}>
                <MapPin
                  size={16}
                  style={{ position: 'absolute', left: '10px', top: '12px', color: '#94a3b8' }}
                />
                <input
                  type="text"
                  className="input"
                  style={{ paddingLeft: '2.2rem' }}
                  placeholder="Av. Principal, Edificio Sede, Piso 2"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '1.5rem',
                alignItems: 'center',
              }}
            >
              <Link
                to="/login"
                style={{ color: '#64748b', fontSize: '0.85rem', textDecoration: 'none' }}
              >
                Volver al Login
              </Link>

              <button
                type="submit"
                className="btn btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                }}
              >
                Siguiente: Administrador <ArrowRight size={18} />
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* PASO 2: DATOS DEL ADMINISTRADOR PRINCIPAL                                  */}
        {/* ========================================================================= */}
        {step === 2 && (
          <form
            onSubmit={handleNextFromStep2}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}
          >
            <div
              style={{ borderBottom: '1px solid #e2e8f0', pb: '0.5rem', marginBottom: '0.5rem' }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.15rem',
                  color: 'var(--primary)',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <User size={20} /> Datos del Administrador Principal
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                Tus credenciales para gestionar el espacio de tu ONG y tu equipo.
              </p>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  marginBottom: '0.3rem',
                  color: 'var(--neutral-dark)',
                }}
              >
                Nombre Completo del Administrador *
              </label>
              <input
                type="text"
                className="input"
                placeholder="Ej. María Rodríguez"
                value={nombreAdmin}
                onChange={(e) => setNombreAdmin(e.target.value)}
                required
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  marginBottom: '0.3rem',
                  color: 'var(--neutral-dark)',
                }}
              >
                Cargo u Ocupación en la ONG *
              </label>
              <input
                type="text"
                className="input"
                placeholder="Director Ejecutivo / Administrador General"
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                required
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  marginBottom: '0.3rem',
                  color: 'var(--neutral-dark)',
                }}
              >
                Correo Electrónico Institucional *
              </label>
              <input
                type="email"
                className="input"
                placeholder="direccion@fundacion.org"
                value={emailAdmin}
                onChange={(e) => setEmailAdmin(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '0.3rem',
                    color: 'var(--neutral-dark)',
                  }}
                >
                  Contraseña *
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={16}
                    style={{ position: 'absolute', left: '10px', top: '12px', color: '#94a3b8' }}
                  />
                  <input
                    type="password"
                    className="input"
                    style={{ paddingLeft: '2.2rem' }}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '0.3rem',
                    color: 'var(--neutral-dark)',
                  }}
                >
                  Confirmar Contraseña *
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={16}
                    style={{ position: 'absolute', left: '10px', top: '12px', color: '#94a3b8' }}
                  />
                  <input
                    type="password"
                    className="input"
                    style={{ paddingLeft: '2.2rem' }}
                    placeholder="Repite la contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setStep(1)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <ArrowLeft size={18} /> Atrás
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                }}
              >
                Siguiente: Verificación <ArrowRight size={18} />
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* PASO 3: VERIFICACIÓN ANTI-BOT Y LEGAL                                     */}
        {/* ========================================================================= */}
        {step === 3 && (
          <form
            onSubmit={handleSubmitFinal}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}
          >
            <div
              style={{ borderBottom: '1px solid #e2e8f0', pb: '0.5rem', marginBottom: '0.5rem' }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.15rem',
                  color: 'var(--primary)',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <ShieldCheck size={20} /> Verificación de Seguridad y Confirmación
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                Revisión anti-spam y declaración de responsabilidad legal.
              </p>
            </div>

            {/* Resumen del Registro */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                fontSize: '0.85rem',
              }}
            >
              <strong style={{ color: 'var(--primary)', display: 'block', marginBottom: '0.5rem' }}>
                Resumen de tu Registro:
              </strong>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.5rem',
                  color: 'var(--neutral-dark)',
                }}
              >
                <div>
                  <strong>ONG:</strong> {nombreOng}
                </div>
                <div>
                  <strong>RIF:</strong> {rif}
                </div>
                <div>
                  <strong>País:</strong> {pais}
                </div>
                <div>
                  <strong>Teléfono:</strong> {telefono}
                </div>
                <div>
                  <strong>Admin:</strong> {nombreAdmin} ({cargo})
                </div>
                <div>
                  <strong>Email:</strong> {emailAdmin}
                </div>
              </div>
            </div>

            {/* Protección Anti-Bot reCAPTCHA */}
            {!isSimulationMode && (
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '0.5rem',
                    color: 'var(--neutral-dark)',
                  }}
                >
                  Verificación Anti-Bot (reCAPTCHA) *
                </label>
                <div
                  id="wizard-recaptcha-container"
                  style={{ display: 'flex', justifyContent: 'center' }}
                ></div>
              </div>
            )}

            {/* Declaración de Responsabilidad Legal */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                marginTop: '0.5rem',
              }}
            >
              <input
                type="checkbox"
                id="declaracionLegal"
                checked={declaracionLegal}
                onChange={(e) => setDeclaracionLegal(e.target.checked)}
                style={{ marginTop: '0.25rem', width: '18px', height: '18px', cursor: 'pointer' }}
                required
              />
              <label
                htmlFor="declaracionLegal"
                style={{
                  fontSize: '0.82rem',
                  color: 'var(--neutral-dark)',
                  lineHeight: '1.5',
                  cursor: 'pointer',
                }}
              >
                Declaro bajo fe de juramento que la información legal de la ONG ingresada es
                verídica y que poseo la facultad de representar legalmente a la organización para su
                alta en MATEO.
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setStep(2)}
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <ArrowLeft size={18} /> Atrás
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  fontWeight: 700,
                }}
              >
                {loading ? (
                  <span>Creando Organización...</span>
                ) : (
                  <>
                    Crear ONG e Iniciar Trial <Sparkles size={18} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* PASO 4: CONFIRMACIÓN Y ÉXITO                                              */}
        {/* ========================================================================= */}
        {step === 4 && createdOngData && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '1rem',
                color: '#10b981',
              }}
            >
              <CheckCircle2 size={72} strokeWidth={1.5} />
            </div>

            <h2 style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '1.5rem', margin: 0 }}>
              ¡Organización Creada Exitosamente!
            </h2>

            <p
              style={{
                fontSize: '0.95rem',
                color: 'var(--neutral-dark)',
                marginTop: '0.8rem',
                lineHeight: '1.6',
              }}
            >
              Tu organización <strong>{createdOngData.nombre}</strong> ha sido registrada con una
              prueba gratuita de 14 días.
            </p>

            <div
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '1.2rem',
                margin: '1.5rem 0',
                fontSize: '0.85rem',
                color: 'var(--neutral-dark)',
                textAlign: 'left',
              }}
            >
              <strong style={{ color: '#047857', display: 'block', marginBottom: '0.5rem' }}>
                Detalles de tu Período de Prueba (Trial):
              </strong>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: '1.2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.3rem',
                }}
              >
                <li>
                  <strong>Plan Activo:</strong> Prueba Completa (14 días).
                </li>
                <li>
                  <strong>Fecha de Vencimiento:</strong> {createdOngData.trialEndsAt}.
                </li>
                <li>
                  <strong>Tu Rol:</strong> Administrador Principal de la ONG.
                </li>
              </ul>
            </div>

            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                fontSize: '0.82rem',
                color: '#64748b',
                marginBottom: '2rem',
                textAlign: 'left',
              }}
            >
              📩 <strong>Verificación de Correo Electrónico:</strong> Hemos enviado un mensaje de
              confirmación a <strong>{emailAdmin}</strong>. Por favor haz clic en el enlace del
              correo para validar tu cuenta e ingresar al sistema.
            </div>

            <button
              onClick={() => navigate('/login')}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.85rem', fontWeight: 700, fontSize: '1rem' }}
            >
              Ir al Inicio de Sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
