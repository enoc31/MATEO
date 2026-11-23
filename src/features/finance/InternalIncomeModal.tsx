import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Save, X } from 'lucide-react';
import { api, type Beneficiary } from '../../services/api';
import { financeApi, type MedioPagoAporte } from '../../services/financeApi';
import {
  BANCOS_VENEZUELA,
  CATEGORIAS_APORTE,
  type CategoriaAporte,
} from '../../utils/rolePermissions';
import { getCaracasDateParts } from '../../utils/formatters';

interface InternalIncomeModalProps {
  isOpen: boolean;
  ongId?: string;
  userId?: string;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  onFeedback: (msg: string, type?: 'success' | 'error') => void;
}

export const InternalIncomeModal: React.FC<InternalIncomeModalProps> = ({
  isOpen,
  ongId,
  userId,
  onClose,
  onSuccess,
  onFeedback,
}) => {
  const [members, setMembers] = useState<Beneficiary[]>([]);
  const [miembroId, setMiembroId] = useState('');
  const [donanteNombre, setDonanteNombre] = useState('Aporte Interno');
  const [categoria, setCategoria] = useState<CategoriaAporte>('ofrenda');
  const [moneda, setMoneda] = useState<'USD' | 'VES'>('USD');
  const [montoOriginal, setMontoOriginal] = useState('');
  const [tasaBcv, setTasaBcv] = useState('');
  const [medioPago, setMedioPago] = useState<Exclude<MedioPagoAporte, 'efectivo'>>('transferencia');
  const [fecha, setFecha] = useState(() => getCaracasDateParts().dateString);
  const [referencia, setReferencia] = useState('');
  const [bancoEmisor, setBancoEmisor] = useState('');
  const [telefonoEmisor, setTelefonoEmisor] = useState('');
  const [actividad, setActividad] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const loadData = async () => {
      try {
        const [memList, rateByDate] = await Promise.all([
          api.getBeneficiaries(),
          api.getTasaByDate(fecha),
        ]);
        setMembers(memList);
        let resolvedRate = rateByDate && rateByDate.tasa > 1 ? rateByDate.tasa : null;
        if (!resolvedRate) {
          const allRates = await api.getTasasBCV();
          if (allRates && allRates.length > 0 && allRates[0].tasa > 1) {
            resolvedRate = allRates[0].tasa;
          }
        }
        if (resolvedRate) {
          setTasaBcv(String(resolvedRate));
        }
      } catch (err) {
        console.error('Error cargando datos para aporte interno:', err);
      }
    };
    void loadData();
  }, [isOpen, fecha]);

  if (!isOpen) return null;

  const handleMemberSelect = (id: string) => {
    setMiembroId(id);
    if (id) {
      const m = members.find((item) => item.id === id);
      if (m) setDonanteNombre(`${m.nombre} ${m.apellido}`.trim());
    } else {
      setDonanteNombre('Aporte Interno');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numMonto = parseFloat(montoOriginal);
    if (isNaN(numMonto) || numMonto <= 0) {
      onFeedback('El monto debe ser mayor a 0.', 'error');
      return;
    }

    const numTasa = tasaBcv ? parseFloat(tasaBcv) : null;
    if (moneda === 'VES' && (!numTasa || numTasa <= 0)) {
      onFeedback('Debe indicar una tasa BCV válida para registrar en Bolívares.', 'error');
      return;
    }

    const montoUsd =
      moneda === 'USD' ? numMonto : parseFloat((numMonto / (numTasa as number)).toFixed(2));
    const montoVes =
      moneda === 'VES'
        ? numMonto
        : numTasa && numTasa > 0
          ? parseFloat((numMonto * numTasa).toFixed(2))
          : null;

    setSubmitting(true);
    try {
      await financeApi.registrarAporteInterno({
        ong_id: ongId,
        miembro_id: miembroId || null,
        donante_nombre: donanteNombre,
        categoria_aporte: categoria,
        moneda,
        monto_original: numMonto,
        tasa_bcv: numTasa,
        monto_usd: montoUsd,
        monto_ves: montoVes,
        medio_pago: medioPago,
        referencia: referencia.trim() || null,
        banco_emisor: bancoEmisor || null,
        telefono_emisor: medioPago === 'pago_movil' ? telefonoEmisor.trim() || null : null,
        fecha,
        actividad_o_responsable: actividad.trim() || null,
        userId,
      });
      await onSuccess();
      onFeedback('Aporte interno registrado exitosamente.', 'success');
      onClose();
    } catch (err) {
      console.error('Error registrando aporte interno:', err);
      const msg = err instanceof Error ? err.message : 'Error al registrar aporte interno.';
      onFeedback(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="internal-income-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '1.25rem 1rem',
        zIndex: 9999,
        overflowY: 'auto',
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="card"
        style={{
          maxWidth: '580px',
          width: '100%',
          margin: 'auto',
          padding: '1.5rem',
          display: 'grid',
          gap: '0.9rem',
          boxShadow: '0 20px 45px -15px rgba(15, 23, 42, 0.35)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 id="internal-income-title" style={{ margin: 0, color: 'var(--primary)' }}>
            Registrar Aporte Interno (Transferencia / Pago Móvil)
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '0.75rem',
          }}
        >
          <div>
            <label htmlFor="int-miembro" className="form-field-label">
              Miembro vinculado (opcional)
            </label>
            <select
              id="int-miembro"
              className="form-input"
              value={miembroId}
              onChange={(e) => handleMemberSelect(e.target.value)}
            >
              <option value="">General / Sin miembro específico</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre} {m.apellido} ({m.cedula})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="int-nombre" className="form-field-label">
              Aportante / Concepto *
            </label>
            <input
              id="int-nombre"
              type="text"
              className="form-input"
              value={donanteNombre}
              onChange={(e) => setDonanteNombre(e.target.value)}
              required
            />
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '0.75rem',
          }}
        >
          <div>
            <label htmlFor="int-cat" className="form-field-label">
              Categoría *
            </label>
            <select
              id="int-cat"
              className="form-input"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as CategoriaAporte)}
            >
              {CATEGORIAS_APORTE.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="int-metodo" className="form-field-label">
              Método *
            </label>
            <select
              id="int-metodo"
              className="form-input"
              value={medioPago}
              onChange={(e) => setMedioPago(e.target.value as Exclude<MedioPagoAporte, 'efectivo'>)}
            >
              <option value="transferencia">Transferencia</option>
              <option value="pago_movil">Pago Móvil</option>
            </select>
          </div>

          <div>
            <label htmlFor="int-moneda" className="form-field-label">
              Moneda *
            </label>
            <select
              id="int-moneda"
              className="form-input"
              value={moneda}
              onChange={(e) => setMoneda(e.target.value as 'USD' | 'VES')}
            >
              <option value="USD">USD</option>
              <option value="VES">VES</option>
            </select>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '0.75rem',
          }}
        >
          <div>
            <label htmlFor="int-monto" className="form-field-label">
              Monto ({moneda}) *
            </label>
            <input
              id="int-monto"
              type="number"
              step="0.01"
              min="0.01"
              className="form-input"
              value={montoOriginal}
              onChange={(e) => setMontoOriginal(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="int-fecha" className="form-field-label">
              Fecha *
            </label>
            <input
              id="int-fecha"
              type="date"
              className="form-input"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
            />
          </div>

          {moneda === 'VES' && (
            <div>
              <label htmlFor="int-tasa" className="form-field-label">
                Tasa BCV *
              </label>
              <input
                id="int-tasa"
                type="number"
                step="0.0001"
                min="0.01"
                className="form-input"
                value={tasaBcv}
                onChange={(e) => setTasaBcv(e.target.value)}
                required
              />
            </div>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '0.75rem',
          }}
        >
          <div>
            <label htmlFor="int-banco" className="form-field-label">
              Banco
            </label>
            <select
              id="int-banco"
              className="form-input"
              value={bancoEmisor}
              onChange={(e) => setBancoEmisor(e.target.value)}
            >
              <option value="">Selecciona banco...</option>
              {BANCOS_VENEZUELA.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="int-ref" className="form-field-label">
              Referencia
            </label>
            <input
              id="int-ref"
              type="text"
              className="form-input"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
            />
          </div>
          {medioPago === 'pago_movil' && (
            <div>
              <label htmlFor="int-tel" className="form-field-label">
                Teléfono emisor
              </label>
              <input
                id="int-tel"
                type="tel"
                className="form-input"
                value={telefonoEmisor}
                onChange={(e) => setTelefonoEmisor(e.target.value)}
              />
            </div>
          )}
        </div>

        <div>
          <label htmlFor="int-actividad" className="form-field-label">
            Culto / Servicio / Actividad / Responsable (opcional)
          </label>
          <input
            id="int-actividad"
            type="text"
            className="form-input"
            placeholder="Ej: Culto Dominical 10:00 AM"
            value={actividad}
            onChange={(e) => setActividad(e.target.value)}
          />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.5rem',
            marginTop: '0.5rem',
          }}
        >
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            <Save size={16} /> {submitting ? 'Guardando...' : 'Guardar Aporte'}
          </button>
        </div>
      </form>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
