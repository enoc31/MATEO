import React from 'react';
import { CheckCircle2, Layers, Plus, Trash2, Wand2 } from 'lucide-react';
import type { Beneficiary } from '../services/api';
import {
  CATEGORIAS_APORTE,
  type CategoriaAporte,
  type IncomeCategoryOption,
} from '../utils/rolePermissions';
import {
  CASH_CURRENCY_CODES,
  CURRENCY_CONES,
  convertCashAmountToUsd,
  formatCurrencyByCode,
  type CashCurrencyCode,
  type ConeCountSummary,
  type MultiCurrencyRatesToUsd,
} from '../utils/currencyDenominations';
import { formatUsd } from '../utils/formatters';
import { MemberAutocomplete } from './MemberAutocomplete';

export interface CashCategoryAllocationItem {
  id: string;
  categoria: CategoriaAporte;
  moneda: CashCurrencyCode;
  monto: string;
  member: Beneficiary | null;
}

interface CashCategoryAllocatorProps {
  allocations: CashCategoryAllocationItem[];
  activeCones: ConeCountSummary[];
  rates: MultiCurrencyRatesToUsd;
  totalCountedUsd: number;
  members: Beneficiary[];
  categories?: IncomeCategoryOption[];
  onAddAllocation: () => void;
  onUpdateAllocation: (id: string, patch: Partial<CashCategoryAllocationItem>) => void;
  onRemoveAllocation: (id: string) => void;
  onAssignRemaining: (id: string) => void;
}

export const CashCategoryAllocator: React.FC<CashCategoryAllocatorProps> = ({
  allocations,
  activeCones,
  rates,
  totalCountedUsd,
  members,
  categories = CATEGORIAS_APORTE,
  onAddAllocation,
  onUpdateAllocation,
  onRemoveAllocation,
  onAssignRemaining,
}) => {
  const availableCurrencies: CashCurrencyCode[] =
    activeCones.length > 0 ? activeCones.map((c) => c.code) : CASH_CURRENCY_CODES;

  const totalAllocatedUsd = Number(
    allocations
      .reduce((sum, item) => {
        const parsed = parseFloat(item.monto);
        if (!Number.isFinite(parsed) || parsed <= 0) return sum;
        return sum + convertCashAmountToUsd(parsed, item.moneda, rates[item.moneda]);
      }, 0)
      .toFixed(2),
  );

  const remainingUsd = Number((totalCountedUsd - totalAllocatedUsd).toFixed(2));
  const isBalanced = totalCountedUsd > 0 && Math.abs(remainingUsd) <= 0.01;
  const isOverAllocated = remainingUsd < -0.01;

  return (
    <div
      data-testid="cash-category-allocator"
      style={{
        border: '1px solid #cbd5e1',
        borderRadius: '10px',
        backgroundColor: '#f8fafc',
        padding: '1.1rem',
        display: 'grid',
        gap: '0.9rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.6rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <Layers size={18} color="var(--primary)" />
          <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>
            Distribución por Categoría y Miembro (Cuadre del Conteo) *
          </strong>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '0.8rem',
              padding: '0.25rem 0.6rem',
              borderRadius: '999px',
              backgroundColor: '#e2e8f0',
              color: '#1e293b',
              fontWeight: 700,
            }}
          >
            Contado: {formatUsd(totalCountedUsd)} USD
          </span>
          <span
            style={{
              fontSize: '0.8rem',
              padding: '0.25rem 0.6rem',
              borderRadius: '999px',
              backgroundColor: '#dbeafe',
              color: '#1e40af',
              fontWeight: 700,
            }}
          >
            Asignado: {formatUsd(totalAllocatedUsd)} USD
          </span>
          {totalCountedUsd > 0 && (
            <span
              data-testid="allocation-balance-status"
              style={{
                fontSize: '0.8rem',
                padding: '0.25rem 0.65rem',
                borderRadius: '999px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                backgroundColor: isBalanced ? '#dcfce7' : isOverAllocated ? '#fee2e2' : '#fef3c7',
                color: isBalanced ? '#166534' : isOverAllocated ? '#b91c1c' : '#92400e',
              }}
            >
              {isBalanced && <CheckCircle2 size={14} />}
              {isBalanced
                ? 'Cuadrado'
                : isOverAllocated
                  ? `Excede por ${formatUsd(Math.abs(remainingUsd))} USD`
                  : `Falta asignar ${formatUsd(remainingUsd)} USD`}
            </span>
          )}
        </div>
      </div>

      {activeCones.length === 0 ? (
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
          Ingresa primero las cantidades de billetes arriba para distribuir el total contado entre
          categorías y, si aplica, asignar montos a miembros específicos.
        </p>
      ) : (
        <>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {allocations.map((item, idx) => {
              const parsedAmount = parseFloat(item.monto);
              const rowUsd =
                Number.isFinite(parsedAmount) && parsedAmount > 0
                  ? convertCashAmountToUsd(parsedAmount, item.moneda, rates[item.moneda])
                  : 0;

              return (
                <div
                  key={item.id}
                  data-testid={`allocation-row-${idx}`}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '0.85rem',
                    display: 'grid',
                    gap: '0.75rem',
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                      gap: '0.75rem',
                      alignItems: 'end',
                    }}
                  >
                    <div>
                      <label htmlFor={`alloc-cat-${item.id}`} className="form-field-label">
                        Categoría *
                      </label>
                      <select
                        id={`alloc-cat-${item.id}`}
                        data-testid={`allocation-category-${idx}`}
                        className="form-input"
                        value={item.categoria}
                        onChange={(e) =>
                          onUpdateAllocation(item.id, {
                            categoria: e.target.value as CategoriaAporte,
                          })
                        }
                      >
                        {categories.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor={`alloc-cur-${item.id}`} className="form-field-label">
                        Moneda *
                      </label>
                      <select
                        id={`alloc-cur-${item.id}`}
                        data-testid={`allocation-currency-${idx}`}
                        className="form-input"
                        value={item.moneda}
                        onChange={(e) =>
                          onUpdateAllocation(item.id, {
                            moneda: e.target.value as CashCurrencyCode,
                          })
                        }
                      >
                        {availableCurrencies.map((code) => (
                          <option key={code} value={code}>
                            {CURRENCY_CONES[code].flag} {code} ({CURRENCY_CONES[code].symbol})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor={`alloc-amt-${item.id}`} className="form-field-label">
                        Monto ({item.moneda}) *
                      </label>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <input
                          id={`alloc-amt-${item.id}`}
                          data-testid={`allocation-amount-${idx}`}
                          type="number"
                          step="0.01"
                          min="0.01"
                          className="form-input"
                          placeholder="0.00"
                          value={item.monto}
                          onChange={(e) => onUpdateAllocation(item.id, { monto: e.target.value })}
                          required
                        />
                        {remainingUsd > 0.01 && (
                          <button
                            type="button"
                            data-testid={`allocation-fill-remaining-${idx}`}
                            className="btn btn-outline"
                            title="Completar con el saldo restante del conteo"
                            onClick={() => onAssignRemaining(item.id)}
                            style={{
                              whiteSpace: 'nowrap',
                              padding: '0.4rem 0.6rem',
                              fontSize: '0.78rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}
                          >
                            <Wand2 size={13} /> Restante
                          </button>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.5rem',
                        minHeight: '38px',
                      }}
                    >
                      <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 700 }}>
                        {rowUsd > 0 ? (
                          <>
                            ≈ <strong style={{ color: '#059669' }}>{formatUsd(rowUsd)} USD</strong>
                            {item.moneda !== 'USD' && (
                              <span
                                style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}
                              >
                                ({formatCurrencyByCode(parsedAmount, item.moneda)})
                              </span>
                            )}
                          </>
                        ) : (
                          'Sin monto'
                        )}
                      </span>

                      {allocations.length > 1 && (
                        <button
                          type="button"
                          data-testid={`remove-allocation-${idx}`}
                          aria-label={`Eliminar asignación ${idx + 1}`}
                          onClick={() => onRemoveAllocation(item.id)}
                          style={{
                            backgroundColor: '#fee2e2',
                            color: '#b91c1c',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.4rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                  <MemberAutocomplete
                    id={`alloc-member-${item.id}`}
                    label="Miembro de la comunidad asignado (opcional)"
                    members={members}
                    selectedMemberId={item.member?.id || ''}
                    onSelect={(member) => onUpdateAllocation(item.id, { member })}
                    placeholder="Opcional: buscar miembro por nombre o cédula..."
                  />
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <button
              type="button"
              data-testid="add-allocation-btn"
              className="btn btn-outline"
              onClick={onAddAllocation}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontWeight: 700,
              }}
            >
              <Plus size={15} /> Agregar otra categoría / asignación
            </button>
          </div>
        </>
      )}
    </div>
  );
};
