import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { requisitionsApi } from '../../services/api';
import type { Requisition } from '../../services/api';

interface ModalProps {
  req: Requisition;
  onClose: () => void;
  onSuccess: () => void;
}

export const RequisitionDetailsModal: React.FC<ModalProps> = ({ req, onClose, onSuccess }) => {
  const { profile } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  if (!profile) return null;

  const isAuditorOrAdmin = ['administrador', 'director'].includes(profile.rol);
  
  // Regla: No auto-aprobación
  const isSolicitante = req.solicitante_id === profile.id;
  
  // Regla: No doble firma por el mismo usuario
  const yaAprobadoPorMi = req.validador_1_id === profile.id;

  const handleApprove = async () => {
    if (yaAprobadoPorMi) {
      alert('Ya diste tu visto bueno en la primera fase. Se requiere la firma de un Director o Administrador distinto.');
      return;
    }
    setSubmitting(true);
    try {
      await requisitionsApi.approveRequisition(req.id, profile.id, req.estado);
      alert('Firma registrada exitosamente.');
      onSuccess();
    } catch (e) {
      console.error(e);
      alert('Error al validar la solicitud de fondos.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      alert('Por favor, indica un motivo de rechazo.');
      return;
    }
    setSubmitting(true);
    try {
      await requisitionsApi.rejectRequisition(req.id, profile.id, rejectionReason);
      alert('Solicitud rechazada.');
      onSuccess();
    } catch (e) {
      console.error(e);
      alert('Error al procesar el rechazo de la solicitud.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1200, padding: '1rem',
      backdropFilter: 'blur(3px)'
    }}>
      <div className="card animate-fade-in-up" style={{ maxWidth: '600px', width: '100%', padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ color: 'var(--primary)', fontWeight: 800, margin: 0 }}>Detalle de Requisición</h3>
          <button 
            type="button" 
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', opacity: 0.5 }}
          >
            ×
          </button>
        </div>
        
        <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.9rem' }}>
          <div><strong>Solicitante:</strong> {req.solicitante_nombre || 'Coordinador'}</div>
          <div><strong>Proyecto:</strong> {req.proyecto_nombre}</div>
          <div><strong>Categoría:</strong> {req.categoria_nombre}</div>
          <div><strong>Monto Solicitado:</strong> <span style={{ color: 'var(--accent)', fontWeight: 800, fontSize: '1.1rem' }}>${req.monto_solicitado.toFixed(2)} USD</span></div>
          <div><strong>Motivo / Descripción:</strong></div>
          <div style={{ 
            padding: '0.75rem', 
            backgroundColor: '#f8fafc', 
            borderRadius: 'var(--radius-sm)', 
            border: '1px solid var(--border-color)',
            lineHeight: '1.5',
            color: 'var(--neutral-dark)'
          }}>{req.motivo}</div>
        </div>

        {/* Historial de Validación */}
        <div style={{ marginBottom: '1.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '1rem', backgroundColor: '#fdfdfd' }}>
          <h4 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>Seguimiento de Firmas (Doble Aprobación):</h4>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '1.2rem', margin: 0, fontSize: '0.85rem' }}>
            <li>
              🛡️ <strong>Visto Bueno 1:</strong> {req.validador_1_id ? `Aprobado el ${new Date(req.validado_1_at!).toLocaleDateString()}` : '⏳ Pendiente de Firma 1'}
            </li>
            <li>
              🛡️ <strong>Visto Bueno 2:</strong> {req.validador_2_id ? `Aprobado el ${new Date(req.validado_2_at!).toLocaleDateString()}` : '⏳ Pendiente de Firma 2'}
            </li>
            {req.estado === 'rechazada' && (
              <li style={{ color: 'var(--danger)', marginTop: '0.25rem' }}>
                ❌ <strong>Rechazada:</strong> {req.motivo_rechazo} {req.rechazado_por ? `(por ${req.rechazado_por})` : ''}
              </li>
            )}
          </ul>
        </div>

        {isAuditorOrAdmin && req.estado.startsWith('pendiente') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
             {isSolicitante ? (
              <div style={{ 
                fontSize: '0.8rem', color: 'var(--accent)', 
                backgroundColor: 'rgba(0,143,166,0.06)', padding: '0.75rem', 
                borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent)' 
              }}>
                ℹ️ Como creador de esta requisición, no puedes auto-aprobarla. Debe ser firmada por otros dos directores/administradores.
              </div>
            ) : null}

            {!showRejectForm ? (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button className="btn btn-outline" onClick={onClose} disabled={submitting}>Cerrar</button>
                
                <button 
                  className="btn btn-outline" 
                  style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} 
                  onClick={() => setShowRejectForm(true)} 
                  disabled={submitting || isSolicitante}
                >
                  Rechazar Solicitud
                </button>
                
                <button 
                  className="btn btn-secondary" 
                  onClick={handleApprove} 
                  disabled={submitting || isSolicitante || yaAprobadoPorMi}
                >
                  {req.estado === 'pendiente_aprobacion_1' ? '✍️ Firmar Primer Visto Bueno' : '✍️ Firmar Segundo Visto Bueno (Autorizar)'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleReject}>
                <div className="form-group">
                  <label className="form-label" htmlFor="reject-reason">Motivo de Rechazo (Obligatorio) *</label>
                  <textarea 
                    id="reject-reason"
                    className="form-input" 
                    rows={3}
                    value={rejectionReason} 
                    onChange={e => setRejectionReason(e.target.value)}
                    required
                    placeholder="Escriba aquí los comentarios u observaciones del por qué se rechaza esta solicitud..."
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                  <button className="btn btn-outline" type="button" onClick={() => setShowRejectForm(false)} disabled={submitting}>Atrás</button>
                  <button className="btn btn-primary" type="submit" disabled={submitting} style={{ backgroundColor: 'var(--danger)', borderColor: 'var(--danger)' }}>
                    Confirmar Rechazo
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {(!isAuditorOrAdmin || isSolicitante || !req.estado.startsWith('pendiente')) && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={onClose}>Cerrar Ventana</button>
          </div>
        )}
      </div>
    </div>
  );
};
