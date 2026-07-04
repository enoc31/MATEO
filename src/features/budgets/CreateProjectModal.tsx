import React, { useState } from 'react';
import { isSimulationMode } from '../../services/api';
import { supabase } from '../../supabaseClient';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newProjectId: string) => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0]);
  const [fechaFin, setFechaFin] = useState(
    new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
  );
  const [overheadPct, setOverheadPct] = useState<number>(7.0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !descripcion.trim()) {
      setError('Por favor complete todos los campos obligatorios.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const projectPayload = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      activo: true,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      overhead_porcentaje: overheadPct
    };

    try {
      let createdId = '';
      if (!isSimulationMode) {
        // Guardado real en Supabase
        const { data, error: dbError } = await supabase
          .from('proyectos')
          .insert([projectPayload])
          .select()
          .single();

        if (dbError) throw dbError;
        createdId = data.id;
      } else {
        // Simulación en LocalStorage
        const localProjects = JSON.parse(localStorage.getItem('cnbv_projects') || '[]');
        const newProj = {
          ...projectPayload,
          id: `proj-${Date.now()}`
        };
        localProjects.push(newProj);
        localStorage.setItem('cnbv_projects', JSON.stringify(localProjects));
        createdId = newProj.id;
      }

      alert('Proyecto creado con éxito. Ahora configure su presupuesto inicial.');
      onSuccess(createdId);
      onClose();
      // Reset form
      setNombre('');
      setDescripcion('');
      setOverheadPct(7.0);
    } catch (err: any) {
      console.error('Error creating project:', err);
      setError(err.message || 'Error al registrar el proyecto en el sistema.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: '1.5rem'
    }}>
      <div className="card animate-scale-in" style={{
        width: '100%',
        maxWidth: '500px',
        padding: '2rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backgroundColor: 'var(--card-bg, #ffffff)',
        color: 'var(--neutral-dark, #1e293b)'
      }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <h3 style={{ color: 'var(--primary)', fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
            ➕ Crear Nuevo Proyecto CNBV
          </h3>
          <button onClick={onClose} style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--neutral-dark)',
            fontSize: '1.5rem',
            cursor: 'pointer',
            opacity: 0.7
          }}>
            &times;
          </button>
        </div>

        {error && (
          <div className="badge badge-danger" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {/* Nombre */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Nombre del Proyecto *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej: Operación Frontera Zulia 2026"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Descripción */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Descripción del Proyecto *</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Describa el alcance de la intervención..."
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Fechas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Fecha Inicio</label>
              <input
                type="date"
                className="form-input"
                value={fechaInicio}
                onChange={e => setFechaInicio(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Fecha Fin</label>
              <input
                type="date"
                className="form-input"
                value={fechaFin}
                onChange={e => setFechaFin(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Overhead predeterminado */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Porcentaje Gasto Indirecto (%)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="number"
                step="0.1"
                min="0"
                max="25"
                className="form-input"
                value={overheadPct}
                onChange={e => setOverheadPct(Math.max(0, parseFloat(e.target.value) || 0))}
                disabled={isSubmitting}
                style={{ width: '80px' }}
              />
              <span style={{ fontWeight: 600, color: 'var(--neutral-dark)' }}>% de Overhead</span>
            </div>
          </div>

          {/* Acciones */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
            <button type="button" onClick={onClose} className="btn btn-outline" disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Registrando...' : 'Registrar Proyecto'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
