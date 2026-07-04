import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api, requisitionsApi } from '../../services/api';
import type { Project, ExpenseCategory } from '../../services/api';

interface RequisitionFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const RequisitionForm: React.FC<RequisitionFormProps> = ({ onClose, onSuccess }) => {
  const { profile } = useAuth();
  
  // Form states
  const [proyectoId, setProyectoId] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [montoSolicitado, setMontoSolicitado] = useState('');
  const [motivo, setMotivo] = useState('');
  
  // Lists
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFormOptions = async () => {
      try {
        const [projData, catData] = await Promise.all([
          api.getProjects(),
          api.getCategories()
        ]);
        setProjects(projData.filter(p => p.activo));
        setCategories(catData);
      } catch (err) {
        console.error('Error loading form options:', err);
        setError('Error al cargar proyectos y categorías.');
      }
    };
    loadFormOptions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!proyectoId || !categoriaId || !montoSolicitado || !motivo.trim()) {
      setError('Por favor, rellene todos los campos obligatorios.');
      return;
    }

    const numericAmount = parseFloat(montoSolicitado);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('El monto solicitado debe ser mayor que 0.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await requisitionsApi.createRequisition({
        solicitante_id: profile.id,
        proyecto_id: proyectoId,
        categoria_id: categoriaId,
        monto_solicitado: numericAmount,
        motivo: motivo.trim()
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la solicitud de fondos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1100, padding: '1rem',
      backdropFilter: 'blur(3px)'
    }}>
      <div className="card animate-fade-in-up" style={{
        maxWidth: '550px', width: '100%', padding: '2rem',
        borderRadius: 'var(--radius-lg)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ color: 'var(--primary)', fontWeight: 800, margin: 0 }}>Nueva Solicitud de Fondos</h3>
          <button 
            type="button" 
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', opacity: 0.5 }}
          >
            ×
          </button>
        </div>

        {error && (
          <div className="badge badge-danger" style={{ 
            width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', 
            marginBottom: '1rem', display: 'block', textAlign: 'center' 
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="req-proyecto">Proyecto de Destino *</label>
            <select
              id="req-proyecto"
              className="form-input"
              value={proyectoId}
              onChange={e => setProyectoId(e.target.value)}
              required
              disabled={loading}
            >
              <option value="">Selecciona el proyecto...</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="req-categoria">Categoría del Gasto *</label>
            <select
              id="req-categoria"
              className="form-input"
              value={categoriaId}
              onChange={e => setCategoriaId(e.target.value)}
              required
              disabled={loading}
            >
              <option value="">Selecciona la categoría de gasto...</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="req-monto">Monto Estimado ($ USD) *</label>
            <input
              id="req-monto"
              type="number"
              step="0.01"
              min="0.01"
              className="form-input"
              value={montoSolicitado}
              onChange={e => setMontoSolicitado(e.target.value)}
              required
              disabled={loading}
              placeholder="0.00"
            />
          </div>

          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label className="form-label" htmlFor="req-motivo">Justificación / Destino de Fondos *</label>
            <textarea
              id="req-motivo"
              className="form-input"
              rows={4}
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              required
              disabled={loading}
              placeholder="Explique detalladamente para qué se utilizará este dinero (ej: Compra de 50 kg de arroz para comedor, etc.)."
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button 
              type="button" 
              className="btn btn-outline" 
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Enviando solicitud...' : '🚀 Solicitar Autorización'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
