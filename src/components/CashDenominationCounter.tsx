import React, { useState } from 'react';
import { Banknote, Minus, Plus, RotateCcw } from 'lucide-react';
import {
  CASH_CURRENCY_CODES,
  CURRENCY_CONES,
  calculateMultiCurrencySessionSummary,
  formatCurrencyByCode,
  type CashCurrencyCode,
  type MultiCurrencyBillCounts,
  type MultiCurrencyRatesToUsd,
} from '../utils/currencyDenominations';
import { formatUsd } from '../utils/formatters';
import { BanknoteThumbnail } from './BanknoteThumbnail';

export interface CashDenominationCounterProps {
  counts: MultiCurrencyBillCounts;
  rates: MultiCurrencyRatesToUsd;
  activeCurrency?: CashCurrencyCode;
  onActiveCurrencyChange?: (code: CashCurrencyCode) => void;
  onChangeCount: (currency: CashCurrencyCode, denomination: number, count: number) => void;
  onChangeRate: (currency: CashCurrencyCode, rate: number) => void;
  onClearCurrency: (currency: CashCurrencyCode) => void;
  onClearAll: () => void;
}

export const CashDenominationCounter: React.FC<CashDenominationCounterProps> = ({
  counts,
  rates,
  activeCurrency: controlledCurrency,
  onActiveCurrencyChange,
  onChangeCount,
  onChangeRate,
  onClearCurrency,
  onClearAll,
}) => {
  const [internalCurrency, setInternalCurrency] = useState<CashCurrencyCode>('VES');
  const activeCurrency = controlledCurrency ?? internalCurrency;

  const handleSelectCurrency = (code: CashCurrencyCode) => {
    setInternalCurrency(code);
    onActiveCurrencyChange?.(code);
  };

  const cone = CURRENCY_CONES[activeCurrency];
  const sessionSummary = calculateMultiCurrencySessionSummary(counts, rates);
  const currentConeSummary = sessionSummary.byCurrency[activeCurrency];

  const handleStep = (denomValue: number, delta: number) => {
    const current = counts[activeCurrency]?.[denomValue] || 0;
    const next = Math.max(0, current + delta);
    onChangeCount(activeCurrency, denomValue, next);
  };

  const handleInputChange = (denomValue: number, raw: string) => {
    if (raw.trim() === '') {
      onChangeCount(activeCurrency, denomValue, 0);
      return;
    }
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      onChangeCount(activeCurrency, denomValue, 0);
      return;
    }
    onChangeCount(activeCurrency, denomValue, parsed);
  };

  return (
    <div
      data-testid="cash-denomination-counter"
      style={{
        border: '1px solid #cbd5e1',
        borderRadius: '12px',
        backgroundColor: '#f8fafc',
        padding: '1rem',
        display: 'grid',
        gap: '0.9rem',
      }}
    >
      {/* Cabecera del Arqueo */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Banknote size={20} color="var(--primary)" />
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
              Arqueo y Conteo de Billetes por Especie Monetaria
            </div>
            <div style={{ fontSize: '0.78rem', color: '#475569' }}>
              Puedes cargar billetes en uno o varios conos monetarios en la misma sesión.
            </div>
          </div>
        </div>

        {sessionSummary.totalBillsAllCones > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="btn btn-outline"
            style={{
              padding: '0.35rem 0.65rem',
              fontSize: '0.76rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <RotateCcw size={13} /> Reiniciar todo el conteo
          </button>
        )}
      </div>

      {/* Pestañas de Conos Monetarios */}
      <div
        role="tablist"
        aria-label="Conos monetarios de billetes"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))',
          gap: '0.5rem',
        }}
      >
        {CASH_CURRENCY_CODES.map((code) => {
          const itemCone = CURRENCY_CONES[code];
          const itemSummary = sessionSummary.byCurrency[code];
          const isSelected = activeCurrency === code;
          const hasBills = itemSummary.totalBills > 0;

          return (
            <button
              key={code}
              type="button"
              role="tab"
              aria-selected={isSelected}
              data-testid={`cone-tab-${code}`}
              onClick={() => handleSelectCurrency(code)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                padding: '0.6rem 0.75rem',
                borderRadius: '10px',
                border: isSelected
                  ? '2px solid var(--primary)'
                  : hasBills
                    ? '2px solid #059669'
                    : '1px solid #cbd5e1',
                backgroundColor: isSelected ? '#eff6ff' : hasBills ? '#ecfdf5' : '#ffffff',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                minHeight: '58px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  gap: '0.35rem',
                }}
              >
                <span style={{ fontWeight: 800, fontSize: '0.84rem', color: '#0f172a' }}>
                  {itemCone.flag} {itemCone.coneLabel}
                </span>
                {hasBills && (
                  <span
                    data-testid={`cone-badge-${code}`}
                    style={{
                      backgroundColor: '#059669',
                      color: '#ffffff',
                      borderRadius: '999px',
                      padding: '0.1rem 0.45rem',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                    }}
                  >
                    {itemSummary.totalBills}
                  </span>
                )}
              </div>

              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: hasBills ? 700 : 500,
                  color: hasBills ? '#065f46' : '#64748b',
                  marginTop: '0.2rem',
                }}
              >
                {hasBills
                  ? formatCurrencyByCode(itemSummary.totalAmountOriginal, code)
                  : 'Sin billetes contados'}
              </div>
            </button>
          );
        })}
      </div>

      {/* Barra de Tasa de Cambio del Cono Activo (si no es USD) */}
      {cone.usdConversionMode !== 'identity' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            padding: '0.65rem 0.85rem',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
          }}
        >
          <div>
            <label
              htmlFor={`rate-input-${activeCurrency}`}
              style={{
                display: 'block',
                fontWeight: 700,
                fontSize: '0.82rem',
                color: '#1e293b',
              }}
            >
              {cone.rateLabel} *
            </label>
            <span style={{ fontSize: '0.73rem', color: '#64748b' }}>{cone.rateHelper}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              id={`rate-input-${activeCurrency}`}
              data-testid={`rate-input-${activeCurrency}`}
              type="number"
              step="0.0001"
              min="0.0001"
              className="form-input"
              value={rates[activeCurrency] || ''}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onChangeRate(activeCurrency, Number.isFinite(val) && val > 0 ? val : 0);
              }}
              style={{ width: '140px', fontWeight: 700, textAlign: 'right' }}
            />
          </div>
        </div>
      )}

      {/* Grilla de Especies Monetarias / Billetes del Cono Activo */}
      <div
        role="tabpanel"
        aria-label={`Billetes del cono ${cone.coneLabel}`}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(255px, 1fr))',
          gap: '0.65rem',
        }}
      >
        {cone.denominations.map((denom) => {
          const count = counts[activeCurrency]?.[denom.value] || 0;
          const subtotal = count * denom.value;
          const isRowActive = count > 0;
          const inputId = `bill-input-${activeCurrency}-${denom.value}`;

          return (
            <div
              key={`${activeCurrency}-${denom.value}`}
              data-testid={`denomination-row-${activeCurrency}-${denom.value}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.65rem',
                padding: '0.55rem 0.7rem',
                borderRadius: '10px',
                backgroundColor: isRowActive ? '#ffffff' : '#f1f5f9',
                border: isRowActive ? `2px solid ${denom.primaryColor}` : '1px solid #e2e8f0',
                boxShadow: isRowActive ? '0 3px 8px rgba(15, 23, 42, 0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Miniatura del Billete + Denominación */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                <BanknoteThumbnail
                  currency={activeCurrency}
                  denomination={denom}
                  isActive={isRowActive}
                />
                <div style={{ minWidth: 0 }}>
                  <label
                    htmlFor={inputId}
                    style={{
                      display: 'block',
                      fontWeight: 800,
                      fontSize: '0.84rem',
                      color: '#0f172a',
                      cursor: 'pointer',
                    }}
                  >
                    {denom.shortLabel}
                  </label>
                  <div
                    data-testid={`subtotal-${activeCurrency}-${denom.value}`}
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: isRowActive ? 700 : 500,
                      color: isRowActive ? '#059669' : '#64748b',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isRowActive
                      ? `= ${formatCurrencyByCode(subtotal, activeCurrency)}`
                      : 'Subtotal: 0'}
                  </div>
                </div>
              </div>

              {/* Controles de Cantidad (- / input / +) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <button
                  type="button"
                  aria-label={`Restar billete de ${denom.shortLabel} (${activeCurrency})`}
                  onClick={() => handleStep(denom.value, -1)}
                  disabled={count <= 0}
                  style={{
                    width: '34px',
                    height: '36px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: count > 0 ? '#ffffff' : '#f8fafc',
                    color: count > 0 ? '#0f172a' : '#94a3b8',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: count > 0 ? 'pointer' : 'not-allowed',
                  }}
                >
                  <Minus size={14} />
                </button>

                <input
                  id={inputId}
                  data-testid={inputId}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  aria-label={`Cantidad de billetes de ${denom.shortLabel} (${activeCurrency})`}
                  value={count === 0 ? '' : count}
                  placeholder="0"
                  onChange={(e) => handleInputChange(denom.value, e.target.value)}
                  style={{
                    width: '56px',
                    height: '36px',
                    textAlign: 'center',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                  }}
                />

                <button
                  type="button"
                  aria-label={`Sumar billete de ${denom.shortLabel} (${activeCurrency})`}
                  onClick={() => handleStep(denom.value, 1)}
                  style={{
                    width: '34px',
                    height: '36px',
                    borderRadius: '6px',
                    border: '1px solid var(--primary)',
                    backgroundColor: 'var(--primary)',
                    color: '#ffffff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Subtotal del Cono Activo */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem',
          padding: '0.65rem 0.85rem',
          borderRadius: '8px',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ fontSize: '0.82rem', color: '#334155' }}>
          Subtotal <strong>{cone.coneLabel}</strong>:{' '}
          <strong style={{ color: 'var(--primary)', fontSize: '0.92rem' }}>
            {formatCurrencyByCode(currentConeSummary.totalAmountOriginal, activeCurrency)}
          </strong>{' '}
          ({currentConeSummary.totalBills}{' '}
          {currentConeSummary.totalBills === 1 ? 'billete' : 'billetes'})
          {activeCurrency !== 'USD' && currentConeSummary.totalAmountOriginal > 0 && (
            <span style={{ marginLeft: '0.5rem', color: '#059669', fontWeight: 700 }}>
              ≈ {formatUsd(currentConeSummary.equivalentUsd)} USD
            </span>
          )}
        </div>

        {currentConeSummary.totalBills > 0 && (
          <button
            type="button"
            onClick={() => onClearCurrency(activeCurrency)}
            style={{
              background: 'none',
              border: 'none',
              color: '#dc2626',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Limpiar {activeCurrency}
          </button>
        )}
      </div>

      {/* Resumen Consolidado Multimoneda de la Sesión */}
      {sessionSummary.activeCones.length > 0 && (
        <div
          data-testid="multicurrency-session-summary"
          style={{
            backgroundColor: '#0f172a',
            color: '#f8fafc',
            borderRadius: '10px',
            padding: '0.85rem 1rem',
            display: 'grid',
            gap: '0.55rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
              paddingBottom: '0.45rem',
            }}
          >
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8' }}>
              RESUMEN DE SESIÓN MULTIMONEDA ({sessionSummary.activeCones.length}{' '}
              {sessionSummary.activeCones.length === 1 ? 'cono activo' : 'conos activos'} •{' '}
              {sessionSummary.totalBillsAllCones} billetes)
            </span>
            <span
              data-testid="consolidated-usd-total"
              style={{ fontSize: '1.05rem', fontWeight: 800, color: '#34d399' }}
            >
              Total Equivalente: {formatUsd(sessionSummary.totalConsolidatedUsd)} USD
            </span>
          </div>

          <div style={{ display: 'grid', gap: '0.35rem' }}>
            {sessionSummary.activeCones.map((activeItem) => {
              const itemConfig = CURRENCY_CONES[activeItem.code];
              return (
                <div
                  key={activeItem.code}
                  data-testid={`active-cone-summary-${activeItem.code}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    fontSize: '0.8rem',
                  }}
                >
                  <span>
                    {itemConfig.flag} <strong>{activeItem.code}</strong>:{' '}
                    {formatCurrencyByCode(activeItem.totalAmountOriginal, activeItem.code)} (
                    {activeItem.totalBills} pzs)
                  </span>
                  <span style={{ color: '#cbd5e1', fontWeight: 600 }}>
                    Equiv. USD:{' '}
                    <strong style={{ color: '#ffffff' }}>
                      {formatUsd(activeItem.equivalentUsd)}
                    </strong>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
