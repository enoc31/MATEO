import React, { useState, useEffect } from 'react';
import { FileText, CreditCard, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../../services/api';
import type { ExpenseReceipt, Project, PartidaGasto } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export const AuditDetail: React.FC = () => {
  const { profile } = useAuth();
  const [expense, setExpense] = useState<ExpenseReceipt | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [partidas, setPartidas] = useState<PartidaGasto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDocTab, setActiveDocTab] = useState<'recibo' | 'pago'>('recibo');
  const [auditComment, setAuditComment] = useState('');
  const [checklist, setChecklist] = useState({
    facturaValida: false,
    conceptosCoinciden: false,
    proyectoValido: false,
    aprobacionCoordinador: false
  });

  useEffect(() => {
    const fetchData = async () => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('id');
      if (!id) {
        setError('No se proporcionó un ID de gasto válido.');
        setLoading(false);
        return;
      }
      try {
        const [exp, projList, partList] = await Promise.all([
          api.getExpenseById(id),
          api.getProjects(),
          api.getPartidas()
        ]);
        setProjects(projList);
        setPartidas(partList);
        
        if (exp) {
          setExpense(exp);
          if (exp.comentarios_auditoria) {
            setAuditComment(exp.comentarios_auditoria);
          }
        } else {
          setError('No se encontró el gasto solicitado.');
        }
      } catch (err: any) {
        setError(err.message || 'Error al cargar el detalle del gasto.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getProjectName = (id: string) => projects.find(p => p.id === id)?.nombre || 'Proyecto Desconocido';
  const getPartidaName = (id: string) => {
    const p = partidas.find(x => x.id === id);
    return p ? `${p.codigo} - ${p.nombre}` : 'Partida Desconocida';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const handleAuditAction = async (newStatus: 'aprobado' | 'rechazado') => {
    if (!expense) return;
    
    if (newStatus === 'rechazado' && !auditComment.trim()) {
      alert('Debes incluir observaciones obligatoriamente si vas a rechazar el soporte.');
      return;
    }

    if (newStatus === 'aprobado') {
      const allChecked = Object.values(checklist).every(Boolean);
      if (!allChecked) {
        if (!window.confirm('No has marcado todos los puntos de la lista de chequeo. ¿Estás seguro de aprobar este gasto de todos modos?')) {
          return;
        }
      }
    }

    try {
      await api.updateExpenseStatus(expense.id, newStatus, auditComment, profile?.id || '');
      setExpense({ ...expense, estado: newStatus, comentarios_auditoria: auditComment });
      alert(`Gasto ${newStatus.toUpperCase()} exitosamente.`);
      
      // Intentar refrescar la ventana principal si está abierta, y luego cerrar la pestaña actual
      if (window.opener && !window.opener.closed) {
        // Enviar mensaje a la ventana padre para que recargue los datos
        window.opener.postMessage('RELOAD_AUDIT', '*');
      }
      
      // Opcional: Cerrar pestaña automáticamente después de aprobar/rechazar
      setTimeout(() => {
        window.close();
      }, 1500);
      
    } catch (err: any) {
      alert(`Error: ${err.message || 'Hubo un error al guardar la auditoría'}`);
    }
  };

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Cargando detalles del gasto...</div>;
  }

  if (error || !expense) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'red' }}>{error || 'Error desconocido'}</div>;
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f4f5f7',
      padding: '2rem'
    }}>
      <div className="card" style={{ 
        maxWidth: '1200px', 
        margin: '0 auto',
        padding: '2rem', 
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header de la Pestaña */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid var(--neutral-light)', paddingBottom: '0.75rem' }}>
          <div>
            <h3 style={{ color: 'var(--primary)', fontWeight: 700 }}>Auditoría: Verificación de Soporte y Conformidad</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--neutral-dark)', opacity: 0.8, marginTop: '0.3rem' }}>
              <strong>ID Gasto:</strong> {expense.id.substring(0, 8).toUpperCase()} - <strong>Solicitante:</strong> {expense.solicitante_nombre || 'Coordinador'}
            </p>
          </div>
          <div>
             <span className={`badge ${
                expense.estado === 'aprobado' ? 'badge-success' : 
                expense.estado === 'pendiente_revision' ? 'badge-warning' : 'badge-danger'
              }`}>
                Estado: {expense.estado.replace('_', ' ').toUpperCase()}
             </span>
          </div>
        </div>

        {/* Contenido en Doble Columna */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem', marginBottom: '1.5rem', flex: 1 }}>
          
          {/* Columna 1: Vista de Soportes (Factura / Pago) */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <button
                onClick={() => setActiveDocTab('recibo')}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: activeDocTab === 'recibo' ? 'var(--primary)' : 'white',
                  color: activeDocTab === 'recibo' ? 'white' : 'var(--neutral-dark)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={18} style={{ marginRight: '8px' }} /> Factura o Recibo</span>
              </button>
              <button
                onClick={() => setActiveDocTab('pago')}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: activeDocTab === 'pago' ? 'var(--primary)' : 'white',
                  color: activeDocTab === 'pago' ? 'white' : 'var(--neutral-dark)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CreditCard size={18} style={{ marginRight: '8px' }} /> Comprobante de Pago</span>
              </button>
            </div>

            {activeDocTab === 'recibo' ? (
              <>
                {expense.url_comprobante ? (
                  <div style={{ 
                    flex: 1, 
                    border: '1px solid var(--border-color)', 
                    borderRadius: 'var(--radius-md)', 
                    overflow: 'hidden', 
                    backgroundColor: '#000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '400px'
                  }}>
                    <a href={expense.url_comprobante} target="_blank" rel="noreferrer" title="Abrir imagen original">
                      <img 
                        src={expense.url_comprobante} 
                        alt="Factura o Recibo" 
                        style={{ maxWidth: '100%', maxHeight: '600px', objectFit: 'contain' }}
                      />
                    </a>
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
                    minHeight: '400px'
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}><AlertTriangle size={18} color="var(--warning)" /> No se cargó ninguna foto del recibo físico.</span>
                  </div>
                )}
              </>
            ) : (
              <>
                {expense.url_pago ? (
                  <div style={{ 
                    flex: 1, 
                    border: '1px solid var(--border-color)', 
                    borderRadius: 'var(--radius-md)', 
                    overflow: 'hidden', 
                    backgroundColor: '#000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '400px'
                  }}>
                    <a href={expense.url_pago} target="_blank" rel="noreferrer" title="Abrir imagen original">
                      <img 
                        src={expense.url_pago} 
                        alt="Comprobante de Pago" 
                        style={{ maxWidth: '100%', maxHeight: '600px', objectFit: 'contain' }}
                      />
                    </a>
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
                    minHeight: '400px'
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}><AlertTriangle size={18} color="var(--warning)" /> No se cargó ninguna foto del comprobante de pago.</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Columna 2: Lógica de Auditoría */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Detalles */}
            <div style={{ backgroundColor: 'var(--neutral-light)', padding: '1.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.95rem' }}>
              <div style={{ marginBottom: '0.75rem' }}>
                <strong>Proyecto:</strong> <span style={{ color: 'var(--primary)' }}>{getProjectName(expense.proyecto_id)}</span>
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <strong>Partida de Gasto:</strong> {getPartidaName(expense.partida_id)}
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <strong>Fecha del Gasto:</strong> {expense.fecha_gasto}
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <strong>Monto:</strong> <strong style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>{formatCurrency(expense.monto)}</strong>
              </div>
              <div>
                <strong>Concepto / Descripción:</strong> {expense.descripcion}
              </div>
            </div>

            {/* Lista de Chequeo de Conformidad */}
            <div className="card" style={{ padding: '1.5rem', boxShadow: 'none', borderColor: 'var(--border-color)' }}>
              <span className="form-label" style={{ fontWeight: 600, marginBottom: '1rem', display: 'block', fontSize: '1.05rem' }}>
                Lista de Chequeo de Auditoría:
              </span>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={checklist.facturaValida}
                    onChange={e => setChecklist({ ...checklist, facturaValida: e.target.checked })}
                    disabled={expense.estado === 'aprobado'}
                    style={{ width: '18px', height: '18px' }}
                  />
                  ¿Tiene factura, recibo o soporte físico válido y legible?
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={checklist.conceptosCoinciden}
                    onChange={e => setChecklist({ ...checklist, conceptosCoinciden: e.target.checked })}
                    disabled={expense.estado === 'aprobado'}
                    style={{ width: '18px', height: '18px' }}
                  />
                  ¿Los conceptos y montos coinciden exactamente con el reporte?
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={checklist.proyectoValido}
                    onChange={e => setChecklist({ ...checklist, proyectoValido: e.target.checked })}
                    disabled={expense.estado === 'aprobado'}
                    style={{ width: '18px', height: '18px' }}
                  />
                  ¿Corresponde a actividades aprobadas para el proyecto de donación?
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={checklist.aprobacionCoordinador}
                    onChange={e => setChecklist({ ...checklist, aprobacionCoordinador: e.target.checked })}
                    disabled={expense.estado === 'aprobado'}
                    style={{ width: '18px', height: '18px' }}
                  />
                  ¿Cuenta con la respectiva aprobación del coordinador local?
                </label>
              </div>
            </div>

            {/* Comentarios */}
            <div className="form-group">
              <label className="form-label" htmlFor="audit-comments" style={{ fontSize: '1rem' }}>
                Observaciones de Auditoría * (Obligatorio en caso de rechazo)
              </label>
              <textarea
                id="audit-comments"
                className="form-input"
                rows={4}
                placeholder="Escribe comentarios de aprobación o notas explicando qué comprobantes faltan en caso de rechazo..."
                value={auditComment}
                onChange={e => setAuditComment(e.target.value)}
                disabled={expense.estado === 'aprobado'}
                style={{ fontSize: '0.95rem' }}
              />
            </div>
          </div>

        </div>

        {/* Footer de Pestaña / Acciones */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '2px solid var(--neutral-light)', paddingTop: '1.5rem', marginTop: 'auto' }}>
          <button 
            onClick={() => window.close()} 
            className="btn btn-outline"
            style={{ padding: '0.75rem 1.5rem', fontWeight: 600 }}
          >
            Cerrar Pestaña
          </button>

          {expense.estado !== 'aprobado' && (
            <>
              <button 
                onClick={() => handleAuditAction('rechazado')} 
                className="btn btn-outline"
                style={{ padding: '0.75rem 1.5rem', borderColor: 'var(--danger)', color: 'var(--danger)', fontWeight: 600 }}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><XCircle size={18} style={{ marginRight: '8px' }} /> Rechazar Soporte</span>
              </button>

              <button 
                onClick={() => handleAuditAction('aprobado')} 
                className="btn btn-secondary"
                style={{ padding: '0.75rem 2rem', fontWeight: 600 }}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle size={18} style={{ marginRight: '8px' }} /> Aprobar Gasto y Comprobante</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
