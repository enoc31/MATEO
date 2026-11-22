import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Landmark,
  ShieldCheck,
  Smartphone,
  UserCheck,
  UserX,
  XCircle,
  DollarSign,
} from 'lucide-react';
import type { BankTransaction, Donation } from '../../services/api';
import { financeApi, findDuplicateReferences, type ReporteAporte } from '../../services/financeApi';
import { formatAmount, formatUsd, formatVes } from '../../utils/formatters';
import { formatCategoriaAporte } from '../../utils/rolePermissions';
import { formatDateForFrontEnd } from '../../utils/formatters';

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
  const [approvingReport, setApprovingReport] = useState<ReporteAporte | null>(null);
  const [approveRate, setApproveRate] = useState<string>('');
  const [selectedTxId, setSelectedTxId] = useState<string>('');
  const [rejectingReport, setRejectingReport] = useState<ReporteAporte | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const duplicatesMap = findDuplicateReferences(reportes, donations);

  const filtered = reportes.filter((r) =>
    statusFilter === 'todos' ? true : r.estado === statusFilter,
  );

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
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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
            className={`btn ${statusFilter === tab.id ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setStatusFilter(tab.id)}
            style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
          No hay reportes en estado "{statusFilter}".
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.9rem' }}>
          {filtered.map((rep) => {
            const dup = duplicatesMap[rep.id];
            const methodLabel =
              rep.medio_pago === 'pago_movil'
                ? 'Pago Móvil'
                : rep.medio_pago === 'transferencia'
                  ? 'Transferencia'
                  : 'Efectivo';

            return (
              <div
                key={rep.id}
                className="card"
                style={{
                  padding: '1.15rem',
                  border: dup?.hasDuplicate ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                  display: 'grid',
                  gap: '0.75rem',
                }}
              >
                {dup?.hasDuplicate && (
                  <div
                    role="alert"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '8px',
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      fontSize: '0.83rem',
                      fontWeight: 700,
                    }}
                  >
                    <AlertTriangle size={16} />
                    <span>Alerta de Referencia Duplicada: {dup.reason}</span>
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'grid', gap: '0.25rem' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <strong style={{ color: 'var(--primary)', fontSize: '1rem' }}>
                        {rep.codigo_confirmacion}
                      </strong>
                      <span className="badge badge-success">
                        {formatCategoriaAporte(rep.categoria_aporte)}
                      </span>
                      <span
                        className={`badge ${
                          rep.estado === 'aprobado'
                            ? 'badge-success'
                            : rep.estado === 'rechazado'
                              ? 'badge-danger'
                              : 'badge-warning'
                        }`}
                      >
                        {rep.estado.toUpperCase()}
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: '0.85rem',
                        color: '#334155',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      {rep.es_anonimo ? (
                        <>
                          <UserX size={14} /> Aporte Anónimo / Visitante
                        </>
                      ) : rep.miembro_id ? (
                        <>
                          <UserCheck size={14} color="#10b981" /> Miembro vinculado (ID:{' '}
                          {rep.miembro_id.slice(0, 8)}…)
                        </>
                      ) : (
                        <>
                          <span>
                            {rep.nombre_aportante || 'Visitante'}
                            {rep.telefono_aportante ? ` · ${rep.telefono_aportante}` : ''}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                      {rep.moneda === 'VES'
                        ? formatVes(rep.monto_original)
                        : `${formatUsd(rep.monto_original)} USD`}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      Equiv. USD: <strong>{formatUsd(rep.monto_usd)}</strong>
                      {rep.tasa_bcv ? ` (Tasa ${formatAmount(rep.tasa_bcv, 4)})` : ''}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                    gap: '0.5rem',
                    fontSize: '0.82rem',
                    backgroundColor: '#f8fafc',
                    padding: '0.75rem',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    {rep.medio_pago === 'pago_movil' ? (
                      <Smartphone size={14} />
                    ) : rep.medio_pago === 'transferencia' ? (
                      <Landmark size={14} />
                    ) : (
                      <DollarSign size={14} />
                    )}
                    <span>
                      <strong>Método:</strong> {methodLabel}
                    </span>
                  </div>
                  <div>
                    <strong>Fecha:</strong> {formatDateForFrontEnd(rep.fecha_pago)}
                  </div>
                  {rep.banco_emisor && (
                    <div>
                      <strong>Banco:</strong> {rep.banco_emisor}
                    </div>
                  )}
                  <div>
                    <strong>Referencia:</strong>{' '}
                    {rep.referencia
                      ? rep.referencia
                      : rep.sin_referencia_mismo_banco
                        ? 'Sin referencia (mismo banco)'
                        : '—'}
                  </div>
                  {rep.telefono_emisor && (
                    <div>
                      <strong>Tel. emisor:</strong> {rep.telefono_emisor}
                    </div>
                  )}
                  {rep.actividad_o_responsable && (
                    <div>
                      <strong>Culto / Responsable:</strong> {rep.actividad_o_responsable}
                    </div>
                  )}
                </div>

                {rep.motivo_rechazo && (
                  <div
                    style={{
                      fontSize: '0.82rem',
                      color: '#b91c1c',
                      backgroundColor: '#fef2f2',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                    }}
                  >
                    <strong>Motivo de rechazo:</strong> {rep.motivo_rechazo}
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.6rem',
                  }}
                >
                  <div>
                    {rep.comprobante_url ? (
                      <a
                        href={rep.comprobante_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline"
                        style={{
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.8rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <ExternalLink size={14} /> Ver Comprobante
                      </a>
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                        Sin comprobante adjunto
                      </span>
                    )}
                  </div>

                  {canManage && rep.estado === 'pendiente' && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => {
                          setRejectingReport(rep);
                          setRejectReason('');
                        }}
                        style={{
                          color: 'var(--danger)',
                          borderColor: 'var(--danger)',
                          padding: '0.4rem 0.8rem',
                          fontSize: '0.82rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <XCircle size={15} /> Rechazar
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => openApproveModal(rep)}
                        style={{
                          padding: '0.4rem 0.9rem',
                          fontSize: '0.82rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <CheckCircle size={15} /> Aprobar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
    </div>
  );
};
