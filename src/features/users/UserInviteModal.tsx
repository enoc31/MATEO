import React, { useState } from 'react';
import { Mail, ShieldCheck, Copy, Check, X, Send, Sparkles } from 'lucide-react';
import { api, UserRole } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface UserInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const UserInviteModal: React.FC<UserInviteModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { profile } = useAuth();

  const [email, setEmail] = useState('');
  const [rol, setRol] = useState<UserRole>('coordinador');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdInviteLink, setCreatedInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreatedInviteLink(null);

    if (!email.trim() || !email.includes('@')) {
      setError('Por favor ingresa un correo electrónico válido.');
      return;
    }

    if (!profile?.ong_id) {
      setError('No se pudo identificar tu organización activa.');
      return;
    }

    setLoading(true);
    try {
      const invite = await api.createInvitation({
        email: email.trim(),
        rol,
        ong_id: profile.ong_id,
        invitado_por: profile.id,
      });

      const inviteUrl = `${window.location.origin}/aceptar-invitacion?token=${invite.token}`;
      setCreatedInviteLink(inviteUrl);

      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Error al crear invitación:', err);
      setError(err.message || 'No se pudo generar la invitación.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!createdInviteLink) return;
    navigator.clipboard.writeText(createdInviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleReset = () => {
    setEmail('');
    setRol('coordinador');
    setCreatedInviteLink(null);
    setError(null);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="card animate-fade-in-up"
        style={{
          maxWidth: '520px',
          width: '100%',
          padding: '2rem',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          position: 'relative',
        }}
      >
        {/* Header con botón cerrar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '1.25rem',
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '1.3rem',
                color: 'var(--primary)',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Send size={22} /> Invitar Nuevo Usuario a la ONG
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
              El usuario recibirá una invitación con su rol pre-asignado por ti.
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '0.3rem',
              borderRadius: '8px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '0.85rem 1rem',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              color: '#dc2626',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '1.25rem',
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {createdInviteLink ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '12px',
                padding: '1.2rem',
                fontSize: '0.85rem',
                color: '#047857',
              }}
            >
              <strong style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.95rem' }}>
                🎉 ¡Invitación Generada Exitosamente!
              </strong>
              Se ha asignado el rol de <strong>{rol.toUpperCase()}</strong> a{' '}
              <strong>{email}</strong>.
            </div>

            <div className="form-field">
              <label className="form-field-label">Enlace Directo de Invitación</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  readOnly
                  className="form-input-premium"
                  value={createdInviteLink}
                  style={{ fontSize: '0.82rem', color: '#475569' }}
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="btn btn-primary"
                  style={{
                    padding: '0.75rem 1.25rem',
                    fontWeight: 700,
                    borderRadius: '10px',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                  {copied ? '¡Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={handleReset}
                className="btn btn-outline"
                style={{ flex: 1, padding: '0.75rem', borderRadius: '10px' }}
              >
                Invitar Otro Usuario
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-primary"
                style={{ flex: 1, padding: '0.75rem', borderRadius: '10px' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSendInvite}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}
          >
            <div className="form-field">
              <label className="form-field-label">
                Correo Electrónico del Invitado <span className="form-field-required">*</span>
              </label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  className="form-input-premium"
                  placeholder="usuario@tu-ong.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-field">
              <label className="form-field-label">
                Rol Pre-Asignado en la ONG <span className="form-field-required">*</span>
              </label>
              <div className="input-with-icon">
                <ShieldCheck size={18} className="input-icon" />
                <select
                  className="form-input-premium"
                  value={rol}
                  onChange={(e) => setRol(e.target.value as UserRole)}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="coordinador">Coordinador (Gestión de proyectos e ingresos)</option>
                  <option value="director">Director (Visualización estratégica)</option>
                  <option value="auditor">Auditor (Revisión y auditoría de egresos)</option>
                  <option value="auxiliar_campo">
                    Auxiliar de Campo (Registro de beneficiarios)
                  </option>
                  <option value="donante">Donante (Visualización de reportes públicos)</option>
                  <option value="administrador">Administrador (Control total del Tenant)</option>
                </select>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                marginTop: '1rem',
              }}
            >
              <button
                type="button"
                onClick={onClose}
                className="btn btn-outline"
                disabled={loading}
                style={{ padding: '0.85rem 1.4rem', borderRadius: '10px' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{
                  padding: '0.85rem 1.6rem',
                  fontWeight: 700,
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 12px rgba(47, 90, 174, 0.25)',
                }}
              >
                {loading ? 'Generando...' : 'Generar Invitación'} <Sparkles size={18} />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
