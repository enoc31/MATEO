import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock,
  Landmark,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { api, type BankTransaction, type Donation, type Requisition } from '../../services/api';
import { requisitionsApi } from '../../services/api';
import { financeApi, type CuentaReceptora, type ReporteAporte } from '../../services/financeApi';
import { useAuth } from '../../context/AuthContext';
import {
  FINANCE_MANAGE_ROLES,
  FINANCE_VIEW_ROLES,
  formatCategoriaAporte,
} from '../../utils/rolePermissions';
import { formatDateForFrontEnd, formatUsd, formatVes } from '../../utils/formatters';
import { VerificationQueueTab } from './VerificationQueueTab';
import { InternalIncomeModal } from './InternalIncomeModal';
import { AccountsAndLinkTab } from './AccountsAndLinkTab';

type FinanceTab = 'resumen' | 'verificar' | 'ingresos' | 'gastos' | 'cuentas';

export const FinanceHub: React.FC = () => {
  const { profile, activeOng } = useAuth();
  const navigate = useNavigate();

  const userRole = profile?.rol || '';
  const canViewFinance = (FINANCE_VIEW_ROLES as readonly string[]).includes(userRole);
  const canManageFinance = (FINANCE_MANAGE_ROLES as readonly string[]).includes(userRole);

  const [activeTab, setActiveTab] = useState<FinanceTab>(canViewFinance ? 'resumen' : 'gastos');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [donations, setDonations] = useState<Donation[]>([]);
  const [reportes, setReportes] = useState<ReporteAporte[]>([]);
  const [cuentas, setCuentas] = useState<CuentaReceptora[]>([]);
  const [bankTxs, setBankTxs] = useState<BankTransaction[]>([]);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [showInternalModal, setShowInternalModal] = useState(false);

  const showFeedback = (msg: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback((prev) => (prev?.msg === msg ? null : prev)), 5000);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const targetOngId = activeOng?.id || profile?.ong_id;
      if (canViewFinance) {
        const [donList, repList, ctaList, txList, reqList] = await Promise.all([
          api.getDonations(),
          financeApi.getReportesAportes(targetOngId),
          financeApi.getCuentasReceptoras(targetOngId),
          api.getBankTransactions(),
          requisitionsApi.getRequisitions(),
        ]);
        setDonations(donList);
        setReportes(repList);
        setCuentas(ctaList);
        setBankTxs(txList.filter((t) => t.monto > 0 && t.estado === 'pendiente'));
        setRequisitions(reqList);
      } else {
        // HU-21: coordinador / lider_ministerio solo consulta sus gastos sin exponer ingresos
        const reqList = await requisitionsApi.getRequisitions();
        setRequisitions(reqList);
      }
    } catch (err) {
      console.error('Error cargando módulo Ingresos y Gastos:', err);
      showFeedback('Error al cargar la información financiera.', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeOng?.id, profile?.ong_id, canViewFinance]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const pendingReportsCount = reportes.filter((r) => r.estado === 'pendiente').length;
  const totalIngresosUsd = donations.reduce((s, d) => s + (d.monto_usd || d.monto || 0), 0);
  const totalIngresosVes = donations.reduce((s, d) => s + (d.monto_ves || 0), 0);
  const approvedReqsTotal = requisitions
    .filter((r) => r.estado === 'aprobada_ejecucion')
    .reduce((s, r) => s + (r.monto_solicitado || 0), 0);

  const visibleTabs: { id: FinanceTab; label: string; badge?: number }[] = [
    ...(canViewFinance
      ? [
          { id: 'resumen' as const, label: 'Resumen' },
          { id: 'verificar' as const, label: 'Por Verificar', badge: pendingReportsCount },
          { id: 'ingresos' as const, label: 'Ingresos' },
        ]
      : []),
    { id: 'gastos' as const, label: 'Gastos' },
    ...(canManageFinance ? [{ id: 'cuentas' as const, label: 'Cuentas & Enlace' }] : []),
  ];

  const resolvedOngId = activeOng?.id || profile?.ong_id || '11111111-1111-1111-1111-111111111111';

  return (
    <div className="animate-fade-in-up" style={{ display: 'grid', gap: '1.25rem' }}>
      {/* Header */}
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
              gap: '0.5rem',
            }}
          >
            Ingresos y Gastos
          </h1>
          <p style={{ margin: '0.2rem 0 0', color: '#64748b', fontSize: '0.88rem' }}>
            Gestión unificada de diezmos, ofrendas, reportes externos y gastos ministeriales.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline"
          onClick={() => void loadAll()}
          disabled={loading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <RefreshCw size={15} /> Actualizar
        </button>
      </div>

      {feedback && (
        <div
          role="status"
          style={{
            padding: '0.8rem 1rem',
            borderRadius: '10px',
            backgroundColor: feedback.type === 'error' ? '#fee2e2' : '#ecfdf5',
            color: feedback.type === 'error' ? '#b91c1c' : '#065f46',
            fontWeight: 600,
            fontSize: '0.88rem',
          }}
        >
          {feedback.msg}
        </div>
      )}

      {/* Pestañas */}
      <div
        role="tablist"
        aria-label="Secciones de Ingresos y Gastos"
        style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '0.65rem',
        }}
      >
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-outline'}`}
            style={{
              padding: '0.45rem 0.95rem',
              fontSize: '0.86rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
            }}
          >
            <span>{tab.label}</span>
            {typeof tab.badge === 'number' && tab.badge > 0 && (
              <span
                data-testid="pending-reports-badge"
                style={{
                  backgroundColor: activeTab === tab.id ? '#ffffff' : '#ef4444',
                  color: activeTab === tab.id ? 'var(--primary)' : '#ffffff',
                  borderRadius: '999px',
                  padding: '0.05rem 0.45rem',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
          Cargando información del módulo...
        </div>
      ) : (
        <>
          {activeTab === 'resumen' && canViewFinance && (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                  gap: '1rem',
                }}
              >
                <div className="card" style={{ padding: '1.15rem' }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>
                    INGRESOS CONFIRMADOS (USD)
                  </div>
                  <div
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: 800,
                      color: '#059669',
                      marginTop: '0.25rem',
                    }}
                  >
                    {formatUsd(totalIngresosUsd)}
                  </div>
                  {totalIngresosVes > 0 && (
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Equiv. VES: {formatVes(totalIngresosVes)}
                    </div>
                  )}
                </div>

                <div className="card" style={{ padding: '1.15rem' }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>
                    REPORTES POR VERIFICAR
                  </div>
                  <div
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: 800,
                      color: pendingReportsCount > 0 ? '#d97706' : '#0f172a',
                      marginTop: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <Clock size={20} /> {pendingReportsCount}
                  </div>
                </div>

                <div className="card" style={{ padding: '1.15rem' }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>
                    GASTOS AUTORIZADOS
                  </div>
                  <div
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: 800,
                      color: '#1e293b',
                      marginTop: '0.25rem',
                    }}
                  >
                    {formatUsd(approvedReqsTotal)}
                  </div>
                </div>

                <div className="card" style={{ padding: '1.15rem' }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>
                    BALANCE NETO REFERENCIAL
                  </div>
                  <div
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: 800,
                      color: 'var(--primary)',
                      marginTop: '0.25rem',
                    }}
                  >
                    {formatUsd(totalIngresosUsd - approvedReqsTotal)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'verificar' && canViewFinance && (
            <VerificationQueueTab
              reportes={reportes}
              donations={donations}
              bankTxs={bankTxs}
              canManage={canManageFinance}
              userId={profile?.id}
              onRefresh={loadAll}
              onFeedback={showFeedback}
            />
          )}

          {activeTab === 'ingresos' && canViewFinance && (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <strong style={{ color: '#1e293b' }}>
                  Aportes Confirmados ({donations.length})
                </strong>
                {canManageFinance && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => navigate('/app/importar-extracto')}
                    >
                      <Landmark size={15} /> Importar Extracto
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setShowInternalModal(true)}
                    >
                      <Plus size={15} /> Registrar Aporte Interno
                    </button>
                  </div>
                )}
              </div>

              {donations.length === 0 ? (
                <div
                  className="card"
                  style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}
                >
                  Aún no hay aportes confirmados.
                </div>
              ) : (
                <div className="card table-responsive" style={{ padding: 0, overflowX: 'auto' }}>
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>Fecha</th>
                        <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>Aportante</th>
                        <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>Categoría</th>
                        <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>Método</th>
                        <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Original</th>
                        <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>USD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {donations.map((d) => (
                        <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>
                            {formatDateForFrontEnd(d.fecha)}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{d.donante}</td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>
                            {formatCategoriaAporte(d.categoria_aporte)}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem' }}>
                            {d.medio_pago === 'pago_movil'
                              ? 'Pago Móvil'
                              : d.medio_pago === 'transferencia'
                                ? 'Transferencia'
                                : 'Efectivo'}
                          </td>
                          <td
                            style={{
                              padding: '0.75rem 1rem',
                              textAlign: 'right',
                              whiteSpace: 'nowrap',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {d.moneda === 'VES'
                              ? formatVes(d.monto_original || 0)
                              : formatUsd(d.monto_original || d.monto)}
                          </td>
                          <td
                            style={{
                              padding: '0.75rem 1rem',
                              textAlign: 'right',
                              fontWeight: 700,
                              color: '#059669',
                              whiteSpace: 'nowrap',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {formatUsd(d.monto_usd || d.monto)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'gastos' && (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '1rem',
                }}
              >
                <div
                  className="card"
                  style={{ padding: '1.25rem', display: 'grid', gap: '0.65rem' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: 'var(--primary)',
                    }}
                  >
                    <ClipboardList size={20} />
                    <strong>Solicitudes de Gasto</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>
                    Crea solicitudes presupuestarias o revisa aprobaciones según tu rol.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => navigate('/app/requisitions')}
                    style={{ justifySelf: 'start' }}
                  >
                    Ir a Solicitudes <ArrowRight size={15} />
                  </button>
                </div>

                <div
                  className="card"
                  style={{ padding: '1.25rem', display: 'grid', gap: '0.65rem' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: 'var(--primary)',
                    }}
                  >
                    <Camera size={20} />
                    <strong>Comprobantes y Rendición</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>
                    Carga facturas y recibos de gastos ejecutados para auditoría.
                  </p>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => navigate('/app/field-entry')}
                    style={{ justifySelf: 'start' }}
                  >
                    Ir a Comprobantes <ArrowRight size={15} />
                  </button>
                </div>
              </div>

              <div className="card" style={{ padding: '1rem 1.25rem' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    marginBottom: '0.5rem',
                  }}
                >
                  <CheckCircle2 size={16} color="#10b981" />
                  <strong>Resumen de Solicitudes visibles ({requisitions.length})</strong>
                </div>
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
                  Tienes {requisitions.filter((r) => r.estado.startsWith('pendiente')).length}{' '}
                  solicitudes pendientes y{' '}
                  {requisitions.filter((r) => r.estado === 'aprobada_ejecucion').length} aprobadas
                  para ejecución.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'cuentas' && canManageFinance && (
            <AccountsAndLinkTab
              ongId={resolvedOngId}
              ongNombre={activeOng?.nombre || 'Iglesia'}
              cuentas={cuentas}
              onRefresh={loadAll}
              onFeedback={showFeedback}
            />
          )}
        </>
      )}

      <InternalIncomeModal
        isOpen={showInternalModal}
        ongId={resolvedOngId}
        userId={profile?.id}
        onClose={() => setShowInternalModal(false)}
        onSuccess={loadAll}
        onFeedback={showFeedback}
      />
    </div>
  );
};
