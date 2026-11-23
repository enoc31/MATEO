import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Banknote, CheckCircle2, Landmark, Save } from 'lucide-react';
import { api, type Beneficiary } from '../../services/api';
import { financeApi, type MedioPagoAporte } from '../../services/financeApi';
import { useAuth } from '../../context/AuthContext';
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

/**
 * Pantalla dedicada 1 (Sin Modal):
 * Registrar Aporte Interno para Transferencia Bancaria o Pago Móvil (/app/registrar-aporte)
 */
export const InternalBankIncomePage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <InternalBankIncomePageContent
      navigate={(path) => {
        if (typeof path === 'number') navigate(path);
        else navigate(path);
      }}
    />
  );
};

export const InternalBankIncomePageContent: React.FC<{
  navigate: (path: string | number) => void;
}> = ({ navigate }) => {
  const { profile, activeOng } = useAuth();
  const resolvedOngId = activeOng?.id || profile?.ong_id || '11111111-1111-1111-1111-111111111111';

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
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
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
  }, [fecha]);

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
    setFeedback(null);

    const numMonto = parseFloat(montoOriginal);
    if (isNaN(numMonto) || numMonto <= 0) {
      setFeedback({ msg: 'El monto debe ser mayor a 0.', type: 'error' });
      return;
    }

    const numTasa = tasaBcv ? parseFloat(tasaBcv) : null;
    if (moneda === 'VES' && (!numTasa || numTasa <= 0)) {
      setFeedback({
        msg: 'Debe indicar una tasa BCV válida para registrar en Bolívares.',
        type: 'error',
      });
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
        ong_id: resolvedOngId,
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
        userId: profile?.id,
      });
      setFeedback({ msg: 'Aporte interno registrado exitosamente.', type: 'success' });
      setTimeout(() => {
        navigate('/app/finance');
      }, 900);
    } catch (err) {
      console.error('Error registrando aporte interno:', err);
      const msg = err instanceof Error ? err.message : 'Error al registrar aporte interno.';
      setFeedback({ msg, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      data-testid="internal-bank-income-page"
      className="animate-fade-in-up"
      style={{
        maxWidth: '820px',
        margin: '0 auto',
        display: 'grid',
        gap: '1.25rem',
        paddingBottom: '2.5rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: '1.55rem',
              fontWeight: 800,
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
            }}
          >
            <Landmark size={24} /> Registrar Aporte Interno
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.88rem' }}>
            Registra aportes internos recibidos por transferencia bancaria o pago móvil.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline"
          onClick={() => navigate('/app/finance')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700 }}
        >
          <ArrowLeft size={16} /> Volver a Ingresos y Gastos
        </button>
      </div>

      {feedback && (
        <div
          role="status"
          style={{
            padding: '0.9rem 1.1rem',
            borderRadius: '10px',
            backgroundColor: feedback.type === 'error' ? '#fee2e2' : '#ecfdf5',
            color: feedback.type === 'error' ? '#b91c1c' : '#065f46',
            fontWeight: 700,
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          {feedback.type === 'success' && <CheckCircle2 size={18} />}
          <span>{feedback.msg}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="card"
        style={{
          padding: '1.75rem',
          display: 'grid',
          gap: '1.15rem',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1rem',
          }}
        >
          <div>
            <label htmlFor="int-bank-miembro" className="form-field-label">
              Miembro vinculado (opcional)
            </label>
            <select
              id="int-bank-miembro"
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
            <label htmlFor="int-bank-nombre" className="form-field-label">
              Aportante / Concepto *
            </label>
            <input
              id="int-bank-nombre"
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
          }}
        >
          <div>
            <label htmlFor="int-bank-cat" className="form-field-label">
              Categoría *
            </label>
            <select
              id="int-bank-cat"
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
            <label htmlFor="int-bank-metodo" className="form-field-label">
              Método *
            </label>
            <select
              id="int-bank-metodo"
              className="form-input"
              value={medioPago}
              onChange={(e) => setMedioPago(e.target.value as Exclude<MedioPagoAporte, 'efectivo'>)}
            >
              <option value="transferencia">Transferencia</option>
              <option value="pago_movil">Pago Móvil</option>
            </select>
          </div>

          <div>
            <label htmlFor="int-bank-moneda" className="form-field-label">
              Moneda *
            </label>
            <select
              id="int-bank-moneda"
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
          }}
        >
          <div>
            <label htmlFor="int-bank-monto" className="form-field-label">
              Monto ({moneda}) *
            </label>
            <input
              id="int-bank-monto"
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
            <label htmlFor="int-bank-fecha" className="form-field-label">
              Fecha *
            </label>
            <input
              id="int-bank-fecha"
              type="date"
              className="form-input"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
            />
          </div>

          {moneda === 'VES' && (
            <div>
              <label htmlFor="int-bank-tasa" className="form-field-label">
                Tasa BCV *
              </label>
              <input
                id="int-bank-tasa"
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
          }}
        >
          <div>
            <label htmlFor="int-bank-banco" className="form-field-label">
              Banco
            </label>
            <select
              id="int-bank-banco"
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
            <label htmlFor="int-bank-ref" className="form-field-label">
              Referencia
            </label>
            <input
              id="int-bank-ref"
              type="text"
              className="form-input"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
            />
          </div>
          {medioPago === 'pago_movil' && (
            <div>
              <label htmlFor="int-bank-tel" className="form-field-label">
                Teléfono emisor
              </label>
              <input
                id="int-bank-tel"
                type="tel"
                className="form-input"
                value={telefonoEmisor}
                onChange={(e) => setTelefonoEmisor(e.target.value)}
              />
            </div>
          )}
        </div>

        <div>
          <label htmlFor="int-bank-actividad" className="form-field-label">
            Culto / Servicio / Actividad / Responsable (opcional)
          </label>
          <input
            id="int-bank-actividad"
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
            gap: '0.65rem',
            borderTop: '1px solid #e2e8f0',
            paddingTop: '1.1rem',
          }}
        >
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate('/app/finance')}
            disabled={submitting}
          >
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            <Save size={16} /> {submitting ? 'Guardando...' : 'Guardar Aporte'}
          </button>
        </div>
      </form>
    </div>
  );
};

/**
 * Pantalla dedicada 2 (Sin Modal):
 * Arqueo y Registro de Efectivo (/app/arqueo-efectivo)
 */
export const InternalIncomePage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <InternalIncomePageContent
      navigate={(path) => {
        if (typeof path === 'number') navigate(path);
        else navigate(path);
      }}
    />
  );
};

export const InternalIncomePageContent: React.FC<{
  navigate: (path: string | number) => void;
}> = ({ navigate }) => {
  const { profile, activeOng } = useAuth();
  const resolvedOngId = activeOng?.id || profile?.ong_id || '11111111-1111-1111-1111-111111111111';

  const [members, setMembers] = useState<Beneficiary[]>([]);
  const [miembroId, setMiembroId] = useState('');
  const [donanteNombre, setDonanteNombre] = useState('Conteo de Ofrenda en Culto');
  const [categoria, setCategoria] = useState<CategoriaAporte>('ofrenda');
  const [fecha, setFecha] = useState(() => getCaracasDateParts().dateString);
  const [actividad, setActividad] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Estado de arqueo de billetes multimoneda (exclusivo para efectivo)
  const [activeCashCone, setActiveCashCone] = useState<CashCurrencyCode>('VES');
  const [cashCounts, setCashCounts] = useState<MultiCurrencyBillCounts>(() =>
    createEmptyMultiCurrencyCounts(),
  );
  const [cashRates, setCashRates] = useState<MultiCurrencyRatesToUsd>(() =>
    createDefaultMultiCurrencyRates(),
  );

  useEffect(() => {
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
          setCashRates((prev) => ({
            ...prev,
            VES: resolvedRate,
          }));
        }
      } catch (err) {
        console.error('Error cargando datos para arqueo de efectivo:', err);
      }
    };
    void loadData();
  }, [fecha]);

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
    setFeedback(null);

    if (sessionSummary.activeCones.length === 0) {
      setFeedback({
        msg: 'Debe ingresar la cantidad de billetes contados en al menos un cono monetario.',
        type: 'error',
      });
      return;
    }

    for (const coneItem of sessionSummary.activeCones) {
      if (coneItem.code !== 'USD' && (!coneItem.rateToUsd || coneItem.rateToUsd <= 0)) {
        setFeedback({
          msg: `Debe indicar una tasa de cambio válida para el cono ${coneItem.code}.`,
          type: 'error',
        });
        return;
      }
      if (coneItem.equivalentUsd <= 0) {
        setFeedback({
          msg: `El monto equivalente en USD para el cono ${coneItem.code} debe ser mayor a 0.`,
          type: 'error',
        });
        return;
      }
    }

    setSubmitting(true);
    try {
      const cleanActivity = actividad.trim() || null;
      for (const coneItem of sessionSummary.activeCones) {
        const appliedRate =
          coneItem.code === 'USD' ? (cashRates.VES > 0 ? cashRates.VES : null) : coneItem.rateToUsd;

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
          ong_id: resolvedOngId,
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
          userId: profile?.id,
        });
      }

      handleClearAllCash();
      const successMsg =
        sessionSummary.activeCones.length > 1
          ? `Arqueo en efectivo registrado exitosamente (${sessionSummary.activeCones.length} conos monetarios).`
          : 'Arqueo en efectivo registrado exitosamente.';
      setFeedback({ msg: successMsg, type: 'success' });
      setTimeout(() => {
        navigate('/app/finance');
      }, 900);
    } catch (err) {
      console.error('Error registrando arqueo en efectivo:', err);
      const msg = err instanceof Error ? err.message : 'Error al registrar arqueo en efectivo.';
      setFeedback({ msg, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      data-testid="internal-income-page"
      className="animate-fade-in-up"
      style={{
        maxWidth: '1040px',
        margin: '0 auto',
        display: 'grid',
        gap: '1.25rem',
        paddingBottom: '2.5rem',
      }}
    >
      {/* Cabecera de la pantalla dedicada */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: '1.55rem',
              fontWeight: 800,
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
            }}
          >
            <Banknote size={24} /> Arqueo y Registro de Efectivo
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.88rem' }}>
            Carga las cantidades de billetes contados por especie monetaria (Venezolano,
            Estadounidense, Europeo o Colombiano).
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline"
          onClick={() => navigate('/app/finance')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700 }}
        >
          <ArrowLeft size={16} /> Volver a Ingresos y Gastos
        </button>
      </div>

      {feedback && (
        <div
          role="status"
          style={{
            padding: '0.9rem 1.1rem',
            borderRadius: '10px',
            backgroundColor: feedback.type === 'error' ? '#fee2e2' : '#ecfdf5',
            color: feedback.type === 'error' ? '#b91c1c' : '#065f46',
            fontWeight: 700,
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          {feedback.type === 'success' && <CheckCircle2 size={18} />}
          <span>{feedback.msg}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="card"
        style={{
          padding: '1.75rem',
          display: 'grid',
          gap: '1.25rem',
        }}
      >
        {/* Datos generales del Conteo en Efectivo */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
          }}
        >
          <div>
            <label htmlFor="int-page-miembro" className="form-field-label">
              Miembro vinculado (opcional)
            </label>
            <select
              id="int-page-miembro"
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
            <label htmlFor="int-page-nombre" className="form-field-label">
              Aportante / Concepto *
            </label>
            <input
              id="int-page-nombre"
              type="text"
              className="form-input"
              value={donanteNombre}
              onChange={(e) => setDonanteNombre(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="int-page-cat" className="form-field-label">
              Categoría *
            </label>
            <select
              id="int-page-cat"
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
            <label htmlFor="int-page-fecha" className="form-field-label">
              Fecha del Conteo *
            </label>
            <input
              id="int-page-fecha"
              type="date"
              className="form-input"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="int-page-actividad" className="form-field-label">
            Culto / Servicio / Actividad / Responsable (opcional)
          </label>
          <input
            id="int-page-actividad"
            type="text"
            className="form-input"
            placeholder="Ej: Culto Dominical 10:00 AM"
            value={actividad}
            onChange={(e) => setActividad(e.target.value)}
          />
        </div>

        {/* Pantalla completa de Arqueo de Billetes por Especie Monetaria */}
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

        {/* Barra de acción inferior */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            borderTop: '1px solid #e2e8f0',
            paddingTop: '1.1rem',
          }}
        >
          <div style={{ fontSize: '0.92rem', color: '#334155', fontWeight: 700 }}>
            {sessionSummary.activeCones.length > 0 && (
              <span>
                Total a registrar:{' '}
                <strong style={{ color: '#059669' }}>
                  {formatUsd(sessionSummary.totalConsolidatedUsd)} USD
                </strong>{' '}
                ({sessionSummary.activeCones.map((c) => c.code).join(' + ')})
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.65rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate('/app/finance')}
              disabled={submitting}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <Save size={16} /> {submitting ? 'Guardando...' : 'Guardar Arqueo en Efectivo'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
