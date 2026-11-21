import React, { useState } from 'react';
import { Check, Copy, ExternalLink, Plus, Power, QrCode, Share2, Trash2 } from 'lucide-react';
import {
  financeApi,
  type CuentaReceptora,
  type TipoCuentaReceptora,
} from '../../services/financeApi';
import { BANCOS_VENEZUELA } from '../../utils/rolePermissions';

interface AccountsAndLinkTabProps {
  ongId: string;
  ongNombre: string;
  cuentas: CuentaReceptora[];
  onRefresh: () => Promise<void>;
  onFeedback: (msg: string, type?: 'success' | 'error') => void;
}

export const AccountsAndLinkTab: React.FC<AccountsAndLinkTabProps> = ({
  ongId,
  ongNombre,
  cuentas,
  onRefresh,
  onFeedback,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form states
  const [tipo, setTipo] = useState<TipoCuentaReceptora>('pago_movil');
  const [banco, setBanco] = useState(BANCOS_VENEZUELA[0]);
  const [numeroCuenta, setNumeroCuenta] = useState('');
  const [telefono, setTelefono] = useState('');
  const [rifCedula, setRifCedula] = useState('');
  const [titular, setTitular] = useState(ongNombre);
  const [tipoFondo, setTipoFondo] = useState('Diezmos y Ofrendas');
  const [saving, setSaving] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const publicUrl = `${origin}/aportar/${ongId}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
    `Reporta tus diezmos y ofrendas para ${ongNombre} aquí: ${publicUrl}`,
  )}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(publicUrl)}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1800);
      onFeedback('Enlace público copiado al portapapeles.', 'success');
    } catch {
      onFeedback('No se pudo copiar automáticamente. Copia el enlace manualmente.', 'error');
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rifCedula.trim() || !titular.trim()) {
      onFeedback('Titular y RIF/Cédula son obligatorios.', 'error');
      return;
    }
    if (tipo === 'transferencia' && !numeroCuenta.trim()) {
      onFeedback('El número de cuenta es obligatorio para Transferencia.', 'error');
      return;
    }
    if (tipo === 'pago_movil' && !telefono.trim()) {
      onFeedback('El teléfono es obligatorio para Pago Móvil.', 'error');
      return;
    }

    setSaving(true);
    try {
      await financeApi.createCuentaReceptora(
        {
          tipo,
          banco,
          numero_cuenta: tipo === 'transferencia' ? numeroCuenta.trim() : null,
          telefono: tipo === 'pago_movil' ? telefono.trim() : null,
          rif_cedula: rifCedula.trim(),
          titular: titular.trim(),
          tipo_fondo: tipoFondo.trim() || 'General',
          activa: true,
        },
        ongId,
      );
      setShowForm(false);
      setNumeroCuenta('');
      setTelefono('');
      await onRefresh();
      onFeedback('Cuenta receptora agregada.', 'success');
    } catch (err) {
      console.error('Error guardando cuenta receptora:', err);
      onFeedback('No se pudo guardar la cuenta receptora.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (cta: CuentaReceptora) => {
    try {
      await financeApi.updateCuentaReceptora(cta.id, { activa: !cta.activa });
      await onRefresh();
    } catch (err) {
      console.error('Error actualizando estado de cuenta:', err);
      onFeedback('No se pudo actualizar el estado de la cuenta.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await financeApi.deleteCuentaReceptora(id);
      await onRefresh();
      onFeedback('Cuenta eliminada.', 'success');
    } catch (err) {
      console.error('Error eliminando cuenta:', err);
      onFeedback('No se pudo eliminar la cuenta.', 'error');
    }
  };

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      {/* Enlace Público y QR (HU-3) */}
      <div className="card" style={{ padding: '1.25rem', display: 'grid', gap: '0.85rem' }}>
        <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.05rem' }}>
          Enlace Público de Reporte de Aportes
        </h3>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>
          Comparte este enlace con tu congregación para que reporten diezmos y ofrendas sin
          necesidad de iniciar sesión.
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            readOnly
            aria-label="Enlace público de aportes"
            className="form-input"
            value={publicUrl}
            style={{ flex: 1, minWidth: '240px', backgroundColor: '#f8fafc' }}
          />
          <button type="button" className="btn btn-primary" onClick={() => void handleCopyLink()}>
            {copiedLink ? <Check size={15} /> : <Copy size={15} />}{' '}
            {copiedLink ? 'Copiado' : 'Copiar Enlace'}
          </button>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Share2 size={15} /> WhatsApp
          </a>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setShowQr((prev) => !prev)}
          >
            <QrCode size={15} /> {showQr ? 'Ocultar QR' : 'Ver QR'}
          </button>
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <ExternalLink size={15} /> Abrir
          </a>
        </div>

        {showQr && (
          <div
            style={{
              textAlign: 'center',
              padding: '1rem',
              backgroundColor: '#f8fafc',
              borderRadius: '10px',
            }}
          >
            <img
              src={qrUrl}
              alt={`Código QR para aportes de ${ongNombre}`}
              width={180}
              height={180}
              style={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
            />
          </div>
        )}
      </div>

      {/* Cuentas Receptoras (HU-2) */}
      <div className="card" style={{ padding: '1.25rem', display: 'grid', gap: '1rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.05rem' }}>
            Cuentas Bancarias y Pago Móvil Receptoras
          </h3>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowForm((prev) => !prev)}
          >
            <Plus size={16} /> {showForm ? 'Cancelar' : 'Agregar Cuenta'}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleCreateAccount}
            style={{
              border: '1px solid #cbd5e1',
              borderRadius: '12px',
              padding: '1rem',
              backgroundColor: '#f8fafc',
              display: 'grid',
              gap: '0.75rem',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.75rem',
              }}
            >
              <div>
                <label htmlFor="cta-tipo" className="form-field-label">
                  Tipo *
                </label>
                <select
                  id="cta-tipo"
                  className="form-input"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as TipoCuentaReceptora)}
                >
                  <option value="pago_movil">Pago Móvil</option>
                  <option value="transferencia">Transferencia Bancaria</option>
                </select>
              </div>
              <div>
                <label htmlFor="cta-banco" className="form-field-label">
                  Banco *
                </label>
                <select
                  id="cta-banco"
                  className="form-input"
                  value={banco}
                  onChange={(e) => setBanco(e.target.value)}
                >
                  {BANCOS_VENEZUELA.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="cta-fondo" className="form-field-label">
                  Tipo de Fondo *
                </label>
                <input
                  id="cta-fondo"
                  type="text"
                  className="form-input"
                  value={tipoFondo}
                  onChange={(e) => setTipoFondo(e.target.value)}
                  placeholder="Ej: Diezmos y Ofrendas"
                />
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.75rem',
              }}
            >
              {tipo === 'transferencia' ? (
                <div>
                  <label htmlFor="cta-num" className="form-field-label">
                    Número de Cuenta *
                  </label>
                  <input
                    id="cta-num"
                    type="text"
                    className="form-input"
                    value={numeroCuenta}
                    onChange={(e) => setNumeroCuenta(e.target.value)}
                    placeholder="0134-0000-00-0000000000"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label htmlFor="cta-tel" className="form-field-label">
                    Teléfono Pago Móvil *
                  </label>
                  <input
                    id="cta-tel"
                    type="tel"
                    className="form-input"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="0414-0000000"
                    required
                  />
                </div>
              )}

              <div>
                <label htmlFor="cta-rif" className="form-field-label">
                  RIF / Cédula *
                </label>
                <input
                  id="cta-rif"
                  type="text"
                  className="form-input"
                  value={rifCedula}
                  onChange={(e) => setRifCedula(e.target.value)}
                  placeholder="J-00000000-0"
                  required
                />
              </div>

              <div>
                <label htmlFor="cta-titular" className="form-field-label">
                  Titular *
                </label>
                <input
                  id="cta-titular"
                  type="text"
                  className="form-input"
                  value={titular}
                  onChange={(e) => setTitular(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar Cuenta Receptora'}
              </button>
            </div>
          </form>
        )}

        {cuentas.length === 0 ? (
          <p style={{ color: '#64748b', margin: 0 }}>
            No hay cuentas configuradas aún. Agrega la primera para mostrarla en el enlace público.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {cuentas.map((cta) => (
              <div
                key={cta.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  opacity: cta.activa ? 1 : 0.6,
                }}
              >
                <div style={{ fontSize: '0.86rem' }}>
                  <strong>
                    {cta.tipo === 'pago_movil' ? 'Pago Móvil' : 'Transferencia'} · {cta.banco}
                  </strong>{' '}
                  <span style={{ color: '#0369a1', fontWeight: 600 }}>({cta.tipo_fondo})</span>
                  <div style={{ color: '#475569', marginTop: '0.2rem' }}>
                    {cta.tipo === 'pago_movil'
                      ? `Tel: ${cta.telefono}`
                      : `Cta: ${cta.numero_cuenta}`}{' '}
                    · RIF/CI: {cta.rif_cedula} · {cta.titular}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => void handleToggleActive(cta)}
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}
                  >
                    <Power size={13} /> {cta.activa ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => void handleDelete(cta.id)}
                    style={{
                      padding: '0.3rem 0.6rem',
                      fontSize: '0.78rem',
                      color: 'var(--danger)',
                      borderColor: 'var(--danger)',
                    }}
                    aria-label={`Eliminar cuenta ${cta.banco}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
