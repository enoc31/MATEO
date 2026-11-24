import React, { useMemo, useState } from 'react';
import {
  Banknote,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Filter,
  Landmark,
  Plus,
  Search,
  Wallet,
} from 'lucide-react';
import type { Donation } from '../../services/api';
import { formatCategoriaAporte } from '../../utils/rolePermissions';
import { formatAmount, formatDateForFrontEnd, formatUsd, formatVes } from '../../utils/formatters';
import { formatCurrencyByCode, type CashCurrencyCode } from '../../utils/currencyDenominations';
import { generateCashIntakeActPdf, parseCashActDescription } from '../../utils/cashIntakeActPdf';
import '../../components/DataTable.css';

type IncomeTab = 'todos' | 'diezmo' | 'ofrenda' | 'otros';

export interface FinanceIncomesTableProps {
  donations: Donation[];
  canManage: boolean;
  onImportStatement: () => void;
  onRegisterInternal: () => void;
  onOpenCashCounter?: () => void;
  organizationName?: string;
  loggedUserName?: string;
}

export const FinanceIncomesTable: React.FC<FinanceIncomesTableProps> = ({
  donations,
  canManage,
  onImportStatement,
  onRegisterInternal,
  onOpenCashCounter,
  organizationName,
  loggedUserName,
}) => {
  const [activeTab, setActiveTab] = useState<IncomeTab>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [currencyFilter, setCurrencyFilter] = useState<'todos' | CashCurrencyCode>('todos');
  const [methodFilter, setMethodFilter] = useState<
    'todos' | 'pago_movil' | 'transferencia' | 'efectivo'
  >('todos');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredDonations = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return donations.filter((d) => {
      if (activeTab === 'diezmo' && d.categoria_aporte !== 'diezmo') return false;
      if (activeTab === 'ofrenda' && d.categoria_aporte !== 'ofrenda') return false;
      if (
        activeTab === 'otros' &&
        (d.categoria_aporte === 'diezmo' || d.categoria_aporte === 'ofrenda')
      ) {
        return false;
      }
      if (currencyFilter !== 'todos' && (d.moneda || 'USD') !== currencyFilter) return false;
      if (methodFilter !== 'todos' && (d.medio_pago || 'efectivo') !== methodFilter) return false;
      if (q) {
        const hay = [d.donante, d.referencia, d.descripcion, d.actividad_o_responsable]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [donations, activeTab, currencyFilter, methodFilter, searchTerm]);

  const totalUsd = useMemo(
    () => filteredDonations.reduce((acc, d) => acc + (d.monto_usd || d.monto || 0), 0),
    [filteredDonations],
  );

  const totalFiltered = filteredDonations.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const pageDonations = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredDonations.slice(start, start + pageSize);
  }, [filteredDonations, safePage, pageSize]);

  const allOnPageSelected =
    pageDonations.length > 0 && pageDonations.every((d) => selectedIds.has(d.id));

  const toggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (allOnPageSelected) {
      pageDonations.forEach((d) => next.delete(d.id));
    } else {
      pageDonations.forEach((d) => next.add(d.id));
    }
    setSelectedIds(next);
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleExpand = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
  };

  const rangeStart = totalFiltered === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, totalFiltered);

  return (
    <div className="mdt-wrapper">
      <div className="mdt-top-bar">
        <div className="mdt-tabs" role="tablist" aria-label="Categorías de ingresos">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'todos'}
            className={`mdt-tab ${activeTab === 'todos' ? 'mdt-tab--active' : ''}`}
            onClick={() => {
              setActiveTab('todos');
              setCurrentPage(1);
            }}
          >
            Todos
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'diezmo'}
            className={`mdt-tab ${activeTab === 'diezmo' ? 'mdt-tab--active' : ''}`}
            onClick={() => {
              setActiveTab('diezmo');
              setCurrentPage(1);
            }}
          >
            Diezmos
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'ofrenda'}
            className={`mdt-tab ${activeTab === 'ofrenda' ? 'mdt-tab--active' : ''}`}
            onClick={() => {
              setActiveTab('ofrenda');
              setCurrentPage(1);
            }}
          >
            Ofrendas
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'otros'}
            className={`mdt-tab ${activeTab === 'otros' ? 'mdt-tab--active' : ''}`}
            onClick={() => {
              setActiveTab('otros');
              setCurrentPage(1);
            }}
          >
            Misiones y Otros
          </button>
        </div>

        <div className="mdt-summary mdt-nowrap">
          Total confirmado: <strong>{formatUsd(totalUsd)}</strong> ({totalFiltered} aportes)
        </div>
      </div>

      <div className="mdt-card">
        <div className="mdt-toolbar">
          <div className="mdt-toolbar-left">
            <button
              type="button"
              className={`mdt-filter-btn ${showFilters ? 'mdt-filter-btn--active' : ''}`}
              onClick={() => setShowFilters((p) => !p)}
            >
              <Filter size={15} />
              Filtrar
            </button>

            <div className="mdt-search-box">
              <Search size={16} className="mdt-search-icon" />
              <input
                type="text"
                className="mdt-search-input"
                placeholder="Buscar por aportante, referencia o descripción..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Buscar aporte"
              />
            </div>
          </div>

          {canManage && (
            <div className="mdt-toolbar-actions">
              <button type="button" className="mdt-secondary-btn" onClick={onImportStatement}>
                <Landmark size={15} />
                Importar Extracto
              </button>
              {onOpenCashCounter && (
                <button type="button" className="mdt-secondary-btn" onClick={onOpenCashCounter}>
                  <Banknote size={15} />
                  Arqueo de Efectivo
                </button>
              )}
              <button type="button" className="mdt-primary-btn" onClick={onRegisterInternal}>
                <Plus size={15} />
                Registrar Aporte
              </button>
            </div>
          )}
        </div>

        {showFilters && (
          <div className="mdt-filter-drawer">
            <label htmlFor="inc-currency" className="mdt-secondary-text">
              Moneda:
            </label>
            <select
              id="inc-currency"
              className="mdt-filter-select"
              value={currencyFilter}
              onChange={(e) => {
                setCurrencyFilter(e.target.value as 'todos' | CashCurrencyCode);
                setCurrentPage(1);
              }}
            >
              <option value="todos">Todas</option>
              <option value="USD">USD ($)</option>
              <option value="VES">VES (Bs.)</option>
              <option value="EUR">EUR (€)</option>
              <option value="COP">COP ($)</option>
            </select>

            <label htmlFor="inc-method" className="mdt-secondary-text">
              Método:
            </label>
            <select
              id="inc-method"
              className="mdt-filter-select"
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(
                  e.target.value as 'todos' | 'pago_movil' | 'transferencia' | 'efectivo',
                );
                setCurrentPage(1);
              }}
            >
              <option value="todos">Todos</option>
              <option value="pago_movil">Pago Móvil</option>
              <option value="transferencia">Transferencia</option>
              <option value="efectivo">Efectivo</option>
            </select>
          </div>
        )}

        {pageDonations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            <Wallet size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.35 }} />
            <p style={{ fontWeight: 700, margin: 0 }}>No hay aportes confirmados</p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Ajusta los filtros o registra un nuevo aporte interno.
            </p>
          </div>
        ) : (
          <div className="mdt-table-scroll">
            <table className="mdt-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      className="mdt-checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleSelectAll}
                      aria-label="Seleccionar todos los aportes de la página"
                    />
                  </th>
                  <th style={{ width: '36px' }} aria-label="Expandir detalle" />
                  <th>Aportante / Fecha</th>
                  <th>Categoría / Método</th>
                  <th>Moneda</th>
                  <th className="mdt-align-right">Monto Original</th>
                  <th className="mdt-align-right">Equivalente USD</th>
                </tr>
              </thead>
              <tbody>
                {pageDonations.map((d) => {
                  const isSelected = selectedIds.has(d.id);
                  const isExpanded = expandedIds.has(d.id);
                  const methodLabel =
                    d.medio_pago === 'pago_movil'
                      ? 'Pago Móvil'
                      : d.medio_pago === 'transferencia'
                        ? 'Transferencia'
                        : 'Efectivo';

                  return (
                    <React.Fragment key={d.id}>
                      <tr className={`mdt-row ${isSelected ? 'mdt-row--selected' : ''}`}>
                        <td>
                          <input
                            type="checkbox"
                            className="mdt-checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(d.id)}
                            aria-label={`Seleccionar aporte de ${d.donante}`}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`mdt-expand-btn ${isExpanded ? 'mdt-expand-btn--open' : ''}`}
                            onClick={() => toggleExpand(d.id)}
                            aria-expanded={isExpanded}
                            aria-label={`Ver detalle de aporte de ${d.donante}`}
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        </td>
                        <td>
                          <div className="mdt-primary-text">{d.donante}</div>
                          <div className="mdt-secondary-text mdt-nowrap">
                            {formatDateForFrontEnd(d.fecha)}
                          </div>
                        </td>
                        <td>
                          <span className="mdt-pill mdt-pill--role">
                            <span className="mdt-pill-dot" />
                            {formatCategoriaAporte(d.categoria_aporte)}
                          </span>
                          <div className="mdt-secondary-text">{methodLabel}</div>
                          {d.medio_pago === 'efectivo' && (
                            <button
                              type="button"
                              data-testid={`download-acta-btn-${d.id}`}
                              onClick={() =>
                                generateCashIntakeActPdf({
                                  donation: d,
                                  allDonations: donations,
                                  organizationName,
                                  loggedUserName,
                                })
                              }
                              style={{
                                marginTop: '0.25rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                color: 'var(--primary)',
                                fontWeight: 700,
                                fontSize: '0.76rem',
                                textDecoration: 'underline',
                                cursor: 'pointer',
                              }}
                            >
                              <FileText size={13} /> Acta de Ingreso (PDF)
                            </button>
                          )}
                        </td>
                        <td>
                          <span
                            className={`mdt-pill ${
                              d.moneda === 'VES' ? 'mdt-pill--pending' : 'mdt-pill--baptized'
                            }`}
                          >
                            <span className="mdt-pill-dot" />
                            {d.moneda || 'USD'}
                          </span>
                        </td>
                        <td className="mdt-align-right mdt-nowrap">
                          <div className="mdt-primary-text mdt-nowrap">
                            {d.moneda === 'VES'
                              ? formatVes(d.monto_original || 0)
                              : d.moneda === 'EUR' || d.moneda === 'COP'
                                ? formatCurrencyByCode(d.monto_original || 0, d.moneda)
                                : formatUsd(d.monto_original || d.monto)}
                          </div>
                        </td>
                        <td className="mdt-align-right mdt-nowrap">
                          <div className="mdt-primary-text mdt-nowrap" style={{ color: '#059669' }}>
                            {formatUsd(d.monto_usd || d.monto)}
                          </div>
                          <div className="mdt-secondary-text">USD</div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="mdt-expanded-row">
                          <td colSpan={7}>
                            <div className="mdt-expanded-grid">
                              <div>
                                <div className="mdt-expanded-label">Descripción</div>
                                <div className="mdt-expanded-value">
                                  {d.descripcion || 'Sin descripción'}
                                </div>
                              </div>
                              <div>
                                <div className="mdt-expanded-label">Referencia</div>
                                <div className="mdt-expanded-value mdt-nowrap">
                                  {d.referencia || 'N/A'}
                                </div>
                              </div>
                              <div>
                                <div className="mdt-expanded-label">Tasa de cambio aplicada</div>
                                <div className="mdt-expanded-value mdt-nowrap">
                                  {d.tasa_bcv
                                    ? `${formatAmount(d.tasa_bcv, 4)} ${
                                        d.moneda === 'EUR'
                                          ? '$/€'
                                          : d.moneda === 'COP'
                                            ? 'COP/$'
                                            : 'Bs/$'
                                      }`
                                    : 'N/A'}
                                </div>
                              </div>
                              <div>
                                <div className="mdt-expanded-label">Responsable / Actividad</div>
                                <div className="mdt-expanded-value">
                                  {d.actividad_o_responsable || 'No especificado'}
                                </div>
                              </div>
                              {d.medio_pago === 'efectivo' &&
                                (() => {
                                  const cashMeta = parseCashActDescription(d.descripcion, d.moneda);
                                  return (
                                    <div>
                                      <div className="mdt-expanded-label">
                                        Comisión de Conteo / Acta
                                      </div>
                                      <div className="mdt-expanded-value">
                                        {cashMeta.additionalCounters.length > 0
                                          ? `Contadores adicionales: ${cashMeta.additionalCounters.join(', ')}`
                                          : 'Sin contadores adicionales'}
                                      </div>
                                    </div>
                                  );
                                })()}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mdt-footer mdt-nowrap">
          <div className="mdt-rows-per-page">
            <span>Filas por página:</span>
            <select
              aria-label="Filas por página"
              className="mdt-rows-select"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <span>
            {rangeStart}-{rangeEnd} de {totalFiltered}
          </span>

          <div className="mdt-page-nav">
            <button
              type="button"
              className="mdt-page-btn"
              aria-label="Página anterior"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className="mdt-page-btn"
              aria-label="Página siguiente"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
