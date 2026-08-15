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
  Briefcase,
  Mail,
  Check,
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
  const [cargo, setCargo] = useState('Pastor Principal');
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
      const isEkklesiaDomain = window.location.hostname.includes('ekklesia');
      const newOng = await api.createOng({
        nombre: nombreOng.trim(),
        rif_identificacion: rif.trim(),
        pais: pais.trim(),
        telefono: telefono.trim(),
        direccion: direccion.trim() || null,
        sitio_web: sitioWeb.trim() || null,
        plan: 'trial',
        estado: 'trial',
        tipo_organizacion: isEkklesiaDomain ? 'ekklesia' : 'ong',
      });

      // 2. Registrar la cuenta del Administrador en Supabase Auth
      if (!isSimulationMode) {
        const { data: authData, error: authErr } = await supabase.auth.signUp({
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

        // Asegurar la inserción/actualización directa con rol administrador y aprobado=true
        if (authData?.user) {
          const { error: profileUpsertErr } = await supabase.from('usuarios_perfiles').upsert({
            id: authData.user.id,
            email: emailAdmin.trim(),
            nombre_completo: nombreAdmin.trim(),
            rol: 'administrador',
            aprobado: true,
            ong_id: newOng.id,
          });
          if (profileUpsertErr) {
            console.warn('Aviso al sincronizar perfil de administrador:', profileUpsertErr.message);
          }
        }

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
        backgroundColor: '#f1f5f9',
        backgroundImage: 'radial-gradient(at 50% 0%, rgba(47, 90, 174, 0.06) 0px, transparent 75%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2.5rem 1rem',
      }}
    >
      {/* Header con Marca */}
      <div style={{ textAlign: 'center', marginBottom: '1.8rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
          }}
        >
          <img
            src="/mateo_logo.png"
            alt="MATEO Logo"
            style={{
              height: '54px',
              width: '54px',
              objectFit: 'contain',
              borderRadius: '14px',
              boxShadow: '0 8px 16px -4px rgba(47, 90, 174, 0.2)',
            }}
          />
          <div style={{ textAlign: 'left' }}>
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 900,
                color: 'var(--primary)',
                letterSpacing: '-0.5px',
                margin: 0,
                lineHeight: 1,
              }}
            >
              MATEO ekklesia
            </h1>
            <span
              style={{
                fontSize: '0.68rem',
                color: '#64748b',
                fontWeight: 700,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
              }}
            >
              Plataforma Financiera para Iglesias
            </span>
          </div>
        </div>
      </div>

      {/* Tarjeta Contenedora Principal (Wizard Card) */}
      <div
        className="wizard-card animate-fade-in-up"
        style={{
          maxWidth: '640px',
          width: '100%',
        }}
      >
        {/* Banner de Trial Gratis de 14 Días */}
        {step !== 4 && (
          <div className="wizard-badge-trial" style={{ marginBottom: '1.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(47, 90, 174, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)',
                }}
              >
                <Sparkles size={20} />
              </div>
              <div>
                <span
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: 'var(--primary)',
                    display: 'block',
                  }}
                >
                  Prueba Gratuita de 14 Días (Acceso Completo)
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Sin tarjeta de crédito • Cancela cuando quieras
                </span>
              </div>
            </div>
            <span
              style={{
                fontSize: '0.75rem',
                backgroundColor: 'var(--primary)',
                color: 'white',
                padding: '0.3rem 0.75rem',
                borderRadius: '20px',
                fontWeight: 700,
                letterSpacing: '0.5px',
                boxShadow: '0 2px 4px rgba(47, 90, 174, 0.25)',
              }}
            >
              Proceso Seguro
            </span>
          </div>
        )}

        {/* Indicador de Progreso del Wizard (Stepper) */}
        {step !== 4 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '2.2rem',
              position: 'relative',
            }}
          >
            {/* Paso 1 Node */}
            <div className="wizard-step-node">
              <div
                className={`wizard-step-bubble ${
                  step === 1 ? 'active' : step > 1 ? 'completed' : 'pending'
                }`}
              >
                {step > 1 ? <Check size={18} /> : 1}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: step === 1 ? 700 : 600,
                    color: step === 1 ? 'var(--primary)' : step > 1 ? '#10b981' : '#64748b',
                  }}
                >
                  Iglesia
                </span>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Datos Legales</span>
              </div>
            </div>

            <div
              style={{
                flex: 1,
                height: '3px',
                backgroundColor: step > 1 ? '#10b981' : '#e2e8f0',
                margin: '0 0.75rem',
                borderRadius: '2px',
                transition: 'background-color 0.3s ease',
              }}
            />

            {/* Paso 2 Node */}
            <div className="wizard-step-node">
              <div
                className={`wizard-step-bubble ${
                  step === 2 ? 'active' : step > 2 ? 'completed' : 'pending'
                }`}
              >
                {step > 2 ? <Check size={18} /> : 2}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: step === 2 ? 700 : 600,
                    color: step === 2 ? 'var(--primary)' : step > 2 ? '#10b981' : '#64748b',
                  }}
                >
                  Administrador
                </span>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Credenciales</span>
              </div>
            </div>

            <div
              style={{
                flex: 1,
                height: '3px',
                backgroundColor: step > 2 ? '#10b981' : '#e2e8f0',
                margin: '0 0.75rem',
                borderRadius: '2px',
                transition: 'background-color 0.3s ease',
              }}
            />

            {/* Paso 3 Node */}
            <div className="wizard-step-node">
              <div className={`wizard-step-bubble ${step === 3 ? 'active' : 'pending'}`}>3</div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: step === 3 ? 700 : 600,
                    color: step === 3 ? 'var(--primary)' : '#64748b',
                  }}
                >
                  Verificación
                </span>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Seguridad</span>
              </div>
            </div>
          </div>
        )}

        {/* Mensaje de Error */}
        {error && (
          <div
            style={{
              padding: '0.85rem 1.2rem',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              color: '#dc2626',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '1.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* ========================================================================= */}
        {/* PASO 1: DATOS LEGALES DE LA ONG                                           */}
        {/* ========================================================================= */}
        {step === 1 && (
          <form
            noValidate
            onSubmit={handleNextFromStep1}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
          >
            <div
              style={{
                borderBottom: '1px solid #f1f5f9',
                paddingBottom: '0.75rem',
                marginBottom: '0.5rem',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.2rem',
                  color: 'var(--primary)',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Building2 size={22} /> Información Legal de la Iglesia
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
                Ingresa los datos institucionales de tu iglesia o ministerio para configurar su
                espacio.
              </p>
            </div>

            {/* Nombre Legal */}
            <div className="form-field">
              <label className="form-field-label">
                Nombre Legal de la Iglesia / Ministerio{' '}
                <span className="form-field-required">*</span>
              </label>
              <div className="input-with-icon">
                <Building2 size={18} className="input-icon" />
                <input
                  type="text"
                  className="form-input-premium"
                  placeholder="Ej. Iglesia Evangelica Gracia y Verdad"
                  value={nombreOng}
                  onChange={(e) => setNombreOng(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* RIF y País */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-field">
                <label className="form-field-label">
                  RIF / Registro Legal <span className="form-field-required">*</span>
                </label>
                <div className="input-with-icon">
                  <FileText size={18} className="input-icon" />
                  <input
                    type="text"
                    className="form-input-premium"
                    placeholder="J-12345678-9"
                    value={rif}
                    onChange={(e) => setRif(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-field">
                <label className="form-field-label">
                  País de Operación <span className="form-field-required">*</span>
                </label>
                <div className="input-with-icon">
                  <Globe size={18} className="input-icon" />
                  <input
                    type="text"
                    className="form-input-premium"
                    placeholder="Venezuela"
                    value={pais}
                    onChange={(e) => setPais(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Teléfono y Sitio Web */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-field">
                <label className="form-field-label">
                  Teléfono Oficial de Contacto <span className="form-field-required">*</span>
                </label>
                <div className="input-with-icon">
                  <Phone size={18} className="input-icon" />
                  <input
                    type="tel"
                    className="form-input-premium"
                    placeholder="+58 412 1234567"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-field">
                <label className="form-field-label">Sitio Web / Red Social (Opcional)</label>
                <div className="input-with-icon">
                  <Globe size={18} className="input-icon" />
                  <input
                    type="text"
                    className="form-input-premium"
                    placeholder="https://iglesia.org o @iglesia"
                    value={sitioWeb}
                    onChange={(e) => setSitioWeb(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Dirección */}
            <div className="form-field">
              <label className="form-field-label">Dirección Física Oficial (Opcional)</label>
              <div className="input-with-icon">
                <MapPin size={18} className="input-icon" />
                <input
                  type="text"
                  className="form-input-premium"
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
                marginTop: '1.8rem',
                alignItems: 'center',
              }}
            >
              <Link
                to="/login"
                style={{
                  color: '#64748b',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
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
                  padding: '0.85rem 1.75rem',
                  fontWeight: 700,
                  borderRadius: '10px',
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
            noValidate
            onSubmit={handleNextFromStep2}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
          >
            <div
              style={{
                borderBottom: '1px solid #f1f5f9',
                paddingBottom: '0.75rem',
                marginBottom: '0.5rem',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.2rem',
                  color: 'var(--primary)',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <User size={22} /> Perfil del Administrador Principal
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
                Establece las credenciales maestras para acceder y administrar tu iglesia en MATEO
                ekklesia.
              </p>
            </div>

            {/* Nombre Completo */}
            <div className="form-field">
              <label className="form-field-label">
                Nombre Completo del Administrador <span className="form-field-required">*</span>
              </label>
              <div className="input-with-icon">
                <User size={18} className="input-icon" />
                <input
                  type="text"
                  className="form-input-premium"
                  placeholder="Ej. María Rodríguez"
                  value={nombreAdmin}
                  onChange={(e) => setNombreAdmin(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Cargo y Email */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-field">
                <label className="form-field-label">
                  Cargo en la Iglesia <span className="form-field-required">*</span>
                </label>
                <div className="input-with-icon">
                  <Briefcase size={18} className="input-icon" />
                  <input
                    type="text"
                    className="form-input-premium"
                    placeholder="Pastor Principal / Tesorero / Diácono"
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-field">
                <label className="form-field-label">
                  Correo Electrónico Institucional <span className="form-field-required">*</span>
                </label>
                <div className="input-with-icon">
                  <Mail size={18} className="input-icon" />
                  <input
                    type="email"
                    className="form-input-premium"
                    placeholder="pastor@iglesia.org"
                    value={emailAdmin}
                    onChange={(e) => setEmailAdmin(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Contraseñas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-field">
                <label className="form-field-label">
                  Contraseña de Acceso <span className="form-field-required">*</span>
                </label>
                <div className="input-with-icon">
                  <Lock size={18} className="input-icon" />
                  <input
                    type="password"
                    className="form-input-premium"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-field">
                <label className="form-field-label">
                  Confirmar Contraseña <span className="form-field-required">*</span>
                </label>
                <div className="input-with-icon">
                  <Lock size={18} className="input-icon" />
                  <input
                    type="password"
                    className="form-input-premium"
                    placeholder="Repite la contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.8rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setStep(1)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  borderRadius: '10px',
                }}
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
                  padding: '0.85rem 1.75rem',
                  fontWeight: 700,
                  borderRadius: '10px',
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
            style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
          >
            <div
              style={{
                borderBottom: '1px solid #f1f5f9',
                paddingBottom: '0.75rem',
                marginBottom: '0.5rem',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.2rem',
                  color: 'var(--primary)',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <ShieldCheck size={22} /> Verificación de Seguridad
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
                Revisión anti-spam y declaración jurada para activar tu Trial de 14 días.
              </p>
            </div>

            {/* Resumen del Registro */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.2rem',
                fontSize: '0.85rem',
              }}
            >
              <strong
                style={{
                  color: 'var(--primary)',
                  display: 'block',
                  marginBottom: '0.75rem',
                  fontSize: '0.9rem',
                }}
              >
                Resumen de tu Registro:
              </strong>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                  color: '#334155',
                }}
              >
                <div>
                  <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem' }}>
                    IGLESIA / MINISTERIO
                  </span>
                  <strong>{nombreOng}</strong>
                </div>
                <div>
                  <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem' }}>
                    RIF / FISCAL
                  </span>
                  <strong>{rif}</strong>
                </div>
                <div>
                  <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem' }}>
                    PAÍS & TELÉFONO
                  </span>
                  <strong>
                    {pais} ({telefono})
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem' }}>
                    ADMINISTRADOR
                  </span>
                  <strong>
                    {nombreAdmin} ({cargo})
                  </strong>
                </div>
              </div>
            </div>

            {/* Protección Anti-Bot reCAPTCHA */}
            {!isSimulationMode && (
              <div>
                <label className="form-field-label" style={{ marginBottom: '0.5rem' }}>
                  Verificación Anti-Bot (reCAPTCHA) <span className="form-field-required">*</span>
                </label>
                <div
                  id="wizard-recaptcha-container"
                  style={{ display: 'flex', justifyContent: 'center' }}
                ></div>
              </div>
            )}

            {/* Declaración de Responsabilidad Legal */}
            <label
              className={`checkbox-card-container ${declaracionLegal ? 'checked' : ''}`}
              htmlFor="declaracionLegal"
            >
              <input
                type="checkbox"
                id="declaracionLegal"
                checked={declaracionLegal}
                onChange={(e) => setDeclaracionLegal(e.target.checked)}
                style={{ marginTop: '0.2rem', width: '20px', height: '20px', cursor: 'pointer' }}
                required
              />
              <span
                style={{
                  fontSize: '0.82rem',
                  color: 'var(--neutral-dark)',
                  lineHeight: '1.5',
                  cursor: 'pointer',
                }}
              >
                Declaro bajo fe de juramento que la información legal de la iglesia es verídica y
                que poseo las facultades para representar a la organización y activar su espacio en
                MATEO ekklesia.
              </span>
            </label>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.8rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setStep(2)}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  borderRadius: '10px',
                }}
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
                  gap: '0.6rem',
                  padding: '0.85rem 1.8rem',
                  fontWeight: 700,
                  borderRadius: '10px',
                  boxShadow: '0 4px 12px rgba(47, 90, 174, 0.25)',
                }}
              >
                {loading ? (
                  <span>Creando Organización...</span>
                ) : (
                  <>
                    Registrar Iglesia e Iniciar Trial <Sparkles size={18} />
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
                marginBottom: '1.25rem',
                color: '#10b981',
              }}
            >
              <CheckCircle2 size={80} strokeWidth={1.5} />
            </div>

            <h2
              style={{
                color: 'var(--primary)',
                fontWeight: 900,
                fontSize: '1.65rem',
                margin: 0,
                letterSpacing: '-0.5px',
              }}
            >
              ¡Iglesia Registrada con Éxito!
            </h2>

            <p
              style={{
                fontSize: '0.95rem',
                color: 'var(--neutral-dark)',
                marginTop: '0.8rem',
                lineHeight: '1.6',
              }}
            >
              Tu iglesia <strong>{createdOngData.nombre}</strong> ha sido activada con una prueba
              gratuita de 14 días.
            </p>

            <div
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '14px',
                padding: '1.4rem',
                margin: '1.8rem 0',
                fontSize: '0.88rem',
                color: 'var(--neutral-dark)',
                textAlign: 'left',
              }}
            >
              <strong
                style={{
                  color: '#047857',
                  display: 'block',
                  marginBottom: '0.6rem',
                  fontSize: '0.95rem',
                }}
              >
                Detalles de tu Período de Prueba (Trial):
              </strong>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: '1.2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                }}
              >
                <li>
                  <strong>Plan Asignado:</strong> Prueba Completa (14 días).
                </li>
                <li>
                  <strong>Fecha de Vencimiento:</strong> {createdOngData.trialEndsAt}.
                </li>
                <li>
                  <strong>Tu Rol:</strong> Administrador Principal de la Iglesia.
                </li>
              </ul>
            </div>

            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.2rem',
                fontSize: '0.85rem',
                color: '#475569',
                marginBottom: '2rem',
                textAlign: 'left',
                lineHeight: '1.5',
              }}
            >
              📩 <strong>Verificación de Correo Electrónico:</strong> Hemos enviado un enlace de
              confirmación a <strong>{emailAdmin}</strong>. Por favor revisa tu bandeja de entrada y
              haz clic en el enlace para habilitar tu cuenta e ingresar al sistema.
            </div>

            <button
              onClick={() => navigate('/login')}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.9rem',
                fontWeight: 700,
                fontSize: '1rem',
                borderRadius: '10px',
                boxShadow: '0 4px 12px rgba(47, 90, 174, 0.25)',
              }}
            >
              Ir al Inicio de Sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
