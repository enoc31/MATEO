import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Banknote, Clock, Landmark, Plus, RefreshCw } from 'lucide-react';
import { api, type BankTransaction, type Donation } from '../../services/api';
import { financeApi, type CuentaReceptora, type ReporteAporte } from '../../services/financeApi';
import { useAuth } from '../../context/AuthContext';
import { FINANCE_MANAGE_ROLES, FINANCE_VIEW_ROLES } from '../../utils/rolePermissions';
import { formatUsd, formatVes } from '../../utils/formatters';
import { VerificationQueueTab } from './VerificationQueueTab';
import { FinanceIncomesTable } from './FinanceIncomesTable';
import { AccountsAndLinkTab } from './AccountsAndLinkTab';

type FinanceTab = 'resumen' | 'verificar' | 'ingresos' | 'cuentas';

export const FinanceHub: React.FC = () => {
  const navigate = useNavigate();
  return <FinanceHubContent navigate={navigate} />;
};

export const FinanceHubContent: React.FC<{ navigate: (path: string) => void }> = ({ navigate }) => {
  const { profile, activeOng } = useAuth();

  const userRole = profile?.rol || '';
  const canViewFinance = (FINANCE_VIEW_ROLES as readonly string[]).includes(userRole);
  const canManageFinance = (FINANCE_MANAGE_ROLES as readonly string[]).includes(userRole);

  const [activeTab, setActiveTab] = useState<FinanceTab>('resumen');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [donations, setDonations] = useState<Donation[]>([]);
  const [reportes, setReportes] = useState<ReporteAporte[]>([]);
  const [cuentas, setCuentas] = useState<CuentaReceptora[]>([]);
  const [bankTxs, setBankTxs] = useState<BankTransaction[]>([]);

  const showFeedback = (msg: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback((prev) => (prev?.msg === msg ? null : prev)), 5000);
  };

  const loadAll = useCallback(async () => {
    if (!canViewFinance) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const targetOngId = activeOng?.id || profile?.ong_id;
      const [donList, repList, ctaList, txList] = await Promise.all([
        api.getDonations(),
        financeApi.getReportesAportes(targetOngId),
        financeApi.getCuentasReceptoras(targetOngId),
        api.getBankTransactions(),
      ]);
      setDonations(donList);
      setReportes(repList);
      setCuentas(ctaList);
      setBankTxs(txList.filter((t) => t.monto > 0 && t.estado === 'pendiente'));
    } catch (err) {
      console.error('Error cargando módulo Ingresos:', err);
      showFeedback('Error al cargar la información de ingresos.', 'error');
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
  const activeAccountsCount = cuentas.filter((c) => c.activa !== false).length;

  const visibleTabs: { id: FinanceTab; label: string; badge?: number }[] = [
    ...(canViewFinance
      ? [
          { id: 'resumen' as const, label: 'Resumen' },
          { id: 'verificar' as const, label: 'Por Verificar', badge: pendingReportsCount },
          { id: 'ingresos' as const, label: 'Ingresos' },
        ]
      : []),
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
            Ingresos
          </h1>
          <p style={{ margin: '0.2rem 0 0', color: '#64748b', fontSize: '0.88rem' }}>
            Gestión unificada de diezmos, ofrendas, arqueos de efectivo y reportes externos.
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
        aria-label="Secciones de Ingresos"
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
      ) : !canViewFinance ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
          No tienes permisos para consultar el módulo de Ingresos.
        </div>
      ) : (
        <>
          {activeTab === 'resumen' && (
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
                    TOTAL APORTES REGISTRADOS
                  </div>
                  <div
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: 800,
                      color: 'var(--primary)',
                      marginTop: '0.25rem',
                    }}
                  >
                    {donations.length}
                  </div>
                </div>

                <div className="card" style={{ padding: '1.15rem' }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>
                    CUENTAS RECEPTORAS ACTIVAS
                  </div>
                  <div
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: 800,
                      color: '#1e293b',
                      marginTop: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <Landmark size={20} /> {activeAccountsCount}
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
                      <strong>Arqueo y Registro de Efectivo</strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => navigate('/app/arqueo-efectivo')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                  >
                    Ir a Arqueo y Registro <ArrowRight size={15} />
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'verificar' && (
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

          {activeTab === 'ingresos' && (
            <FinanceIncomesTable
              donations={donations}
              canManage={canManageFinance}
              onImportStatement={() => navigate('/app/importar-extracto')}
              onRegisterInternal={() => navigate('/app/registrar-aporte')}
              onOpenCashCounter={() => navigate('/app/arqueo-efectivo')}
              organizationName={activeOng?.nombre || 'Iglesia'}
              loggedUserName={profile?.nombre_completo || profile?.email}
            />
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
