import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Banknote, Camera, ClipboardList, Clock, Plus, RefreshCw } from 'lucide-react';
import { api, type BankTransaction, type Donation, type Requisition } from '../../services/api';
import { requisitionsApi } from '../../services/api';
import { financeApi, type CuentaReceptora, type ReporteAporte } from '../../services/financeApi';
import { useAuth } from '../../context/AuthContext';
import { FINANCE_MANAGE_ROLES, FINANCE_VIEW_ROLES } from '../../utils/rolePermissions';
import { formatUsd, formatVes } from '../../utils/formatters';
import { VerificationQueueTab } from './VerificationQueueTab';
import { FinanceIncomesTable } from './FinanceIncomesTable';
import { FinanceExpensesTable } from './FinanceExpensesTable';
import { AccountsAndLinkTab } from './AccountsAndLinkTab';

type FinanceTab = 'resumen' | 'verificar' | 'ingresos' | 'gastos' | 'cuentas';

export const FinanceHub: React.FC = () => {
  const navigate = useNavigate();
  return <FinanceHubContent navigate={navigate} />;
};

export const FinanceHubContent: React.FC<{ navigate: (path: string) => void }> = ({ navigate }) => {
  const { profile, activeOng } = useAuth();

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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {canManageFinance && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate('/app/registrar-aporte')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Plus size={16} /> Registrar Aporte Interno
            </button>
          )}
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

              {canManageFinance && (
                <div
                  className="card"
                  style={{
                    padding: '1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'grid', gap: '0.35rem' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: 'var(--primary)',
                      }}
                    >
                      <Banknote size={20} />
                      <strong>Arqueo de Efectivo y Registro de Aporte Interno</strong>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>
                      Abre la pantalla dedicada para contar billetes por especie monetaria
                      (Venezolano, Estadounidense, Europeo o Colombiano) o registrar aportes
                      internos de culto.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => navigate('/app/registrar-aporte')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                  >
                    Ir a Arqueo y Registro <ArrowRight size={15} />
                  </button>
                </div>
              )}
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
            <FinanceIncomesTable
              donations={donations}
              canManage={canManageFinance}
              onImportStatement={() => navigate('/app/importar-extracto')}
              onRegisterInternal={() => navigate('/app/registrar-aporte')}
            />
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

              <FinanceExpensesTable
                requisitions={requisitions}
                onNavigateRequisitions={() => navigate('/app/requisitions')}
              />
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
    </div>
  );
};
