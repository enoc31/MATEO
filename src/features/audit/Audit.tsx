import React, { useState, useEffect } from 'react';
import { Search, Scale } from 'lucide-react';
import { api } from '../../services/api';
import type { ExpenseReceipt, Project, ExpenseCategory, PartidaGasto } from '../../services/api';
import { InternalControlModal } from '../../components/InternalControlModal';
import { ProcessFlowchart } from '../../components/ProcessFlowchart';
import { formatDateForFrontEnd } from '../../utils/formatters';

export const Audit: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<ExpenseReceipt[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [partidas, setPartidas] = useState<PartidaGasto[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [isCosoModalOpen, setIsCosoModalOpen] = useState(false);
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50;

  const loadData = async () => {
    setLoading(true);
    try {
      const [projList, catList, partList] = await Promise.all([
        api.getProjects(),
        api.getCategories(),
        api.getPartidas(),
      ]);
      setProjects(projList);
      setCategories(catList);
      setPartidas(partList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenses = async (page: number) => {
    setLoading(true);
    try {
      const expResponse = await api.getExpensesPaginated(page, pageSize);
      setExpenses(expResponse.data);
      setTotalCount(expResponse.count);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen for messages from the AuditDetail tab to refresh data
    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'RELOAD_AUDIT') {
        fetchExpenses(currentPage);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchExpenses(currentPage);
  }, [currentPage]);

  const handleOpenAudit = (exp: ExpenseReceipt) => {
    // Abre el detalle en una nueva pestaña
    window.open(`/app/audit-detail?id=${exp.id}`, '_blank');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const getProjectName = (id: string) =>
    projects.find((p) => p.id === id)?.nombre || 'Proyecto Desconocido';
  const getPartidaName = (id: string) => {
    const p = partidas.find((x) => x.id === id);
    if (!p) return 'Partida Desconocida';
    const cat = categories.find((c) => c.id === p.categoria_id);
    return `[Partida ${p.codigo}] ${p.nombre} (${cat ? cat.nombre.split(' (')[0].replace(/^\d+\.\s+/, '') : ''})`;
  };

  const filteredExpenses = expenses.filter((exp) => {
    if (filterStatus === 'todos') return true;
    return exp.estado === filterStatus;
  });

  return (
    <div className="animate-fade-in-up">
      {/* Encabezado */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div>
          <h2 style={{ color: 'var(--primary)', fontSize: '1.75rem', fontWeight: 700 }}>
            Auditoría y Conformidad de Gastos
          </h2>
          <p
            style={{
              color: 'var(--neutral-dark)',
              opacity: 0.8,
              fontSize: '0.9rem',
              marginTop: '0.25rem',
            }}
          >
            Bandeja de comprobantes de egresos. Evalúa su conformidad y aprueba o rechaza los
            soportes.
          </p>
        </div>

        {/* Filtros y Opciones */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-outline"
            onClick={() => setIsCosoModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--primary)',
              borderColor: 'var(--primary)',
            }}
          >
            📖 Manual COSO
          </button>
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              backgroundColor: '#ffffff',
              padding: '0.25rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
            }}
          >
            {['todos', 'pendiente_revision', 'aprobado', 'rechazado'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                style={{
                  border: 'none',
                  backgroundColor: filterStatus === status ? 'var(--primary)' : 'transparent',
                  color: filterStatus === status ? '#ffffff' : 'var(--neutral-dark)',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  transition: 'all var(--transition-fast)',
                }}
              >
                {status === 'todos' ? 'Todos' : status.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ProcessFlowchart
        currentStep="auditoria"
        description="La Auditoría garantiza que cada centavo donado esté debidamente soportado por facturas legales y cumpla fielmente el propósito del proyecto. Es el paso esencial para asegurar la transparencia antes de la rendición de cuentas final."
      />

      {/* Tabla de Registros */}
      {loading && expenses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Cargando bandeja de auditoría...</div>
      ) : filteredExpenses.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '3rem',
            color: 'var(--neutral-dark)',
            opacity: 0.6,
          }}
        >
          No se encontraron gastos en este estado.
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Proyecto</th>
                <th>Concepto / Descripción</th>
                <th>Monto</th>
                <th>Solicitante</th>
                <th>Estado</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((exp) => (
                <tr key={exp.id}>
                  <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {formatDateForFrontEnd(exp.fecha_gasto)}
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--primary)' }}>
                      {getProjectName(exp.proyecto_id)}
                    </div>
                    <div style={{ opacity: 0.6, fontSize: '0.75rem', marginTop: '0.1rem' }}>
                      {getPartidaName(exp.partida_id)}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{exp.descripcion}</div>
                    {exp.transaccion_id && (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          color: 'var(--success)',
                          fontWeight: 600,
                          display: 'inline-flex',
                          gap: '0.25rem',
                          marginTop: '0.25rem',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Scale size={14} /> Conciliado con extracto bancario
                        </span>
                      </span>
                    )}
                  </td>
                  <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {formatCurrency(exp.monto)}
                  </td>
                  <td style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                    {exp.solicitante_nombre || 'Coordinador'}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        exp.estado === 'aprobado'
                          ? 'badge-success'
                          : exp.estado === 'pendiente_revision'
                            ? 'badge-warning'
                            : 'badge-danger'
                      }`}
                    >
                      {exp.estado.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => handleOpenAudit(exp)}
                      className="btn btn-outline"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                    >
                      <span
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        Auditar Gasto <Search size={14} style={{ marginLeft: '4px' }} />
                      </span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Controles de Paginación */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '1rem',
              padding: '0 1rem',
            }}
          >
            <div style={{ fontSize: '0.85rem', color: 'var(--neutral-dark)' }}>
              Mostrando {filteredExpenses.length} de {totalCount} gastos (Página {currentPage})
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
                className="btn btn-outline"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={currentPage * pageSize >= totalCount || loading}
                className="btn btn-outline"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      )}

      <InternalControlModal isOpen={isCosoModalOpen} onClose={() => setIsCosoModalOpen(false)} />
    </div>
  );
};
