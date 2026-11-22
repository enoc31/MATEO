import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Eye,
  Filter,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
  XCircle,
} from 'lucide-react';
import type { BankTransaction, Donation } from '../../services/api';
import { financeApi, findDuplicateReferences, type ReporteAporte } from '../../services/financeApi';
import { formatAmount, formatDateForFrontEnd, formatUsd, formatVes } from '../../utils/formatters';
import { formatCategoriaAporte } from '../../utils/rolePermissions';
import '../../components/DataTable.css';

interface VerificationQueueTabProps {
  reportes: ReporteAporte[];
  donations: Donation[];
  bankTxs: BankTransaction[];
  canManage: boolean;
  userId?: string;
  onRefresh: () => Promise<void>;
  onFeedback: (msg: string, type?: 'success' | 'error') => void;
}

export const VerificationQueueTab: React.FC<VerificationQueueTabProps> = ({
  reportes,
  donations,
  bankTxs,
  canManage,
  userId,
  onRefresh,
  onFeedback,
}) => {
  const [statusFilter, setStatusFilter] = useState<
    'pendiente' | 'aprobado' | 'rechazado' | 'todos'
  >('pendiente');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [methodFilter, setMethodFilter] = useState<
    'todos' | 'pago_movil' | 'transferencia' | 'efectivo'
  >('todos');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [approvingReport, setApprovingReport] = useState<ReporteAporte | null>(null);
  const [approveRate, setApproveRate] = useState<string>('');
  const [selectedTxId, setSelectedTxId] = useState<string>('');
  const [rejectingReport, setRejectingReport] = useState<ReporteAporte | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [previewReport, setPreviewReport] = useState<ReporteAporte | null>(null);
  const [processing, setProcessing] = useState(false);

  const duplicatesMap = findDuplicateReferences(reportes, donations);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return reportes.filter((r) => {
      if (statusFilter !== 'todos' && r.estado !== statusFilter) return false;
      if (methodFilter !== 'todos' && r.medio_pago !== methodFilter) return false;
      if (q) {
        const hay = [
          r.codigo_confirmacion,
          r.miembro_nombre,
          r.miembro_cedula,
          r.nombre_aportante,
          r.cedula_aportante,
          r.referencia,
          r.banco_emisor,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [reportes, statusFilter, methodFilter, searchTerm]);

  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const pageReports = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  const allOnPageSelected =
    pageReports.length > 0 && pageReports.every((r) => selectedIds.has(r.id));

  const toggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (allOnPageSelected) {
      pageReports.forEach((r) => next.delete(r.id));
    } else {
      pageReports.forEach((r) => next.add(r.id));
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

  const openApproveModal = (rep: ReporteAporte) => {
    setApprovingReport(rep);
    setApproveRate(rep.tasa_bcv ? String(rep.tasa_bcv) : '');
    setSelectedTxId('');
  };

  const handleConfirmApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingReport) return;

    const parsedRate = approveRate.trim() ? parseFloat(approveRate) : null;
    if (approvingReport.moneda === 'VES' && (!parsedRate || parsedRate <= 0)) {
      onFeedback('Debes indicar una tasa BCV válida mayor a 0 para aportes en VES.', 'error');
      return;
    }

    setProcessing(true);
    try {
      await financeApi.aprobarReporteAporte({
        reporteId: approvingReport.id,
        tasaBcv: parsedRate,
        transaccionId: selectedTxId || null,
        verifierUserId: userId,
      });
      setApprovingReport(null);
      await onRefresh();
      onFeedback('Aporte aprobado y sumado al libro de ingresos.', 'success');
    } catch (err) {
      console.error('Error aprobando reporte:', err);
      const msg = err instanceof Error ? err.message : 'No se pudo aprobar el reporte.';
      onFeedback(msg, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingReport) return;
    if (!rejectReason.trim()) {
      onFeedback('El motivo de rechazo es obligatorio.', 'error');
      return;
    }

    setProcessing(true);
    try {
      await financeApi.rechazarReporteAporte(rejectingReport.id, rejectReason, userId);
      setRejectingReport(null);
      setRejectReason('');
      await onRefresh();
      onFeedback('Reporte rechazado con motivo auditado.', 'success');
    } catch (err) {
      console.error('Error rechazando reporte:', err);
      const msg = err instanceof Error ? err.message : 'No se pudo rechazar el reporte.';
      onFeedback(msg, 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="mdt-wrapper">
      <div className="mdt-top-bar">
        <div className="mdt-tabs" role="tablist" aria-label="Estados de reportes por verificar">
          {(
            [
              { id: 'pendiente', label: 'Pendientes' },
              { id: 'aprobado', label: 'Aprobados' },
              { id: 'rechazado', label: 'Rechazados' },
              { id: 'todos', label: 'Todos' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={statusFilter === tab.id}
              className={`mdt-tab ${statusFilter === tab.id ? 'mdt-tab--active' : ''}`}
              onClick={() => {
                setStatusFilter(tab.id);
                setCurrentPage(1);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mdt-summary mdt-nowrap">
          Mostrando <strong>{totalFiltered}</strong> reporte(s)
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
                placeholder="Buscar por código, miembro, cédula o referencia..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Buscar reporte por verificar"
              />
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="mdt-filter-drawer">
            <label htmlFor="verif-method" className="mdt-secondary-text">
              Método de pago:
            </label>
            <select
              id="verif-method"
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

        {pageReports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            <Clock size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.35 }} />
            <p style={{ fontWeight: 700, margin: 0 }}>
              No hay reportes en estado &quot;{statusFilter}&quot;.
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
                      aria-label="Seleccionar todos los reportes de la página"
                    />
                  </th>
                  <th style={{ width: '36px' }} aria-label="Expandir detalle" />
                  <th>Aportante / Código</th>
                  <th>Estado / Método</th>
                  <th>Comprobante</th>
                  <th className="mdt-align-right">Monto</th>
                  <th className="mdt-align-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pageReports.map((rep) => {
                  const dup = duplicatesMap[rep.id];
                  const isSelected = selectedIds.has(rep.id);
                  const isExpanded = expandedIds.has(rep.id);
                  const methodLabel =
                    rep.medio_pago === 'pago_movil'
                      ? 'Pago Móvil'
                      : rep.medio_pago === 'transferencia'
                        ? 'Transferencia'
                        : 'Efectivo';
                  const statusPillClass =
                    rep.estado === 'aprobado'
                      ? 'mdt-pill--baptized'
                      : rep.estado === 'rechazado'
                        ? 'mdt-pill--danger'
                        : 'mdt-pill--pending';

                  return (
                    <React.Fragment key={rep.id}>
                      <tr className={`mdt-row ${isSelected ? 'mdt-row--selected' : ''}`}>
                        <td>
                          <input
                            type="checkbox"
                            className="mdt-checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(rep.id)}
                            aria-label={`Seleccionar reporte ${rep.codigo_confirmacion}`}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`mdt-expand-btn ${isExpanded ? 'mdt-expand-btn--open' : ''}`}
                            onClick={() => toggleExpand(rep.id)}
                            aria-expanded={isExpanded}
                            aria-label={`Ver detalle de ${rep.codigo_confirmacion}`}
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        </td>
                        <td>
                          <div
                            className="mdt-primary-text"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              flexWrap: 'wrap',
                            }}
                          >
                            {rep.es_anonimo ? (
                              <>
                                <UserX size={14} /> Aporte Anónimo / Visitante
                              </>
                            ) : rep.miembro_id ? (
                              <>
                                <UserCheck size={14} color="#10b981" />
                                <span>
                                  {rep.miembro_nombre ||
                                    rep.nombre_aportante ||
                                    `Miembro (${rep.miembro_id.slice(0, 8)}…)`}
                                  {(rep.miembro_cedula || rep.cedula_aportante) &&
                                    ` · C.I. ${rep.miembro_cedula || rep.cedula_aportante}`}
                                </span>
                              </>
                            ) : (
                              <span>
                                {rep.nombre_aportante || 'Visitante'}
                                {rep.telefono_aportante ? ` · ${rep.telefono_aportante}` : ''}
                              </span>
                            )}
                            {dup?.hasDuplicate && (
                              <span
                                className="mdt-pill mdt-pill--pending"
                                title={dup.reason}
                                role="alert"
                              >
                                <AlertTriangle size={12} /> Ref. duplicada
                              </span>
                            )}
                          </div>
                          <div className="mdt-secondary-text">
                            <strong>{rep.codigo_confirmacion}</strong> ·{' '}
                            {formatCategoriaAporte(rep.categoria_aporte)} ·{' '}
                            {formatDateForFrontEnd(rep.fecha_pago)}
                          </div>
                        </td>
                        <td>
                          <span className={`mdt-pill ${statusPillClass}`}>
                            <span className="mdt-pill-dot" />
                            {rep.estado.toUpperCase()}
                          </span>
                          <div className="mdt-secondary-text">
                            {methodLabel}
                            {rep.referencia ? ` · Ref ${rep.referencia}` : ''}
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="mdt-view-more-btn"
                            onClick={() => setPreviewReport(rep)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              color: 'var(--primary, #1b5cb6)',
                              textDecoration: 'underline',
                              fontWeight: 600,
                            }}
                          >
                            <Eye size={14} /> Ver comprobante
                          </button>
                        </td>
                        <td className="mdt-align-right mdt-nowrap">
                          <div className="mdt-primary-text mdt-nowrap">
                            {rep.moneda === 'VES'
                              ? formatVes(rep.monto_original)
                              : `${formatUsd(rep.monto_original)} USD`}
                          </div>
                          <div className="mdt-secondary-text mdt-nowrap">
                            Equiv. {formatUsd(rep.monto_usd)}
                          </div>
                        </td>
                        <td>
                          <div className="mdt-actions-cell">
                            {canManage && rep.estado === 'pendiente' && (
                              <>
                                <button
                                  type="button"
                                  className="mdt-action-reject"
                                  onClick={() => {
                                    setRejectingReport(rep);
                                    setRejectReason('');
                                  }}
                                >
                                  <XCircle size={13} /> Rechazar
                                </button>
                                <button
                                  type="button"
                                  className="mdt-action-approve"
                                  onClick={() => openApproveModal(rep)}
                                >
                                  <CheckCircle size={13} /> Aprobar
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="mdt-expanded-row">
                          <td colSpan={7}>
                            <div className="mdt-expanded-grid">
                              <div>
                                <div className="mdt-expanded-label">Banco / Emisor</div>
                                <div className="mdt-expanded-value">
                                  {rep.banco_emisor || 'No especificado'}
                                  {rep.telefono_emisor ? ` · ${rep.telefono_emisor}` : ''}
                                </div>
                              </div>
                              <div>
                                <div className="mdt-expanded-label">Referencia</div>
                                <div className="mdt-expanded-value mdt-nowrap">
                                  {rep.referencia ||
                                    (rep.sin_referencia_mismo_banco
                                      ? 'Sin referencia (mismo banco)'
                                      : '—')}
                                </div>
                              </div>
                              <div>
                                <div className="mdt-expanded-label">Tasa BCV / Actividad</div>
                                <div className="mdt-expanded-value">
                                  {rep.tasa_bcv ? `${formatAmount(rep.tasa_bcv, 4)} Bs/$` : 'N/A'}
                                  {rep.actividad_o_responsable
                                    ? ` · ${rep.actividad_o_responsable}`
                                    : ''}
                                </div>
                              </div>
                              {rep.motivo_rechazo && (
                                <div>
                                  <div className="mdt-expanded-label">Motivo de rechazo</div>
                                  <div className="mdt-expanded-value" style={{ color: '#b91c1c' }}>
                                    {rep.motivo_rechazo}
                                  </div>
                                </div>
                              )}
                              <div>
                                <div className="mdt-expanded-label">Comprobante adjunto</div>
                                <button
                                  type="button"
                                  className="mdt-view-more-btn"
                                  onClick={() => setPreviewReport(rep)}
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    color: 'var(--primary, #1b5cb6)',
                                  }}
                                >
                                  <Eye size={13} /> Ver imagen cargada
                                </button>
                              </div>
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

      {/* Modal Aprobar (HU-18) */}
      {approvingReport && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="approve-report-title"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 1200,
          }}
        >
          <form
            onSubmit={handleConfirmApprove}
            className="card"
            style={{
              maxWidth: '480px',
              width: '100%',
              padding: '1.5rem',
              display: 'grid',
              gap: '1rem',
            }}
          >
            <h3
              id="approve-report-title"
              style={{
                margin: 0,
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <ShieldCheck size={20} /> Aprobar Aporte ({approvingReport.codigo_confirmacion})
            </h3>

            {approvingReport.moneda === 'VES' && (
              <div>
                <label htmlFor="approve-tasa" className="form-field-label">
                  Tasa BCV aplicada (ajustable) *
                </label>
                <input
                  id="approve-tasa"
                  type="number"
                  step="0.0001"
                  min="0.01"
                  className="form-input"
                  value={approveRate}
                  onChange={(e) => setApproveRate(e.target.value)}
                  required
                />
                {parseFloat(approveRate) > 0 && (
                  <small style={{ color: '#475569' }}>
                    Monto confirmado en USD:{' '}
                    <strong>
                      {formatUsd(approvingReport.monto_original / parseFloat(approveRate))}
                    </strong>
                  </small>
                )}
              </div>
            )}

            {approvingReport.medio_pago !== 'efectivo' && bankTxs.length > 0 && (
              <div>
                <label htmlFor="approve-tx" className="form-field-label">
                  Vincular con movimiento bancario pendiente (opcional)
                </label>
                <select
                  id="approve-tx"
                  className="form-input"
                  value={selectedTxId}
                  onChange={(e) => setSelectedTxId(e.target.value)}
                >
                  <option value="">Sin vincular por ahora</option>
                  {bankTxs.map((tx) => (
                    <option key={tx.id} value={tx.id}>
                      {tx.fecha} · Ref {tx.referencia} · {formatAmount(tx.monto)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setApprovingReport(null)}
                disabled={processing}
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={processing}>
                {processing ? 'Aprobando...' : 'Confirmar Aprobación'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Rechazar (HU-19) */}
      {rejectingReport && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-report-title"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 1200,
          }}
        >
          <form
            onSubmit={handleConfirmReject}
            className="card"
            style={{
              maxWidth: '460px',
              width: '100%',
              padding: '1.5rem',
              display: 'grid',
              gap: '1rem',
            }}
          >
            <h3 id="reject-report-title" style={{ margin: 0, color: 'var(--danger)' }}>
              Rechazar Reporte ({rejectingReport.codigo_confirmacion})
            </h3>
            <div>
              <label htmlFor="reject-motivo" className="form-field-label">
                Motivo del rechazo (obligatorio) *
              </label>
              <textarea
                id="reject-motivo"
                rows={3}
                className="form-input"
                placeholder="Ej: Referencia no localizada en el estado de cuenta bancario."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                required
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setRejectingReport(null)}
                disabled={processing}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ backgroundColor: 'var(--danger)', borderColor: 'var(--danger)' }}
                disabled={processing}
              >
                {processing ? 'Rechazando...' : 'Confirmar Rechazo'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Visor de Comprobante */}
      {previewReport && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Visor de comprobante"
          onClick={() => setPreviewReport(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3100,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '580px',
              padding: '1.25rem',
              display: 'grid',
              gap: '0.85rem',
              backgroundColor: '#ffffff',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <div>
                <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.05rem' }}>
                  Comprobante · {previewReport.codigo_confirmacion}
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {previewReport.miembro_nombre || previewReport.nombre_aportante || 'Aportante'} ·{' '}
                  {previewReport.moneda === 'VES'
                    ? formatVes(previewReport.monto_original)
                    : formatUsd(previewReport.monto_original)}
                  {!previewReport.comprobante_url && ' · (Imagen de prueba)'}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setPreviewReport(null)}
                style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem' }}
              >
                Cerrar
              </button>
            </div>

            <div
              style={{
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                padding: '0.5rem',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                maxHeight: '65vh',
                overflow: 'auto',
              }}
            >
              {(previewReport.comprobante_url || '/comprobante-prueba.jpg')
                .toLowerCase()
                .endsWith('.pdf') ||
              (previewReport.comprobante_url || '').startsWith('data:application/pdf') ? (
                <iframe
                  src={previewReport.comprobante_url || '/comprobante-prueba.jpg'}
                  title={`Comprobante ${previewReport.codigo_confirmacion}`}
                  style={{ width: '100%', height: '60vh', border: 'none', borderRadius: '6px' }}
                />
              ) : (
                <img
                  src={previewReport.comprobante_url || '/comprobante-prueba.jpg'}
                  alt={`Comprobante ${previewReport.codigo_confirmacion}`}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '60vh',
                    objectFit: 'contain',
                    borderRadius: '6px',
                  }}
                />
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <a
                href={previewReport.comprobante_url || '/comprobante-prueba.jpg'}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline"
                style={{
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.82rem',
                }}
              >
                <ExternalLink size={14} /> Abrir en nueva pestaña
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
