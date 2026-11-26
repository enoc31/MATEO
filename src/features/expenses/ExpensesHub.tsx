import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock,
  Plus,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { requisitionsApi, type Requisition } from '../../services/api';
import { formatUsd } from '../../utils/formatters';
import { ExpensesTable } from './ExpensesTable';

type ExpensesTab = 'resumen' | 'listado';

export const ExpensesHub: React.FC = () => {
  const navigate = useNavigate();
  return <ExpensesHubContent navigate={navigate} />;
};

export const ExpensesHubContent: React.FC<{ navigate: (path: string) => void }> = ({
  navigate,
}) => {
  const [activeTab, setActiveTab] = useState<ExpensesTab>('resumen');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);

  const showFeedback = (msg: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback((prev) => (prev?.msg === msg ? null : prev)), 5000);
  };

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const reqList = await requisitionsApi.getRequisitions();
      setRequisitions(reqList);
    } catch (err) {
      console.error('Error cargando módulo Gastos:', err);
      showFeedback('Error al cargar la información de gastos.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadExpenses();
  }, [loadExpenses]);

  const approvedReqs = requisitions.filter((r) => r.estado === 'aprobada_ejecucion');
  const pendingReqs = requisitions.filter((r) => r.estado.startsWith('pendiente'));
  const rejectedReqs = requisitions.filter((r) => r.estado.startsWith('rechazada'));

  const approvedReqsTotal = approvedReqs.reduce((s, r) => s + (r.monto_solicitado || 0), 0);
  const pendingReqsTotal = pendingReqs.reduce((s, r) => s + (r.monto_solicitado || 0), 0);

  const visibleTabs: { id: ExpensesTab; label: string; badge?: number }[] = [
    { id: 'resumen', label: 'Resumen' },
    { id: 'listado', label: 'Listado de Gastos', badge: pendingReqs.length },
  ];

  return (
    <div
      data-testid="expenses-hub"
      className="animate-fade-in-up"
      style={{ display: 'grid', gap: '1.25rem' }}
    >
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
            Gastos
          </h1>
          <p style={{ margin: '0.2rem 0 0', color: '#64748b', fontSize: '0.88rem' }}>
            Gestión de solicitudes presupuestarias, aprobaciones, comprobantes y rendición de
            gastos.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/app/requisitions')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Plus size={16} /> Nueva Solicitud de Gasto
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => void loadExpenses()}
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
        aria-label="Secciones de Gastos"
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
                data-testid="pending-expenses-badge"
                style={{
                  backgroundColor: activeTab === tab.id ? '#ffffff' : '#f59e0b',
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
          Cargando información de gastos...
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
                    GASTOS AUTORIZADOS (USD)
                  </div>
                  <div
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: 800,
                      color: '#059669',
                      marginTop: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <CheckCircle2 size={20} /> {formatUsd(approvedReqsTotal)}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    {approvedReqs.length} aprobadas
                  </div>
                </div>

                <div className="card" style={{ padding: '1.15rem' }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>
                    PENDIENTES DE APROBACIÓN
                  </div>
                  <div
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: 800,
                      color: pendingReqs.length > 0 ? '#d97706' : '#0f172a',
                      marginTop: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <Clock size={20} /> {pendingReqs.length}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Monto: {formatUsd(pendingReqsTotal)}
                  </div>
                </div>

                <div className="card" style={{ padding: '1.15rem' }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>
                    TOTAL SOLICITUDES
                  </div>
                  <div
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: 800,
                      color: 'var(--primary)',
                      marginTop: '0.25rem',
                    }}
                  >
                    {requisitions.length}
                  </div>
                </div>

                <div className="card" style={{ padding: '1.15rem' }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>
                    RECHAZADAS
                  </div>
                  <div
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: 800,
                      color: rejectedReqs.length > 0 ? '#dc2626' : '#64748b',
                      marginTop: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <XCircle size={20} /> {rejectedReqs.length}
                  </div>
                </div>
              </div>

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
            </div>
          )}

          {activeTab === 'listado' && (
            <ExpensesTable
              requisitions={requisitions}
              onNavigateRequisitions={() => navigate('/app/requisitions')}
            />
          )}
        </>
      )}
    </div>
  );
};
