import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { requisitionsApi, type Invitation } from '../../services/api';
import { NativeLink } from '../../components/NativeLink';
import './AcceptInvitation.css';

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
  const fetchInvitation = useCallback(async (tokenToFetch: string) => {
    if (!tokenToFetch.trim()) return;
    setLoadingInv(true);
    setInvError(null);
    try {
      const data = await requisitionsApi.getInvitationByToken(tokenToFetch.trim());
      setInvitation(data);
    } catch (err: unknown) {
      console.error('Error al cargar la invitación:', err);
      const msg =
        err instanceof Error
          ? err.message
          : 'La invitación no es válida, ha sido revocada o ha expirado.';
      setInvError(msg);
      setInvitation(null);
    } finally {
      setLoadingInv(false);
    }
  }, []);

  useEffect(() => {
    if (tokenFromUrl) {
      fetchInvitation(tokenFromUrl);
    }
  }, [tokenFromUrl, fetchInvitation]);

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
    } catch (err: unknown) {
      console.error('Error al aceptar la invitación:', err);
      const msg =
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al procesar la aceptación de la invitación.';
      setInvError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ai-page">
      <div className="ai-top-accent" aria-hidden="true" />

      <main className="ai-grid">
        <div className="ai-left-col">
          {successMessage ? (
            <div className="ai-form-fields">
              <div className="ai-presentation">
                <div className="ai-success-badge" aria-hidden="true">
                  ✓
                </div>
                <div className="ai-heading-wrap">
                  <h1 className="ai-title">¡Cuenta Activada Exitosamente!</h1>
                  <p className="ai-subtitle">{successMessage}</p>
                </div>
              </div>

              <button type="button" onClick={() => navigate('/login')} className="ai-submit-btn">
                Iniciar Sesión Ahora
              </button>
            </div>
          ) : (
            <>
              {/* Si no tenemos invitación cargada todavía o hubo error, mostrar input de token */}
              {!invitation && (
                <form onSubmit={handleManualSearch} className="ai-form-fields">
                  <div className="ai-heading-wrap">
                    <h1 className="ai-title">Aceptar Invitación a la Iglesia</h1>
                    <p className="ai-subtitle">
                      Ingresa el código o token de invitación que recibiste por correo electrónico.
                    </p>
                  </div>

                  {invError && <div className="ai-error-alert">⚠️ {invError}</div>}

                  <div className="ai-field">
                    <label className="ai-label" htmlFor="ai-token-input">
                      Código de invitación *
                    </label>
                    <input
                      id="ai-token-input"
                      type="text"
                      className="ai-input"
                      placeholder="Ej. inv-abc123xyz"
                      value={inputToken}
                      onChange={(e) => setInputToken(e.target.value)}
                      required
                    />
                  </div>

                  <div className="ai-actions-block">
                    <button type="submit" className="ai-submit-btn" disabled={loadingInv}>
                      {loadingInv ? 'Verificando invitación...' : 'Verificar invitación'}
                    </button>

                    <InvitationLink to="/login" className="ai-back-link">
                      Volver al inicio de sesión
                    </InvitationLink>
                  </div>
                </form>
              )}

              {/* Si la invitación fue encontrada y es válida (Figma node 228:2) */}
              {invitation && (
                <form noValidate onSubmit={handleAcceptSubmit} className="ai-form-fields">
                  <div className="ai-presentation">
                    <div className="ai-valid-badge">
                      <span>✓</span>
                      <span>Invitación válida</span>
                    </div>

                    <div className="ai-heading-wrap">
                      <h1 className="ai-title">Completa tu perfil</h1>
                      <p className="ai-subtitle">
                        Estás aceptando la invitación para unirte a {invitation.ong_nombre}.
                      </p>
                    </div>
                  </div>

                  {invError && <div className="ai-error-alert">⚠️ {invError}</div>}

                  {/* Resumen de Invitación (Organización, Rol preconfigurado y Correo) */}
                  <div className="ai-summary-card">
                    <div className="ai-summary-top-row">
                      <div className="ai-summary-item">
                        <span className="ai-summary-label">ORGANIZACIÓN</span>
                        <span className="ai-summary-org">{invitation.ong_nombre}</span>
                      </div>

                      <div className="ai-summary-item">
                        <span className="ai-summary-label">ROL ASIGNADO (PRECONFIGURADO)</span>
                        <span className="ai-summary-role">{invitation.rol.toUpperCase()}</span>
                      </div>
                    </div>

                    <div className="ai-summary-item">
                      <span className="ai-summary-label">CORREO ELECTRÓNICO INVITADO</span>
                      <span className="ai-summary-email">{invitation.email}</span>
                    </div>
                  </div>

                  {/* Campos de Nombre y Contraseña */}
                  <div className="ai-field">
                    <label className="ai-label" htmlFor="ai-nombre-completo">
                      Tu nombre completo *
                    </label>
                    <input
                      id="ai-nombre-completo"
                      type="text"
                      className="ai-input"
                      placeholder="Ej. Carlos Mendoza"
                      value={nombreCompleto}
                      onChange={(e) => setNombreCompleto(e.target.value)}
                      required
                    />
                  </div>

                  <div className="ai-two-col">
                    <div className="ai-field">
                      <label className="ai-label" htmlFor="ai-password">
                        Contraseña de acceso *
                      </label>
                      <input
                        id="ai-password"
                        type="password"
                        className="ai-input"
                        placeholder="Mínimo 6 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>

                    <div className="ai-field">
                      <label className="ai-label" htmlFor="ai-confirm-password">
                        Confirmar contraseña *
                      </label>
                      <input
                        id="ai-confirm-password"
                        type="password"
                        className="ai-input"
                        placeholder="Repite la contraseña"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <p className="ai-required-note">* Campos obligatorios</p>

                  <div className="ai-actions-block">
                    <button type="submit" className="ai-submit-btn" disabled={submitting}>
                      {submitting
                        ? 'Activando cuenta...'
                        : `Activar mi cuenta en ${invitation.ong_nombre}`}
                    </button>
                    <p className="ai-footer-note">
                      Tu cuenta se vinculará a la iglesia con el rol asignado.
                    </p>
                  </div>
                </form>
              )}
            </>
          )}
        </div>

        {/* Columna derecha: Logotipo MATEO y lema */}
        <section className="ai-right-col" aria-label="Identidad de Mateo">
          <img src="/mateo_logo_wordmark.png" alt="Logo Mateo" className="ai-logo" />
          <p className="ai-tagline">
            Una plataforma al servicio
            <br />
            de tu iglesia.
          </p>
        </section>
      </main>
    </div>
  );
};
