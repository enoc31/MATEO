import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { ExpenseReceipt, Project, ExpenseCategory } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export const Audit: React.FC = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<ExpenseReceipt[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [selectedExp, setSelectedExp] = useState<ExpenseReceipt | null>(null);
  const [activeDocTab, setActiveDocTab] = useState<'recibo' | 'pago'>('recibo');
  
  // Auditoria States
  const [auditComment, setAuditComment] = useState('');
  const [checklist, setChecklist] = useState({
    facturaValida: false,
    conceptosCoinciden: false,
    proyectoValido: false,
    aprobacionCoordinador: false
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [expList, projList, catList] = await Promise.all([
        api.getExpenses(),
        api.getProjects(),
        api.getCategories()
      ]);
      setExpenses(expList);
      setProjects(projList);
      setCategories(catList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAudit = (exp: ExpenseReceipt) => {
    setSelectedExp(exp);
    setActiveDocTab('recibo');
    setAuditComment(exp.comentarios_auditoria || '');
    setChecklist({
      facturaValida: exp.estado === 'aprobado',
      conceptosCoinciden: exp.estado === 'aprobado',
      proyectoValido: exp.estado === 'aprobado',
      aprobacionCoordinador: exp.estado === 'aprobado'
    });
  };

  const handleAuditAction = async (newStatus: 'aprobado' | 'rechazado') => {
    if (!selectedExp || !profile) return;

    if (newStatus === 'aprobado' && !Object.values(checklist).every(v => v)) {
      alert('Para aprobar el gasto, todos los puntos de la lista de conformidad deben estar verificados.');
      return;
    }

    if (newStatus === 'rechazado' && !auditComment.trim()) {
      alert('Por favor, indica en las observaciones el motivo de rechazo del comprobante.');
      return;
    }

    try {
      setLoading(true);
      await api.updateExpenseStatus(selectedExp.id, newStatus, auditComment, profile.id);
      alert(`Gasto ${newStatus.toUpperCase()} exitosamente.`);
      setSelectedExp(null);
      await loadData();
    } catch (err) {
      console.error(err);
      alert('Error al guardar la auditoría.');
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const getProjectName = (id: string) => projects.find(p => p.id === id)?.nombre || 'Proyecto Desconocido';
  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.nombre || 'Categoría Desconocida';

  const filteredExpenses = expenses.filter(exp => {
    if (filterStatus === 'todos') return true;
    return exp.estado === filterStatus;
  });

  return (
    <div className="animate-fade-in-up">
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ color: 'var(--primary)', fontSize: '1.75rem', fontWeight: 700 }}>Auditoría y Conformidad de Gastos</h2>
          <p style={{ color: 'var(--neutral-dark)', opacity: 0.8, fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Bandeja de comprobantes de egresos. Evalúa su conformidad y aprueba o rechaza los soportes.
          </p>
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: '#ffffff', padding: '0.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
          {['todos', 'pendiente_revision', 'aprobado', 'rechazado'].map(status => (
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
                transition: 'all var(--transition-fast)'
              }}
            >
              {status === 'todos' ? 'Todos' : status.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Registros */}
      {loading && expenses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Cargando bandeja de auditoría...</div>
      ) : filteredExpenses.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--neutral-dark)', opacity: 0.6 }}>
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
              {filteredExpenses.map(exp => (
                <tr key={exp.id}>
                  <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{exp.fecha_gasto}</td>
                  <td style={{ fontSize: '0.85rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{getProjectName(exp.proyecto_id)}</div>
                    <div style={{ opacity: 0.6, fontSize: '0.75rem', marginTop: '0.1rem' }}>{getCategoryName(exp.categoria_id)}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{exp.descripcion}</div>
                    {exp.transaccion_id && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 600, display: 'inline-flex', gap: '0.25rem', marginTop: '0.25rem' }}>
                        ⚖️ Conciliado con extracto bancario
                      </span>
                    )}
                  </td>
                  <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{formatCurrency(exp.monto)}</td>
                  <td style={{ fontSize: '0.8rem', opacity: 0.8 }}>{exp.solicitante_nombre || 'Coordinador'}</td>
                  <td>
                    <span className={`badge ${
                      exp.estado === 'aprobado' ? 'badge-success' : 
                      exp.estado === 'pendiente_revision' ? 'badge-warning' : 'badge-danger'
                    }`}>
                      {exp.estado.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => handleOpenAudit(exp)}
                      className="btn btn-outline"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                    >
                      Auditar Gasto 🔎
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Auditoría Detallada */}
      {selectedExp && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '1rem'
        }}>
          <div className="card" style={{ 
            maxWidth: '1000px', 
            width: '100%', 
            maxHeight: '90vh', 
            overflowY: 'auto',
            padding: '2rem', 
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header del Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid var(--neutral-light)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ color: 'var(--primary)', fontWeight: 700 }}>Verificación de Soporte y Conformidad</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--neutral-dark)', opacity: 0.7, marginTop: '0.1rem' }}>
                  ID Gasto: {selectedExp.id.substring(0, 8).toUpperCase()} - Solicitante: {selectedExp.solicitante_nombre}
                </p>
              </div>
              <button 
                onClick={() => setSelectedExp(null)} 
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--neutral-dark)' }}
              >
                &times;
              </button>
            </div>

            {/* Contenido en Doble Columna */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '1.5rem', flex: 1, minHeight: 0 }}>
              
              {/* Columna 1: Vista de Soportes (Factura / Pago) */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <button
                    onClick={() => setActiveDocTab('recibo')}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      backgroundColor: activeDocTab === 'recibo' ? 'var(--primary)' : 'white',
                      color: activeDocTab === 'recibo' ? 'white' : 'var(--neutral-dark)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    📄 Factura o Recibo
                  </button>
                  <button
                    onClick={() => setActiveDocTab('pago')}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      backgroundColor: activeDocTab === 'pago' ? 'var(--primary)' : 'white',
                      color: activeDocTab === 'pago' ? 'white' : 'var(--neutral-dark)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    💳 Comprobante de Pago
                  </button>
                </div>

                {activeDocTab === 'recibo' ? (
                  <>
                    <span className="form-label" style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.85rem' }}>Factura / Evidencia Digital de Compra:</span>
                    {selectedExp.url_comprobante ? (
                      <div style={{ 
                        flex: 1, 
                        border: '1px solid var(--border-color)', 
                        borderRadius: 'var(--radius-md)', 
                        overflow: 'hidden', 
                        backgroundColor: '#000000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '280px'
                      }}>
                        <img 
                          src={selectedExp.url_comprobante} 
                          alt="Factura o Recibo" 
                          style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }}
                        />
                      </div>
                    ) : (
                      <div style={{ 
                        flex: 1, 
                        border: '1px dashed var(--border-color)', 
                        borderRadius: 'var(--radius-md)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        backgroundColor: 'var(--neutral-light)', 
                        color: 'var(--neutral-dark)',
                        opacity: 0.7,
                        minHeight: '280px'
                      }}>
                        <span>⚠️ No se cargó ninguna foto del recibo físico.</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <span className="form-label" style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.85rem' }}>Comprobante de Pago (Transferencia / Captura):</span>
                    {selectedExp.url_pago ? (
                      <div style={{ 
                        flex: 1, 
                        border: '1px solid var(--border-color)', 
                        borderRadius: 'var(--radius-md)', 
                        overflow: 'hidden', 
                        backgroundColor: '#000000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '280px'
                      }}>
                        <img 
                          src={selectedExp.url_pago} 
                          alt="Comprobante de Pago" 
                          style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }}
                        />
                      </div>
                    ) : (
                      <div style={{ 
                        flex: 1, 
                        border: '1px dashed var(--border-color)', 
                        borderRadius: 'var(--radius-md)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        backgroundColor: 'var(--neutral-light)', 
                        color: 'var(--neutral-dark)',
                        opacity: 0.7,
                        minHeight: '280px'
                      }}>
                        <span>⚠️ No se cargó ninguna foto del comprobante de pago.</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Columna 2: Lógica de Auditoría */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Detalles */}
                <div style={{ backgroundColor: 'var(--neutral-light)', padding: '1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>Proyecto:</strong> {getProjectName(selectedExp.proyecto_id)}
                  </div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>Categoría:</strong> {getCategoryName(selectedExp.categoria_id)}
                  </div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>Monto:</strong> <strong style={{ color: 'var(--primary)', fontSize: '1rem' }}>{formatCurrency(selectedExp.monto)}</strong>
                  </div>
                  <div>
                    <strong>Descripción del Gasto:</strong> {selectedExp.descripcion}
                  </div>
                </div>

                {/* Lista de Chequeo de Conformidad */}
                <div className="card" style={{ padding: '1rem', boxShadow: 'none', borderColor: 'var(--border-color)' }}>
                  <span className="form-label" style={{ fontWeight: 600, marginBottom: '0.75rem', display: 'block' }}>
                    Lista de Chequeo de Auditoría:
                  </span>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={checklist.facturaValida}
                        onChange={e => setChecklist({ ...checklist, facturaValida: e.target.checked })}
                        disabled={selectedExp.estado === 'aprobado'}
                      />
                      ¿Tiene factura, recibo o soporte físico válido?
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={checklist.conceptosCoinciden}
                        onChange={e => setChecklist({ ...checklist, conceptosCoinciden: e.target.checked })}
                        disabled={selectedExp.estado === 'aprobado'}
                      />
                      ¿Los conceptos y montos coinciden con lo reportado?
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={checklist.proyectoValido}
                        onChange={e => setChecklist({ ...checklist, proyectoValido: e.target.checked })}
                        disabled={selectedExp.estado === 'aprobado'}
                      />
                      ¿Corresponde a actividades aprobadas para el proyecto?
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={checklist.aprobacionCoordinador}
                        onChange={e => setChecklist({ ...checklist, aprobacionCoordinador: e.target.checked })}
                        disabled={selectedExp.estado === 'aprobado'}
                      />
                      ¿Cuenta con aprobación de la coordinación local?
                    </label>
                  </div>
                </div>

                {/* Comentarios */}
                <div className="form-group">
                  <label className="form-label" htmlFor="audit-comments">
                    Observaciones de Auditoría * (Obligatorio en caso de rechazo)
                  </label>
                  <textarea
                    id="audit-comments"
                    className="form-input"
                    rows={3}
                    placeholder="Escribe comentarios de aprobación o notas explicando qué comprobantes faltan en caso de rechazo..."
                    value={auditComment}
                    onChange={e => setAuditComment(e.target.value)}
                    disabled={selectedExp.estado === 'aprobado'}
                  />
                </div>
              </div>

            </div>

            {/* Footer de Modal / Acciones */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '2px solid var(--neutral-light)', paddingTop: '1.25rem' }}>
              <button 
                onClick={() => setSelectedExp(null)} 
                className="btn btn-outline"
                style={{ padding: '0.5rem 1rem' }}
              >
                Volver
              </button>

              {selectedExp.estado !== 'aprobado' && (
                <>
                  <button 
                    onClick={() => handleAuditAction('rechazado')} 
                    className="btn btn-outline"
                    style={{ padding: '0.5rem 1rem', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                  >
                    Rechazar Soporte ❌
                  </button>

                  <button 
                    onClick={() => handleAuditAction('aprobado')} 
                    className="btn btn-secondary"
                    style={{ padding: '0.5rem 1.25rem' }}
                  >
                    Aprobar Gasto y Comprobante ✔️
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
