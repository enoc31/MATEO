import React, { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api, requisitionsApi } from '../../services/api';
import type { Project, ExpenseCategory, PartidaGasto } from '../../services/api';

interface RequisitionFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const RequisitionForm: React.FC<RequisitionFormProps> = ({ onClose, onSuccess }) => {
  const { profile } = useAuth();
  
  // Form states
  const [proyectoId, setProyectoId] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [partidaId, setPartidaId] = useState('');
  const [montoSolicitado, setMontoSolicitado] = useState('');
  const [motivo, setMotivo] = useState('');
  
  // Lists
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [partidas, setPartidas] = useState<PartidaGasto[]>([]);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFormOptions = async () => {
      try {
        const [projData, catData, partData] = await Promise.all([
          api.getProjects(),
          api.getCategories(),
          api.getPartidas()
        ]);
        setProjects(projData.filter(p => p.activo));
        setCategories(catData);
        setPartidas(partData);
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
    if (!proyectoId || !partidaId || !montoSolicitado || !motivo.trim()) {
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
        partida_id: partidaId,
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
      <div className="card animate-fade-in-up app-fullscreen-modal" style={{
        maxWidth: '550px', width: '100%', padding: '2rem',
        borderRadius: 'var(--radius-lg)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
        backgroundColor: 'var(--card-bg, #ffffff)',
        color: 'var(--neutral-dark, #1e293b)'
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
          {/* Proyecto */}
          <div className="form-group">
            <label className="form-label" htmlFor="req-proyecto">Proyecto de Destino *</label>
            <select
              id="req-proyecto"
              className="app-input"
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

          {/* Categoría */}
          <div className="form-group">
            <label className="form-label" htmlFor="req-categoria">Categoría del Gasto *</label>
            <select
              id="req-categoria"
              className="app-input"
              value={categoriaId}
              onChange={e => { setCategoriaId(e.target.value); setPartidaId(''); }}
              required
              disabled={loading}
            >
              <option value="">Selecciona la categoría de gasto...</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          {/* Partida Cascade Selector */}
          {categoriaId && (
            <div className="form-group">
              <label className="form-label" htmlFor="req-partida">Partida de Gasto Específica *</label>
              <select
                id="req-partida"
                className="app-input"
                value={partidaId}
                onChange={e => setPartidaId(e.target.value)}
                required
                disabled={loading}
              >
                <option value="">Selecciona la partida contable...</option>
                {partidas
                  .filter(p => p.categoria_id === categoriaId)
                  .map(p => (
                    <option key={p.id} value={p.id}>
                      [{p.codigo}] {p.nombre}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Monto */}
          <div className="form-group">
            <label className="form-label" htmlFor="req-monto">Monto Estimado ($ USD) *</label>
            <input
              id="req-monto"
              type="number"
              step="0.01"
              min="0.01"
              className="app-input"
              value={montoSolicitado}
              onChange={e => setMontoSolicitado(e.target.value)}
              required
              disabled={loading}
              placeholder="0.00"
            />
          </div>

          {/* Justificación */}
          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label className="form-label" htmlFor="req-motivo">Justificación / Destino de Fondos *</label>
            <textarea
              id="req-motivo"
              className="app-input"
              rows={4}
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              required
              disabled={loading}
              placeholder="Explique detalladamente para qué se utilizará este dinero (ej: Compra de 50 kg de arroz para comedor, etc.)."
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Acciones */}
          <div className="sticky-bottom-bar">
            <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={onClose}
                disabled={loading}
                style={{ flex: 1, padding: '1rem', fontSize: '1rem' }}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading}
                style={{ flex: 2, padding: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                {loading ? 'Enviando...' : <><Send size={18} /> Solicitar</>}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
