import React, { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import { api, type Beneficiary } from '../../services/api';
import { financeApi, type MedioPagoAporte } from '../../services/financeApi';
import {
  BANCOS_VENEZUELA,
  CATEGORIAS_APORTE,
  type CategoriaAporte,
} from '../../utils/rolePermissions';
import { formatUsd, getCaracasDateParts } from '../../utils/formatters';
import {
  calculateMultiCurrencySessionSummary,
  createDefaultMultiCurrencyRates,
  createEmptyMultiCurrencyCounts,
  type CashCurrencyCode,
  type MultiCurrencyBillCounts,
  type MultiCurrencyRatesToUsd,
} from '../../utils/currencyDenominations';
import { CashDenominationCounter } from '../../components/CashDenominationCounter';

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
  const [donanteNombre, setDonanteNombre] = useState('Conteo de Ofrenda en Culto');
  const [categoria, setCategoria] = useState<CategoriaAporte>('ofrenda');
  const [moneda, setMoneda] = useState<'USD' | 'VES'>('USD');
  const [montoOriginal, setMontoOriginal] = useState('');
  const [tasaBcv, setTasaBcv] = useState('');
  const [medioPago, setMedioPago] = useState<MedioPagoAporte>('efectivo');
  const [fecha, setFecha] = useState(() => getCaracasDateParts().dateString);
  const [referencia, setReferencia] = useState('');
  const [bancoEmisor, setBancoEmisor] = useState('');
  const [telefonoEmisor, setTelefonoEmisor] = useState('');
  const [actividad, setActividad] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Estado de arqueo de billetes multimoneda (solo para efectivo)
  const [activeCashCone, setActiveCashCone] = useState<CashCurrencyCode>('VES');
  const [cashCounts, setCashCounts] = useState<MultiCurrencyBillCounts>(() =>
    createEmptyMultiCurrencyCounts(),
  );
  const [cashRates, setCashRates] = useState<MultiCurrencyRatesToUsd>(() =>
    createDefaultMultiCurrencyRates(),
  );

  useEffect(() => {
    if (!isOpen) return;
    const loadData = async () => {
      try {
        const [memList, rateObj] = await Promise.all([
          api.getBeneficiaries(),
          api.getTasaByDate(fecha),
        ]);
        setMembers(memList);
        if (rateObj && rateObj.tasa > 1) {
          setTasaBcv(String(rateObj.tasa));
          setCashRates((prev) => ({
            ...prev,
            VES: rateObj.tasa,
          }));
        }
      } catch (err) {
        console.error('Error cargando datos para aporte interno:', err);
      }
    };
    void loadData();
  }, [isOpen, fecha]);

  if (!isOpen) return null;

  const isCash = medioPago === 'efectivo';
  const sessionSummary = calculateMultiCurrencySessionSummary(cashCounts, cashRates);

  const handleMemberSelect = (id: string) => {
    setMiembroId(id);
    if (id) {
      const m = members.find((item) => item.id === id);
      if (m) setDonanteNombre(`${m.nombre} ${m.apellido}`.trim());
    } else {
      setDonanteNombre('Conteo de Ofrenda en Culto');
    }
  };

  const handleChangeCashCount = (
    currency: CashCurrencyCode,
    denomination: number,
    count: number,
  ) => {
    setCashCounts((prev) => ({
      ...prev,
      [currency]: {
        ...prev[currency],
        [denomination]: count,
      },
    }));
  };

  const handleChangeCashRate = (currency: CashCurrencyCode, rate: number) => {
    setCashRates((prev) => ({
      ...prev,
      [currency]: rate,
    }));
    if (currency === 'VES' && rate > 0) {
      setTasaBcv(String(rate));
    }
  };

  const handleClearCashCurrency = (currency: CashCurrencyCode) => {
    setCashCounts((prev) => ({
      ...prev,
      [currency]: {},
    }));
  };

  const handleClearAllCash = () => {
    setCashCounts(createEmptyMultiCurrencyCounts());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isCash) {
      if (sessionSummary.activeCones.length === 0) {
        onFeedback(
          'Debe ingresar la cantidad de billetes contados en al menos un cono monetario.',
          'error',
        );
        return;
      }

      for (const coneItem of sessionSummary.activeCones) {
        if (coneItem.code !== 'USD' && (!coneItem.rateToUsd || coneItem.rateToUsd <= 0)) {
          onFeedback(
            `Debe indicar una tasa de cambio válida para el cono ${coneItem.code}.`,
            'error',
          );
          return;
        }
        if (coneItem.equivalentUsd <= 0) {
          onFeedback(
            `El monto equivalente en USD para el cono ${coneItem.code} debe ser mayor a 0.`,
            'error',
          );
          return;
        }
      }

      setSubmitting(true);
      try {
        const cleanActivity = actividad.trim() || null;
        for (const coneItem of sessionSummary.activeCones) {
          const appliedRate =
            coneItem.code === 'USD'
              ? cashRates.VES > 0
                ? cashRates.VES
                : null
              : coneItem.rateToUsd;

          const montoVes =
            coneItem.code === 'VES'
              ? coneItem.totalAmountOriginal
              : coneItem.code === 'USD' && cashRates.VES > 0
                ? parseFloat((coneItem.totalAmountOriginal * cashRates.VES).toFixed(2))
                : null;

          const desc = `${categoria.toUpperCase()} — Registro Interno${
            cleanActivity ? ` (${cleanActivity})` : ''
          } | ${coneItem.breakdownText}`;

          await financeApi.registrarAporteInterno({
            ong_id: ongId,
            miembro_id: miembroId || null,
            donante_nombre: donanteNombre,
            categoria_aporte: categoria,
            moneda: coneItem.code,
            monto_original: coneItem.totalAmountOriginal,
            tasa_bcv: appliedRate,
            monto_usd: coneItem.equivalentUsd,
            monto_ves: montoVes,
            medio_pago: 'efectivo',
            referencia: null,
            banco_emisor: null,
            telefono_emisor: null,
            fecha,
            actividad_o_responsable: cleanActivity,
            descripcion: desc,
            userId,
          });
        }

        handleClearAllCash();
        await onSuccess();
        const successMsg =
          sessionSummary.activeCones.length > 1
            ? `Aportes en efectivo registrados exitosamente (${sessionSummary.activeCones.length} conos monetarios).`
            : 'Aporte interno registrado exitosamente.';
        onFeedback(successMsg, 'success');
        onClose();
      } catch (err) {
        console.error('Error registrando aporte interno en efectivo:', err);
        const msg = err instanceof Error ? err.message : 'Error al registrar aporte interno.';
        onFeedback(msg, 'error');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Flujo estándar para Transferencia o Pago Móvil
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="internal-income-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        zIndex: 1200,
        overflowY: 'auto',
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="card"
        style={{
          maxWidth: isCash ? '900px' : '580px',
          width: '100%',
          padding: '1.5rem',
          display: 'grid',
          gap: '0.9rem',
          maxHeight: '92vh',
          overflowY: 'auto',
          transition: 'max-width 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 id="internal-income-title" style={{ margin: 0, color: 'var(--primary)' }}>
            Registrar Aporte Interno
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
              <option value="">General / Conteo de Culto</option>
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
              onChange={(e) => setMedioPago(e.target.value as MedioPagoAporte)}
            >
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="pago_movil">Pago Móvil</option>
            </select>
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
        </div>

        {/* Pantalla de Conteo de Billetes por Cono Monetario (SOLO EN EFECTIVO) */}
        {isCash ? (
          <CashDenominationCounter
            counts={cashCounts}
            rates={cashRates}
            activeCurrency={activeCashCone}
            onActiveCurrencyChange={setActiveCashCone}
            onChangeCount={handleChangeCashCount}
            onChangeRate={handleChangeCashRate}
            onClearCurrency={handleClearCashCurrency}
            onClearAll={handleClearAllCash}
          />
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '0.75rem',
              }}
            >
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
          </>
        )}

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
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem',
            marginTop: '0.5rem',
          }}
        >
          <div style={{ fontSize: '0.84rem', color: '#334155', fontWeight: 600 }}>
            {isCash && sessionSummary.activeCones.length > 0 && (
              <span>
                Total a registrar:{' '}
                <strong>{formatUsd(sessionSummary.totalConsolidatedUsd)} USD</strong> (
                {sessionSummary.activeCones.map((c) => c.code).join(' + ')})
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <Save size={16} /> {submitting ? 'Guardando...' : 'Guardar Aporte'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
