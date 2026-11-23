import React, { useState, useEffect } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api, isSimulationMode } from '../../services/api';
import { uploadToGCS } from '../../services/storage';
import { supabase } from '../../supabaseClient';
import { LocationSelector } from '../../components/LocationSelector';
import { formatFullAddress } from '../../data/venezuelaLocations';
import './CreateOngWizard.css';

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

  // Paso 1: Datos Fundamentales de la Iglesia / Organización
  const [nombreOng, setNombreOng] = useState('');
  const [telefono, setTelefono] = useState('');

  // Ubicación Estandarizada (Venezuela)
  const [estadoSel, setEstadoSel] = useState('Distrito Capital');
  const [municipioSel, setMunicipioSel] = useState('Libertador');
  const [parroquiaSel, setParroquiaSel] = useState('Candelaria');
  const [direccionDetalle, setDireccionDetalle] = useState('');

  // Paso 2: Identificación Legal Flexible & Administrador
  const [tipoIdentificacion, setTipoIdentificacion] = useState<'RIF' | 'CI'>('RIF');
  const [numIdentificacion, setNumIdentificacion] = useState('');
  const [nombreResponsableLegal, setNombreResponsableLegal] = useState('');

  const [nombreAdmin, setNombreAdmin] = useState('');
  const [cargo, setCargo] = useState('Pastor Principal');
  const [emailAdmin, setEmailAdmin] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Paso 3: Identidad Eclesiástica, Marca & Verificación
  const [denominacion, setDenominacion] = useState('Bautista');
  const [afiliacion, setAfiliacion] = useState('Consejo Evangélico de Venezuela');
  const [logoUrl, setLogoUrl] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
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

  // Validaciones del Paso 1 (Datos Fundamentales de la Iglesia)
  const validateStep1 = () => {
    setError(null);
    if (!nombreOng.trim()) {
      setError('Por favor ingresa el nombre de la Iglesia o Congregación.');
      return false;
    }
    if (!direccionDetalle.trim()) {
      setError('Por favor ingresa la dirección del Templo (calle, sector, número).');
      return false;
    }
    return true;
  };

  // Validaciones del Paso 2 (Identificación Legal Flexible & Administrador)
  const validateStep2 = () => {
    setError(null);
    if (!nombreAdmin.trim()) {
      setError('Por favor ingresa el nombre completo del pastor o administrador.');
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

  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const res = await uploadToGCS(file);
      if (res && res.url) {
        setLogoUrl(res.url);
      }
    } catch (err) {
      console.warn('Error al subir logo:', err);
    } finally {
      setUploadingLogo(false);
    }
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
      setError('Debes aceptar la declaración de responsabilidad para continuar.');
      return;
    }

    if (!isSimulationMode && !captchaToken) {
      setError('Por favor completa el reCAPTCHA de verificación anti-bot.');
      return;
    }

    setLoading(true);
    try {
      const fullAddress = formatFullAddress(
        estadoSel,
        municipioSel,
        parroquiaSel,
        direccionDetalle,
      );
      const formattedRifOrCi = numIdentificacion.trim()
        ? `${tipoIdentificacion}: ${numIdentificacion.trim()}${
            nombreResponsableLegal.trim() ? ` (${nombreResponsableLegal.trim()})` : ''
          }`
        : 'En Proceso de Registro';

      // 1. Crear la Iglesia en MATEO
      const newOng = await api.createOng({
        nombre: nombreOng.trim(),
        rif_identificacion: formattedRifOrCi,
        pais: 'Venezuela',
        telefono: telefono.trim() || null,
        direccion: fullAddress,
        logoUrl: logoUrl.trim() || null,
        plan: 'trial',
        estado: 'trial',
        tipo_organizacion: 'ekklesia',
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
              ongId: newOng.id,
              ongNombre: nombreOng.trim(),
              rif: formattedRifOrCi,
              pais: 'Venezuela',
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
    } catch (err: unknown) {
      console.error('Error al registrar la nueva ONG:', err);
      const errMsg =
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al procesar el registro de la organización.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cow-page">
      <div className="cow-top-accent" aria-hidden="true" />

      <main className="cow-grid">
        <div className="cow-left-col">
          {step !== 4 && (
            <>
              <div className="cow-presentation">
                <h1 className="cow-title">Registra tu iglesia</h1>
                <p className="cow-subtitle">
                  {step === 1 && 'Comencemos con los datos de tu congregación.'}
                  {step === 2 && 'Configura la identificación legal y el acceso del administrador.'}
                  {step === 3 && 'Un último paso para comenzar con MATEO.'}
                </p>
              </div>

              {/* Indicador de Progreso del Wizard (Stepper Figma) */}
              <div className="cow-stepper">
                <div className="cow-step-item">
                  <div
                    className={`cow-step-circle ${
                      step === 1
                        ? 'cow-step-circle--active'
                        : step > 1
                          ? 'cow-step-circle--completed'
                          : ''
                    }`}
                  >
                    {step > 1 ? <Check size={16} /> : 1}
                  </div>
                  <div className="cow-step-labels">
                    <span
                      className={`cow-step-title ${
                        step === 1
                          ? 'cow-step-title--active'
                          : step > 1
                            ? 'cow-step-title--completed'
                            : ''
                      }`}
                    >
                      Iglesia
                    </span>
                    <span className="cow-step-sub">Datos legales</span>
                  </div>
                </div>

                <div
                  className={`cow-step-connector ${
                    step > 1 ? 'cow-step-connector--completed' : ''
                  }`}
                />

                <div className="cow-step-item">
                  <div
                    className={`cow-step-circle ${
                      step === 2
                        ? 'cow-step-circle--active'
                        : step > 2
                          ? 'cow-step-circle--completed'
                          : ''
                    }`}
                  >
                    {step > 2 ? <Check size={16} /> : 2}
                  </div>
                  <div className="cow-step-labels">
                    <span
                      className={`cow-step-title ${
                        step === 2
                          ? 'cow-step-title--active'
                          : step > 2
                            ? 'cow-step-title--completed'
                            : ''
                      }`}
                    >
                      Administrador
                    </span>
                    <span className="cow-step-sub">Credenciales</span>
                  </div>
                </div>

                <div
                  className={`cow-step-connector ${
                    step > 2 ? 'cow-step-connector--completed' : ''
                  }`}
                />

                <div className="cow-step-item">
                  <div className={`cow-step-circle ${step === 3 ? 'cow-step-circle--active' : ''}`}>
                    3
                  </div>
                  <div className="cow-step-labels">
                    <span
                      className={`cow-step-title ${step === 3 ? 'cow-step-title--active' : ''}`}
                    >
                      Verificación
                    </span>
                    <span className="cow-step-sub">Seguridad</span>
                  </div>
                </div>
              </div>
            </>
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
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* ========================================================================= */}
          {/* PASO 1: DATOS FUNDAMENTALES & UBICACIÓN EN VENEZUELA                      */}
          {/* ========================================================================= */}
          {step === 1 && (
            <form
              noValidate
              onSubmit={handleNextFromStep1}
              style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
            >
              <div className="cow-section-intro">
                <h2 className="cow-section-heading">1. Datos fundamentales del templo</h2>
                <p className="cow-section-desc">
                  Ingresa el nombre oficial de la congregación y selecciona su ubicación
                  estandarizada en Venezuela.
                </p>
              </div>

              {/* Nombre de la Iglesia */}
              <div className="cow-field">
                <label className="cow-label" htmlFor="cow-nombre-iglesia">
                  Nombre de la iglesia / congregación *
                </label>
                <input
                  id="cow-nombre-iglesia"
                  type="text"
                  className="cow-input"
                  placeholder="Ej. Iglesia Evangélica Bautista Central"
                  value={nombreOng}
                  onChange={(e) => setNombreOng(e.target.value)}
                  required
                />
              </div>

              {/* Ubicación Estandarizada: Estado, Municipio, Parroquia y Dirección */}
              <div className="cow-location-wrap">
                <LocationSelector
                  estado={estadoSel}
                  municipio={municipioSel}
                  parroquia={parroquiaSel}
                  direccionDetalle={direccionDetalle}
                  onChangeEstado={setEstadoSel}
                  onChangeMunicipio={setMunicipioSel}
                  onChangeParroquia={setParroquiaSel}
                  onChangeDireccionDetalle={setDireccionDetalle}
                  required={true}
                  labelDireccion="Dirección física del templo (calle, sector, edificio)"
                  placeholderDireccion="Ej. Av. Andrés Bello, calle Los Mangos, templo central #45"
                />
              </div>

              {/* Teléfono de Contacto */}
              <div className="cow-field">
                <label className="cow-label" htmlFor="cow-telefono">
                  Teléfono oficial de contacto
                </label>
                <input
                  id="cow-telefono"
                  type="tel"
                  className="cow-input"
                  placeholder="+58 412 1234567"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                />
              </div>

              <p className="cow-required-note">* Campos obligatorios</p>

              <div className="cow-actions-row">
                <button type="submit" className="cow-next-btn">
                  Siguiente: Identificación Legal <ArrowRight size={20} />
                </button>

                <Link to="/login" className="cow-back-login-link">
                  Volver al acceso
                </Link>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* PASO 2: IDENTIFICACIÓN LEGAL FLEXIBLE & ADMINISTRADOR                      */}
          {/* ========================================================================= */}
          {step === 2 && (
            <form
              noValidate
              onSubmit={handleNextFromStep2}
              style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
            >
              <div className="cow-section-intro">
                <h2 className="cow-section-heading">2. Identificación legal y administrador</h2>
                <p className="cow-section-desc">
                  En MATEO entendemos que muchas congregaciones están en proceso de constitución
                  jurídica. Puedes registrar el RIF de la iglesia o la cédula del pastor /
                  administrador.
                </p>
              </div>

              {/* Tipo y Número de Identificación Legal */}
              <div className="cow-legal-card">
                <div className="cow-legal-row">
                  <div className="cow-field">
                    <label className="cow-label" htmlFor="cow-tipo-id">
                      Documento de identificación
                    </label>
                    <select
                      id="cow-tipo-id"
                      className="cow-input"
                      value={tipoIdentificacion}
                      onChange={(e) => setTipoIdentificacion(e.target.value as 'RIF' | 'CI')}
                    >
                      <option value="RIF">RIF Jurídico (J)</option>
                      <option value="CI">Cédula Identidad (V / E)</option>
                    </select>
                  </div>

                  <div className="cow-field">
                    <label className="cow-label" htmlFor="cow-num-id">
                      Número de documento
                    </label>
                    <input
                      id="cow-num-id"
                      type="text"
                      className="cow-input"
                      placeholder={tipoIdentificacion === 'RIF' ? 'J-12345678-0' : 'V-12345678'}
                      value={numIdentificacion}
                      onChange={(e) => setNumIdentificacion(e.target.value)}
                    />
                  </div>
                </div>

                <div className="cow-field">
                  <label className="cow-label" htmlFor="cow-razon-social">
                    Nombre del titular o razón social
                  </label>
                  <input
                    id="cow-razon-social"
                    type="text"
                    className="cow-input"
                    placeholder="Ej. Iglesia Evangélica Bautista Central o Pbro. Juan Pérez"
                    value={nombreResponsableLegal}
                    onChange={(e) => setNombreResponsableLegal(e.target.value)}
                  />
                </div>
              </div>

              {/* Nombre Completo del Administrador */}
              <div className="cow-field">
                <label className="cow-label" htmlFor="cow-nombre-admin">
                  Nombre completo del administrador principal *
                </label>
                <input
                  id="cow-nombre-admin"
                  type="text"
                  className="cow-input"
                  placeholder="Ej. María Rodríguez"
                  value={nombreAdmin}
                  onChange={(e) => setNombreAdmin(e.target.value)}
                  required
                />
              </div>

              {/* Cargo y Email */}
              <div className="cow-two-col-row">
                <div className="cow-field">
                  <label className="cow-label" htmlFor="cow-cargo-admin">
                    Cargo en la iglesia *
                  </label>
                  <input
                    id="cow-cargo-admin"
                    type="text"
                    className="cow-input"
                    placeholder="Pastor Principal"
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    required
                  />
                </div>

                <div className="cow-field">
                  <label className="cow-label" htmlFor="cow-email-admin">
                    Correo electrónico institucional *
                  </label>
                  <input
                    id="cow-email-admin"
                    type="email"
                    className="cow-input"
                    placeholder="pastor@iglesia.org"
                    value={emailAdmin}
                    onChange={(e) => setEmailAdmin(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Contraseñas */}
              <div className="cow-two-col-row">
                <div className="cow-field">
                  <label className="cow-label" htmlFor="cow-password">
                    Contraseña de acceso *
                  </label>
                  <input
                    id="cow-password"
                    type="password"
                    className="cow-input"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="cow-field">
                  <label className="cow-label" htmlFor="cow-confirm-password">
                    Confirmar contraseña *
                  </label>
                  <input
                    id="cow-confirm-password"
                    type="password"
                    className="cow-input"
                    placeholder="Repite la contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <p className="cow-required-note">* Campos obligatorios</p>

              <div className="cow-actions-row">
                <button type="submit" className="cow-next-btn">
                  Siguiente: Identidad y verificación <ArrowRight size={20} />
                </button>

                <button type="button" className="cow-back-login-link" onClick={() => setStep(1)}>
                  Atrás
                </button>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* ========================================================================= */}
          {/* PASO 3: IDENTIDAD ECLESIÁSTICA, MARCA & VERIFICACIÓN                      */}
          {/* ========================================================================= */}
          {step === 3 && (
            <form
              noValidate
              onSubmit={handleSubmitFinal}
              style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}
            >
              <div className="cow-section-intro">
                <h2 className="cow-section-heading">3. Identidad eclesiástica y verificación</h2>
                <p className="cow-section-desc">
                  Personaliza la identidad visual de tu templo y realiza la verificación de
                  seguridad.
                </p>
              </div>

              {/* Denominación y Afiliación */}
              <div className="cow-two-col-row">
                <div className="cow-field">
                  <label className="cow-label" htmlFor="cow-denominacion">
                    Denominación / tradición eclesiástica
                  </label>
                  <select
                    id="cow-denominacion"
                    className="cow-input"
                    value={denominacion}
                    onChange={(e) => setDenominacion(e.target.value)}
                  >
                    <option value="Bautista">Bautista</option>
                    <option value="Pentecostal">Pentecostal</option>
                    <option value="Presbiteriana">Presbiteriana</option>
                    <option value="Metodista">Metodista</option>
                    <option value="Asambleas de Dios">Asambleas de Dios</option>
                    <option value="Libre / Independiente">Libre / Independiente</option>
                    <option value="Otra">Otra Tradición</option>
                  </select>
                </div>

                <div className="cow-field">
                  <label className="cow-label" htmlFor="cow-afiliacion">
                    Afiliación o confraternidad
                  </label>
                  <input
                    id="cow-afiliacion"
                    type="text"
                    className="cow-input"
                    placeholder="Consejo Evangélico de Venezuela"
                    value={afiliacion}
                    onChange={(e) => setAfiliacion(e.target.value)}
                  />
                </div>
              </div>

              {/* Carga de Logo del Templo */}
              <div className="cow-field">
                <span className="cow-label">Logo de la iglesia (opcional)</span>
                {logoUrl ? (
                  <div className="cow-logo-dropzone">
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.85rem',
                      }}
                    >
                      <img
                        src={logoUrl}
                        alt="Logo Previsto"
                        style={{
                          height: '48px',
                          width: '48px',
                          objectFit: 'contain',
                          borderRadius: '6px',
                        }}
                      />
                      <span
                        style={{
                          fontSize: '0.88rem',
                          color: 'var(--secondary, #2d6a4f)',
                          fontWeight: 600,
                        }}
                      >
                        ✓ Logo cargado exitosamente
                      </span>
                    </div>
                  </div>
                ) : (
                  <label className="cow-logo-dropzone">
                    <span className="cow-logo-dropzone-arrow">↑</span>
                    <span className="cow-logo-dropzone-text">
                      {uploadingLogo ? 'Subiendo logo...' : 'Subir imagen del logo del templo'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}
              </div>

              {/* Resumen del Registro */}
              <div className="cow-summary-card">
                <p className="cow-summary-title">Resumen del registro</p>
                <div className="cow-summary-grid">
                  <div className="cow-summary-item">
                    <span className="cow-summary-label">CONGREGACIÓN / TEMPLO</span>
                    <span className="cow-summary-value">{nombreOng}</span>
                  </div>
                  <div className="cow-summary-item">
                    <span className="cow-summary-label">DOCUMENTO LEGAL / FISCAL</span>
                    <span className="cow-summary-value">
                      {numIdentificacion
                        ? `${tipoIdentificacion}: ${numIdentificacion}`
                        : 'En Proceso'}
                    </span>
                  </div>
                  <div className="cow-summary-item">
                    <span className="cow-summary-label">UBICACIÓN</span>
                    <span className="cow-summary-value">
                      {estadoSel}, {municipioSel}
                    </span>
                  </div>
                  <div className="cow-summary-item">
                    <span className="cow-summary-label">ADMINISTRADOR</span>
                    <span className="cow-summary-value">
                      {nombreAdmin} ({cargo})
                    </span>
                  </div>
                </div>
              </div>

              {/* Protección Anti-Bot reCAPTCHA */}
              <div className="cow-field">
                <span className="cow-label">Verificación anti-bot (reCAPTCHA) *</span>
                {isSimulationMode ? (
                  <div
                    className="cow-recaptcha-mock"
                    onClick={() => setCaptchaToken((prev) => (prev ? null : 'sim-captcha-token'))}
                  >
                    <div
                      className={`cow-recaptcha-box ${
                        captchaToken ? 'cow-recaptcha-box--checked' : ''
                      }`}
                    >
                      {captchaToken && <Check size={14} />}
                    </div>
                    <span className="cow-recaptcha-text">No soy un robot</span>
                    <div className="cow-recaptcha-brand">
                      <span className="cow-recaptcha-brand-title">reCAPTCHA</span>
                      <span className="cow-recaptcha-brand-sub">Privacidad · Términos</span>
                    </div>
                  </div>
                ) : (
                  <div
                    id="wizard-recaptcha-container"
                    style={{ display: 'flex', justifyContent: 'flex-start' }}
                  />
                )}
              </div>

              {/* Declaración de Responsabilidad Legal */}
              <label className="cow-declaration-card" htmlFor="declaracionLegal">
                <input
                  type="checkbox"
                  id="declaracionLegal"
                  className="cow-declaration-checkbox"
                  checked={declaracionLegal}
                  onChange={(e) => setDeclaracionLegal(e.target.checked)}
                  required
                />
                <span className="cow-declaration-text">
                  Declaro bajo fe de juramento que la información legal de la iglesia es verídica y
                  que poseo las facultades para representar a la congregación y activar su espacio
                  en MATEO ekklesia.
                </span>
              </label>

              <div className="cow-actions-row">
                <button type="submit" className="cow-next-btn" disabled={loading}>
                  {loading ? 'Creando iglesia...' : 'Registrar iglesia e iniciar prueba'}
                </button>

                <button
                  type="button"
                  className="cow-back-login-link"
                  onClick={() => setStep(2)}
                  disabled={loading}
                >
                  Atrás
                </button>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* PASO 4: CONFIRMACIÓN Y ÉXITO                                              */}
          {/* ========================================================================= */}
          {step === 4 && createdOngData && (
            <div className="cow-success-wrap">
              <div className="cow-success-header">
                <div className="cow-success-badge" aria-hidden="true">
                  ✓
                </div>

                <h2 className="cow-success-title">¡Iglesia registrada con éxito!</h2>

                <p className="cow-success-subtitle">
                  Tu iglesia <strong>{createdOngData.nombre}</strong> ha sido activada con una
                  prueba gratuita de 14 días.
                </p>
              </div>

              <div className="cow-trial-card">
                <p className="cow-trial-title">Detalles de tu período de prueba</p>
                <div className="cow-trial-row">
                  <span className="cow-trial-label">Plan asignado</span>
                  <span className="cow-trial-value">Prueba completa (14 días)</span>
                </div>
                <div className="cow-trial-row">
                  <span className="cow-trial-label">Fecha de vencimiento</span>
                  <span className="cow-trial-value">{createdOngData.trialEndsAt}</span>
                </div>
                <div className="cow-trial-row">
                  <span className="cow-trial-label">Tu rol</span>
                  <span className="cow-trial-value">Administrador principal de la iglesia</span>
                </div>
              </div>

              <div className="cow-email-verify-card">
                <p className="cow-email-verify-title">Verifica tu correo electrónico</p>
                <p className="cow-email-verify-text">
                  Hemos enviado un enlace de confirmación a{' '}
                  <span className="cow-email-highlight">{emailAdmin}</span>. Por favor, revisa tu
                  bandeja de entrada y haz clic en el enlace para habilitar tu cuenta e ingresar al
                  sistema.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="cow-login-cta-btn"
              >
                Ir al inicio de sesión
              </button>
            </div>
          )}
        </div>

        {/* Columna derecha: Logotipo MATEO centrado */}
        <section className="cow-right-col" aria-label="Identidad MATEO">
          <img src="/mateo_logo_wordmark.png" alt="Logo Mateo" className="cow-logo" />
        </section>
      </main>
    </div>
  );
};
