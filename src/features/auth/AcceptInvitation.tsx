import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  User,
  Lock,
  Building2,
  Mail,
  CheckCircle2,
  ArrowRight,
  KeyRound,
} from 'lucide-react';
import { requisitionsApi, type Invitation } from '../../services/api';
import { NativeLink } from '../../components/NativeLink';

export const AcceptInvitation: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tokenFromUrl = searchParams.get('token') || '';
  return <AcceptInvitationForm tokenFromUrl={tokenFromUrl} navigate={navigate} />;
};

export const AcceptInvitationForm: React.FC<{
  tokenFromUrl: string;
  navigate: (path: string) => void;
  nativeLinks?: boolean;
}> = ({ tokenFromUrl, navigate, nativeLinks = false }) => {
  const InvitationLink = nativeLinks ? NativeLink : Link;

  const [inputToken, setInputToken] = useState(tokenFromUrl);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loadingInv, setLoadingInv] = useState(false);
  const [invError, setInvError] = useState<string | null>(null);

  // Datos del usuario
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Buscar invitación si hay token disponible
  const fetchInvitation = async (tokenToFetch: string) => {
    if (!tokenToFetch.trim()) return;
    setLoadingInv(true);
    setInvError(null);
    try {
      const data = await requisitionsApi.getInvitationByToken(tokenToFetch.trim());
      setInvitation(data);
    } catch (err: any) {
      console.error('Error al cargar la invitación:', err);
      setInvError(err.message || 'La invitación no es válida, ha sido revocada o ha expirado.');
      setInvitation(null);
    } finally {
      setLoadingInv(false);
    }
  };

  useEffect(() => {
    if (tokenFromUrl) {
      fetchInvitation(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInvitation(inputToken);
  };

  const handleAcceptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInvError(null);

    if (!nombreCompleto.trim()) {
      setInvError('Por favor ingresa tu nombre completo.');
      return;
    }
    if (!password || password.length < 6) {
      setInvError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setInvError('Las contraseñas no coinciden.');
      return;
    }

    setSubmitting(true);
    try {
      await requisitionsApi.acceptInvitation({
        token: invitation?.token || inputToken,
        nombreCompleto: nombreCompleto.trim(),
        password,
      });

      setSuccessMessage(
        `¡Tu cuenta ha sido activada exitosamente con el rol de ${invitation?.rol?.toUpperCase()} en ${invitation?.ong_nombre}!`,
      );
    } catch (err: any) {
      console.error('Error al aceptar la invitación:', err);
      setInvError(err.message || 'Ocurrió un error al procesar la aceptación de la invitación.');
    } finally {
      setSubmitting(false);
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
      {/* Brand Header */}
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
              height: '52px',
              width: '52px',
              objectFit: 'contain',
              borderRadius: '14px',
              boxShadow: '0 8px 16px -4px rgba(47, 90, 174, 0.2)',
            }}
          />
          <div style={{ textAlign: 'left' }}>
            <h1
              style={{
                fontSize: '1.65rem',
                fontWeight: 900,
                color: 'var(--primary)',
                letterSpacing: '-0.5px',
                margin: 0,
                lineHeight: 1,
              }}
            >
              MATEO
            </h1>
            <span
              style={{
                fontSize: '0.65rem',
                color: '#64748b',
                fontWeight: 700,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
              }}
            >
              Invitación de Usuario
            </span>
          </div>
        </div>
      </div>

      {/* Main Container Card */}
      <div
        className="card animate-fade-in-up"
        style={{
          maxWidth: '560px',
          width: '100%',
          padding: '2.5rem',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.08), 0 10px 10px -5px rgba(0,0,0,0.02)',
        }}
      >
        {successMessage ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '1.25rem',
                color: '#10b981',
              }}
            >
              <CheckCircle2 size={72} strokeWidth={1.5} />
            </div>

            <h2
              style={{
                color: 'var(--primary)',
                fontWeight: 900,
                fontSize: '1.5rem',
                margin: 0,
                letterSpacing: '-0.5px',
              }}
            >
              ¡Cuenta Activada Exitosamente!
            </h2>

            <p
              style={{
                fontSize: '0.92rem',
                color: '#475569',
                marginTop: '0.8rem',
                lineHeight: '1.6',
              }}
            >
              {successMessage}
            </p>

            <button
              onClick={() => navigate('/login')}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.9rem',
                fontWeight: 700,
                fontSize: '1rem',
                borderRadius: '10px',
                marginTop: '1.8rem',
                boxShadow: '0 4px 12px rgba(47, 90, 174, 0.25)',
              }}
            >
              Iniciar Sesión Ahora
            </button>
          </div>
        ) : (
          <>
            {/* Si no tenemos invitación cargada todavía o hubo error, mostrar input de token */}
            {!invitation && (
              <form
                onSubmit={handleManualSearch}
                style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}
              >
                <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                  <h2
                    style={{
                      fontSize: '1.35rem',
                      fontWeight: 800,
                      color: 'var(--primary)',
                      margin: 0,
                    }}
                  >
                    Aceptar Invitación a la ONG
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.4rem' }}>
                    Ingresa el código o token de invitación que recibiste por correo electrónico.
                  </p>
                </div>

                {invError && (
                  <div
                    style={{
                      padding: '0.85rem 1rem',
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '10px',
                      color: '#dc2626',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                    }}
                  >
                    ⚠️ {invError}
                  </div>
                )}

                <div className="form-field">
                  <label className="form-field-label">
                    Código de Invitación <span className="form-field-required">*</span>
                  </label>
                  <div className="input-with-icon">
                    <KeyRound size={18} className="input-icon" />
                    <input
                      type="text"
                      className="form-input-premium"
                      placeholder="Ej. inv-abc123xyz"
                      value={inputToken}
                      onChange={(e) => setInputToken(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loadingInv}
                  style={{
                    padding: '0.85rem',
                    fontWeight: 700,
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {loadingInv ? 'Verificando Invitación...' : 'Verificar Invitación'}{' '}
                  <ArrowRight size={18} />
                </button>

                <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                  <InvitationLink
                    to="/login"
                    style={{ fontSize: '0.85rem', color: '#64748b', textDecoration: 'none' }}
                  >
                    Volver al Inicio de Sesión
                  </InvitationLink>
                </div>
              </form>
            )}

            {/* Si la invitación fue encontrada y es válida */}
            {invitation && (
              <form
                onSubmit={handleAcceptSubmit}
                style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}
              >
                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      color: '#047857',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      marginBottom: '0.75rem',
                    }}
                  >
                    <CheckCircle2 size={14} /> Invitación Válida
                  </div>
                  <h2
                    style={{
                      fontSize: '1.35rem',
                      fontWeight: 800,
                      color: 'var(--primary)',
                      margin: 0,
                    }}
                  >
                    Completa tu Perfil
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.3rem' }}>
                    Estás aceptando la invitación para unirte a{' '}
                    <strong>{invitation.ong_nombre}</strong>.
                  </p>
                </div>

                {invError && (
                  <div
                    style={{
                      padding: '0.85rem 1rem',
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '10px',
                      color: '#dc2626',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                    }}
                  >
                    ⚠️ {invError}
                  </div>
                )}

                {/* Resumen de Invitación (Datos Pre-asignados) */}
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '1rem 1.2rem',
                    fontSize: '0.85rem',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.75rem',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        color: '#94a3b8',
                        display: 'block',
                        fontWeight: 700,
                      }}
                    >
                      ORGANIZACIÓN
                    </span>
                    <strong
                      style={{
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <Building2 size={15} /> {invitation.ong_nombre}
                    </strong>
                  </div>

                  <div>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        color: '#94a3b8',
                        display: 'block',
                        fontWeight: 700,
                      }}
                    >
                      ROL ASIGNADO (PRE-CONFIGURADO)
                    </span>
                    <strong
                      style={{
                        color: '#047857',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <ShieldCheck size={15} /> {invitation.rol.toUpperCase()}
                    </strong>
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        color: '#94a3b8',
                        display: 'block',
                        fontWeight: 700,
                      }}
                    >
                      CORREO ELECTRÓNICO INVITADO
                    </span>
                    <strong
                      style={{
                        color: '#334155',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <Mail size={15} /> {invitation.email}
                    </strong>
                  </div>
                </div>

                {/* Campos de Nombre y Contraseña */}
                <div className="form-field">
                  <label className="form-field-label">
                    Tu Nombre Completo <span className="form-field-required">*</span>
                  </label>
                  <div className="input-with-icon">
                    <User size={18} className="input-icon" />
                    <input
                      type="text"
                      className="form-input-premium"
                      placeholder="Ej. Carlos Mendoza"
                      value={nombreCompleto}
                      onChange={(e) => setNombreCompleto(e.target.value)}
                      required
                    />
                  </div>
                </div>

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

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{
                    padding: '0.9rem',
                    fontWeight: 700,
                    borderRadius: '10px',
                    marginTop: '0.5rem',
                    boxShadow: '0 4px 12px rgba(47, 90, 174, 0.25)',
                  }}
                >
                  {submitting
                    ? 'Activando Cuenta...'
                    : `Activar mi Cuenta en ${invitation.ong_nombre}`}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};
