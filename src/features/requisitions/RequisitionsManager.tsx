import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { requisitionsApi } from '../../services/api';
import type { Requisition } from '../../services/api';
import { RequisitionForm } from './RequisitionForm';
import { RequisitionDetailsModal } from './RequisitionDetailsModal';

export const RequisitionsManager: React.FC = () => {
  const { profile } = useAuth();
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedReq, setSelectedReq] = useState<Requisition | null>(null);
  const [filter, setFilter] = useState<'todas' | 'pendientes' | 'aprobadas'>('todas');

  const fetchList = async () => {
    setLoading(true);
    try {
      const data = await requisitionsApi.getRequisitions();
      setRequisitions(data);
    } catch (e) {
      console.error(e);
      alert('Error cargando solicitudes de requisición.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  if (!profile) return null;

  const isAuditorOrAdmin = ['administrador', 'director'].includes(profile.rol);

  // Filtrar según rol: coordinadores y auxiliares de campo solo ven las suyas
  const myRequisitions = ['coordinador', 'auxiliar_campo'].includes(profile.rol) 
    ? requisitions.filter(r => r.solicitante_id === profile.id)
    : requisitions;

  const filteredList = myRequisitions.filter(r => {
    if (filter === 'pendientes') return r.estado.startsWith('pendiente');
    if (filter === 'aprobadas') return r.estado === 'aprobada_ejecucion';
    return true;
  });

  const getStatusBadge = (status: Requisition['estado']) => {
    switch (status) {
      case 'pendiente_aprobacion_1':
        return <span className="badge badge-warning" style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', fontWeight: 600 }}>Aprobación 1 (Falta)</span>;
      case 'pendiente_aprobacion_2':
        return <span className="badge" style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', fontWeight: 600, backgroundColor: 'rgba(0,143,166,0.1)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>Aprobación 2 (Falta)</span>;
      case 'aprobada_ejecucion':
        return <span className="badge badge-success" style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', fontWeight: 600 }}>✓ Aprobada Ejecución</span>;
      case 'rechazada':
        return <span className="badge badge-danger" style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', fontWeight: 600 }}>✕ Rechazada</span>;
      default:
        return <span className="badge" style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', fontWeight: 600 }}>{status}</span>;
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ color: 'var(--primary)', fontFamily: 'var(--font-headings)', fontWeight: 800, margin: 0 }}>
            Solicitudes de Gasto (Requisiciones)
          </h2>
          <p style={{ opacity: 0.7, fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Registro previo a compras y autorización con doble firma mancomunada.
          </p>
        </div>
        
        {['coordinador', 'auxiliar_campo', 'director'].includes(profile.rol) && (
          <button className="btn btn-primary" onClick={() => setShowCreateForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>➕</span> Nueva Solicitud
          </button>
        )}
      </div>

      {/* Controles de Filtros */}
      <div className="card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['todas', 'pendientes', 'aprobadas'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`btn ${filter === f ? 'btn-secondary' : 'btn-outline'}`}
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', fontWeight: 600 }}
              >
                {f === 'todas' ? 'Todas' : f === 'pendientes' ? 'Pendientes de Firma' : 'Autorizadas para Gasto'}
              </button>
            ))}
          </div>
          
          <button 
            onClick={fetchList} 
            className="btn btn-outline" 
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            disabled={loading}
          >
            🔄 Recargar
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', opacity: 0.7 }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>Cargando solicitudes...</div>
        </div>
      ) : filteredList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '5rem 2rem', opacity: 0.7 }} className="card">
          <span style={{ fontSize: '3rem' }}>📋</span>
          <div style={{ fontSize: '1.1rem', fontWeight: 600, marginTop: '1rem' }}>
            No se encontraron solicitudes
          </div>
          <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {profile.rol === 'coordinador' 
              ? 'Prueba creando una nueva solicitud pulsando el botón superior.' 
              : 'No hay solicitudes pendientes en esta categoría.'}
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.85rem', opacity: 0.8 }}>Fecha Solicitud</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.85rem', opacity: 0.8 }}>Proyecto</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.85rem', opacity: 0.8 }}>Categoría de Gasto</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.85rem', opacity: 0.8 }}>Monto Solicitado</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.85rem', opacity: 0.8 }}>Solicitado por</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.85rem', opacity: 0.8 }}>Estado</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, fontSize: '0.85rem', opacity: 0.8, textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map(req => (
                <tr key={req.id} style={{ borderBottom: '1px solid #e2e8f0', transition: 'background 0.2s' }}>
                  <td style={{ padding: '1.2rem 1.5rem', fontSize: '0.85rem', opacity: 0.8 }}>
                    {new Date(req.created_at).toLocaleDateString('es-VE', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </td>
                  <td style={{ padding: '1.2rem 1.5rem', fontWeight: 600, color: 'var(--neutral-dark)' }}>
                    {req.proyecto_nombre}
                  </td>
                  <td style={{ padding: '1.2rem 1.5rem', fontSize: '0.9rem' }}>
                    {req.categoria_nombre}
                  </td>
                  <td style={{ padding: '1.2rem 1.5rem', fontWeight: 800, color: 'var(--neutral-dark)' }}>
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(req.monto_solicitado)}
                  </td>
                  <td style={{ padding: '1.2rem 1.5rem', fontSize: '0.85rem' }}>
                    {req.solicitante_nombre || 'Coordinador'}
                  </td>
                  <td style={{ padding: '1.2rem 1.5rem' }}>
                    {getStatusBadge(req.estado)}
                  </td>
                  <td style={{ padding: '1.2rem 1.5rem', textAlign: 'center' }}>
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', fontWeight: 600 }}
                      onClick={() => setSelectedReq(req)}
                    >
                      {isAuditorOrAdmin && req.estado.startsWith('pendiente') ? '✍️ Evaluar' : '🔎 Ver Detalle'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateForm && (
        <RequisitionForm 
          onClose={() => setShowCreateForm(false)} 
          onSuccess={() => { setShowCreateForm(false); fetchList(); }} 
        />
      )}

      {selectedReq && (
        <RequisitionDetailsModal
          req={selectedReq}
          onClose={() => setSelectedReq(null)}
          onSuccess={() => { setSelectedReq(null); fetchList(); }}
        />
      )}
    </div>
  );
};
