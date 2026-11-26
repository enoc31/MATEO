import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Banknote, CheckCircle2, Landmark, Plus, Save, UserPlus, X } from 'lucide-react';
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
  convertCashAmountToUsd,
  convertUsdToCashAmount,
  createDefaultMultiCurrencyRates,
  createEmptyMultiCurrencyCounts,
  type CashCurrencyCode,
  type MultiCurrencyBillCounts,
  type MultiCurrencyRatesToUsd,
} from '../../utils/currencyDenominations';
import { buildCashActDescription, createCashActSessionTag } from '../../utils/cashIntakeActPdf';
import { CashDenominationCounter } from '../../components/CashDenominationCounter';
import {
  CashCategoryAllocator,
  type CashCategoryAllocationItem,
} from '../../components/CashCategoryAllocator';
import { MemberAutocomplete } from '../../components/MemberAutocomplete';

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
  const [donanteNombre, setDonanteNombre] = useState('');
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

  const handleMemberSelect = (member: Beneficiary | null) => {
    if (member) {
      setMiembroId(member.id);
      setDonanteNombre(`${member.nombre} ${member.apellido}`.trim());
    } else {
      setMiembroId('');
      setDonanteNombre('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!miembroId) {
      setFeedback({
        msg: 'Debe seleccionar un miembro vinculado para registrar el aporte interno.',
        type: 'error',
      });
      return;
    }

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
        miembro_id: miembroId,
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
          <ArrowLeft size={16} /> Volver a Ingresos
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
          <MemberAutocomplete
            id="int-bank-miembro"
            label="Miembro vinculado *"
            members={members}
            selectedMemberId={miembroId}
            onSelect={handleMemberSelect}
            required
          />

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
  const [donanteNombre, setDonanteNombre] = useState('Conteo de Ofrenda en Culto');
  const [fecha, setFecha] = useState(() => getCaracasDateParts().dateString);
  const [actividad, setActividad] = useState('');
  const [additionalCounters, setAdditionalCounters] = useState<string[]>([]);
  const [newCounterName, setNewCounterName] = useState('');
  const [allocations, setAllocations] = useState<CashCategoryAllocationItem[]>([
    { id: 'alloc-1', categoria: 'ofrenda', moneda: 'VES', monto: '', member: null },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const loggedResponsibleName =
    profile?.nombre_completo?.trim() || profile?.email || 'Tesorero / Administrador';

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
  const activeConeCodesKey = sessionSummary.activeCones.map((c) => c.code).join(',');

  useEffect(() => {
    if (!activeConeCodesKey) return;
    const validCodes = activeConeCodesKey.split(',') as CashCurrencyCode[];
    setAllocations((prev) =>
      prev.map((item) =>
        !validCodes.includes(item.moneda) && !item.monto
          ? { ...item, moneda: validCodes[0] }
          : item,
      ),
    );
  }, [activeConeCodesKey]);

  const handleAddAllocation = () => {
    const defaultCurrency: CashCurrencyCode = sessionSummary.activeCones[0]?.code || activeCashCone;
    setAllocations((prev) => [
      ...prev,
      {
        id: `alloc-${Date.now()}-${prev.length + 1}`,
        categoria: 'diezmo',
        moneda: defaultCurrency,
        monto: '',
        member: null,
      },
    ]);
  };

  const handleUpdateAllocation = (id: string, patch: Partial<CashCategoryAllocationItem>) => {
    setAllocations((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const handleRemoveAllocation = (id: string) => {
    setAllocations((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));
  };

  const handleAssignRemaining = (targetId: string) => {
    const targetRow = allocations.find((a) => a.id === targetId);
    if (!targetRow) return;

    const otherAllocatedUsd = allocations.reduce((sum, item) => {
      if (item.id === targetId) return sum;
      const parsed = parseFloat(item.monto);
      if (!Number.isFinite(parsed) || parsed <= 0) return sum;
      return sum + convertCashAmountToUsd(parsed, item.moneda, cashRates[item.moneda]);
    }, 0);

    const remainingUsd = Number(
      (sessionSummary.totalConsolidatedUsd - otherAllocatedUsd).toFixed(2),
    );
    if (remainingUsd <= 0) return;

    const amountInTargetCurrency = convertUsdToCashAmount(
      remainingUsd,
      targetRow.moneda,
      cashRates[targetRow.moneda],
    );
    if (amountInTargetCurrency > 0) {
      handleUpdateAllocation(targetId, { monto: String(amountInTargetCurrency) });
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

  const handleAddCounterPerson = (rawName: string) => {
    const entries = rawName
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (entries.length === 0) return;
    setAdditionalCounters((prev) => {
      const next = [...prev];
      for (const item of entries) {
        if (!next.includes(item)) {
          next.push(item);
        }
      }
      return next;
    });
    setNewCounterName('');
  };

  const handleRemoveCounterPerson = (nameToRemove: string) => {
    setAdditionalCounters((prev) => prev.filter((n) => n !== nameToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const cleanActivity = actividad.trim();
    if (!cleanActivity) {
      setFeedback({
        msg: 'Debe indicar la actividad, culto o servicio asociado al arqueo de efectivo.',
        type: 'error',
      });
      return;
    }

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

    const parsedAllocations: {
      categoria: CategoriaAporte;
      moneda: CashCurrencyCode;
      montoOriginal: number;
      appliedRate: number | null;
      montoUsd: number;
      montoVes: number | null;
      member: Beneficiary | null;
    }[] = [];

    for (let i = 0; i < allocations.length; i += 1) {
      const alloc = allocations[i];
      const numAmount = parseFloat(alloc.monto);
      if (!Number.isFinite(numAmount) || numAmount <= 0) {
        setFeedback({
          msg: `Debe ingresar un monto mayor a 0 en la categoría #${i + 1}.`,
          type: 'error',
        });
        return;
      }
      const rateForCurrency = cashRates[alloc.moneda];
      if (alloc.moneda !== 'USD' && (!rateForCurrency || rateForCurrency <= 0)) {
        setFeedback({
          msg: `Debe indicar una tasa de cambio válida para ${alloc.moneda}.`,
          type: 'error',
        });
        return;
      }
      const montoUsd = convertCashAmountToUsd(numAmount, alloc.moneda, rateForCurrency);
      const appliedRate =
        alloc.moneda === 'USD' ? (cashRates.VES > 0 ? cashRates.VES : null) : rateForCurrency;
      const montoVes =
        alloc.moneda === 'VES'
          ? numAmount
          : alloc.moneda === 'USD' && cashRates.VES > 0
            ? parseFloat((numAmount * cashRates.VES).toFixed(2))
            : null;

      parsedAllocations.push({
        categoria: alloc.categoria,
        moneda: alloc.moneda,
        montoOriginal: numAmount,
        appliedRate,
        montoUsd,
        montoVes,
        member: alloc.member,
      });
    }

    const totalAllocatedUsd = Number(
      parsedAllocations.reduce((sum, item) => sum + item.montoUsd, 0).toFixed(2),
    );
    if (Math.abs(totalAllocatedUsd - sessionSummary.totalConsolidatedUsd) > 0.01) {
      setFeedback({
        msg: `La suma de las categorías asignadas (${formatUsd(totalAllocatedUsd)} USD) debe cuadrar exactamente con el total contado en billetes (${formatUsd(sessionSummary.totalConsolidatedUsd)} USD).`,
        type: 'error',
      });
      return;
    }

    setSubmitting(true);
    try {
      const pendingTypedCounters = newCounterName
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const finalCounters = Array.from(new Set([...additionalCounters, ...pendingTypedCounters]));
      const sessionTag = createCashActSessionTag();
      const combinedBreakdownText = sessionSummary.activeCones
        .map((c) => c.breakdownText)
        .filter(Boolean)
        .join(' | ');

      for (let idx = 0; idx < parsedAllocations.length; idx += 1) {
        const alloc = parsedAllocations[idx];
        const desc = buildCashActDescription({
          categoria: alloc.categoria,
          actividad: cleanActivity,
          responsibleUser: loggedResponsibleName,
          additionalCounters: finalCounters,
          sessionTag,
          combinedBreakdownText: idx === 0 ? combinedBreakdownText : null,
        });

        await financeApi.registrarAporteInterno({
          ong_id: resolvedOngId,
          miembro_id: alloc.member?.id || null,
          donante_nombre: alloc.member
            ? `${alloc.member.nombre} ${alloc.member.apellido}`.trim()
            : donanteNombre,
          categoria_aporte: alloc.categoria,
          moneda: alloc.moneda,
          monto_original: alloc.montoOriginal,
          tasa_bcv: alloc.appliedRate,
          monto_usd: alloc.montoUsd,
          monto_ves: alloc.montoVes,
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
      setAllocations([
        { id: 'alloc-1', categoria: 'ofrenda', moneda: activeCashCone, monto: '', member: null },
      ]);
      const successMsg =
        parsedAllocations.length > 1
          ? `Arqueo en efectivo registrado exitosamente (${parsedAllocations.length} categorías asignadas).`
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
          <ArrowLeft size={16} /> Volver a Ingresos
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
            <label htmlFor="int-page-nombre" className="form-field-label">
              Concepto general del conteo *
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
            Culto / Servicio / Actividad asociada *
          </label>
          <input
            id="int-page-actividad"
            type="text"
            className="form-input"
            placeholder="Ej: Culto Dominical 10:00 AM"
            value={actividad}
            onChange={(e) => setActividad(e.target.value)}
            required
          />
        </div>

        {/* Comisión de Conteo para el Acta de Ingreso */}
        <div
          style={{
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            backgroundColor: '#f8fafc',
            padding: '1rem',
            display: 'grid',
            gap: '0.75rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <UserPlus size={18} color="var(--primary)" />
              <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>
                Comisión de Conteo (Para el Acta de Ingreso en PDF)
              </strong>
            </div>
            <span style={{ fontSize: '0.8rem', color: '#475569' }}>
              Responsable principal:{' '}
              <strong style={{ color: 'var(--primary)' }}>{loggedResponsibleName}</strong>
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '0.75rem',
              alignItems: 'end',
            }}
          >
            <div>
              <label htmlFor="int-page-counter-input" className="form-field-label">
                Personas adicionales involucradas en el conteo
              </label>
              <div style={{ display: 'flex', gap: '0.45rem' }}>
                <input
                  id="int-page-counter-input"
                  data-testid="additional-counter-input"
                  type="text"
                  className="form-input"
                  placeholder="Ej: Pedro Gómez, María Rodríguez"
                  value={newCounterName}
                  onChange={(e) => setNewCounterName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCounterPerson(newCounterName);
                    }
                  }}
                />
                <button
                  type="button"
                  data-testid="add-counter-btn"
                  className="btn btn-outline"
                  onClick={() => handleAddCounterPerson(newCounterName)}
                  style={{
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                >
                  <Plus size={15} /> Agregar
                </button>
              </div>
            </div>

            {members.length > 0 && (
              <div>
                <label htmlFor="int-page-counter-member" className="form-field-label">
                  O seleccionar miembro del directorio
                </label>
                <select
                  id="int-page-counter-member"
                  className="form-input"
                  value=""
                  onChange={(e) => {
                    const selected = members.find((m) => m.id === e.target.value);
                    if (selected) {
                      handleAddCounterPerson(`${selected.nombre} ${selected.apellido}`.trim());
                    }
                  }}
                >
                  <option value="">+ Seleccionar miembro asistente al conteo...</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre} {m.apellido} ({m.cedula})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {additionalCounters.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
              {additionalCounters.map((person) => (
                <span
                  key={person}
                  data-testid={`counter-chip-${person}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.28rem 0.65rem',
                    borderRadius: '999px',
                    backgroundColor: '#e0f2fe',
                    color: '#0369a1',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                  }}
                >
                  {person}
                  <button
                    type="button"
                    aria-label={`Quitar a ${person} del conteo`}
                    onClick={() => handleRemoveCounterPerson(person)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0369a1',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'inline-flex',
                    }}
                  >
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
          )}
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

        {/* Distribución del total contado por categorías y miembros opcionales */}
        <CashCategoryAllocator
          allocations={allocations}
          activeCones={sessionSummary.activeCones}
          rates={cashRates}
          totalCountedUsd={sessionSummary.totalConsolidatedUsd}
          members={members}
          onAddAllocation={handleAddAllocation}
          onUpdateAllocation={handleUpdateAllocation}
          onRemoveAllocation={handleRemoveAllocation}
          onAssignRemaining={handleAssignRemaining}
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
