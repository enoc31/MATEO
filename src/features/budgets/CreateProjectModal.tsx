import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { Donante } from '../../services/api';
import { isSimulationMode } from '../../services/api';
import { supabase } from '../../supabaseClient';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newProjectId: string) => void;
}

const FLAG_MAP: Record<string, string> = {
  'Venezuela': '🇻🇪',
  'Reino Unido': '🇬🇧',
  'Estados Unidos': '🇺🇸',
  'Europa': '🇪🇺',
  'Internacional': '🌐'
};

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0]);
  const [fechaFin, setFechaFin] = useState(
    new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
  );
  const [overheadPct, setOverheadPct] = useState<number>(7.0);
  const [donanteId, setDonanteId] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | 'nacional' | 'extranjero'>('todos');

  const [donantes, setDonantes] = useState<Donante[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.getDonantes().then(setDonantes).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const donantesFiltrados = donantes.filter(d =>
    tipoFiltro === 'todos' ? true : d.tipo === tipoFiltro
  );

  const donanteSeleccionado = donantes.find(d => d.id === donanteId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !descripcion.trim()) {
      setError('Por favor complete todos los campos obligatorios.');
      return;
    }
    if (!donanteId) {
      setError('Debe seleccionar un donante financiador para el proyecto.');
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
      overhead_porcentaje: overheadPct,
      donante_id: donanteId
    };

    try {
      let createdId = '';
      if (!isSimulationMode) {
        const { data, error: dbError } = await supabase
          .from('proyectos')
          .insert([projectPayload])
          .select()
          .single();
        if (dbError) throw dbError;
        createdId = data.id;
      } else {
        const localProjects = JSON.parse(localStorage.getItem('cnbv_projects') || '[]');
        const newProj = { ...projectPayload, id: `proj-${Date.now()}` };
        localProjects.push(newProj);
        localStorage.setItem('cnbv_projects', JSON.stringify(localProjects));
        createdId = newProj.id;
      }

      onSuccess(createdId);
      onClose();
      // Reset form
      setNombre(''); setDescripcion(''); setDonanteId(''); setOverheadPct(7.0); setTipoFiltro('todos');
    } catch (err: any) {
      console.error('Error creating project:', err);
      setError(err.message || 'Error al registrar el proyecto en el sistema.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(15, 23, 42, 0.78)', backdropFilter: 'blur(8px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 1200, padding: '1.5rem', overflowY: 'auto'
    }}>
      <div className="card" style={{
        width: '100%', maxWidth: '560px', padding: '2rem',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.08)',
        backgroundColor: 'var(--card-bg, #ffffff)',
        color: 'var(--neutral-dark, #1e293b)',
        maxHeight: '90vh', overflowY: 'auto'
      }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div>
            <h3 style={{ color: 'var(--primary)', fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
              ➕ Nuevo Proyecto
            </h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', opacity: 0.6 }}>
              Complete la ficha del proyecto y su fuente de financiamiento
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', opacity: 0.5 }}>×</button>
        </div>

        {error && (
          <div style={{ background: 'var(--danger)', color: '#fff', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

          {/* ── SECCIÓN 1: DATOS DEL PROYECTO ─────────────────────────── */}
          <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--primary)', textTransform: 'uppercase', opacity: 0.8 }}>
            📁 Datos del Proyecto
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
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

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Descripción del alcance *</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Describa el objetivo de la intervención y la población beneficiaria..."
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              required
              disabled={isSubmitting}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Fecha Inicio</label>
              <input type="date" className="form-input" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} required disabled={isSubmitting} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Fecha Fin</label>
              <input type="date" className="form-input" value={fechaFin} onChange={e => setFechaFin(e.target.value)} required disabled={isSubmitting} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>% Gastos Indirectos (Overhead)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                type="number" step="0.1" min="0" max="25"
                className="form-input"
                value={overheadPct}
                onChange={e => setOverheadPct(Math.max(0, parseFloat(e.target.value) || 0))}
                disabled={isSubmitting}
                style={{ width: '90px' }}
              />
              <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                % sobre costos directos (Categorías 1, 2, 3 y 5)
              </span>
            </div>
          </div>

          {/* ── SECCIÓN 2: DONANTE ─────────────────────────────────────── */}
          <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--primary)', textTransform: 'uppercase', opacity: 0.8, marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            🤝 Fuente de Financiamiento
          </div>

          {/* Filtro de tipo */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['todos', 'nacional', 'extranjero'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => { setTipoFiltro(t); setDonanteId(''); }}
                style={{
                  padding: '0.3rem 0.85rem',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: '1.5px solid',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  borderColor: tipoFiltro === t ? 'var(--primary)' : 'var(--border-color)',
                  backgroundColor: tipoFiltro === t ? 'var(--primary)' : 'transparent',
                  color: tipoFiltro === t ? '#fff' : 'var(--neutral-dark)'
                }}
              >
                {t === 'todos' ? '🌐 Todos' : t === 'nacional' ? '🇻🇪 Nacionales' : '✈️ Extranjeros'}
              </button>
            ))}
          </div>

          {/* Grid de donantes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', maxHeight: '210px', overflowY: 'auto', padding: '0.25rem' }}>
            {donantesFiltrados.map(d => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDonanteId(d.id)}
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '2px solid',
                  borderColor: donanteId === d.id ? 'var(--primary)' : 'var(--border-color)',
                  backgroundColor: donanteId === d.id ? 'rgba(47,90,174,0.08)' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ fontSize: '1.3rem', marginBottom: '0.2rem' }}>
                  {FLAG_MAP[d.pais || ''] || '🏳️'}
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.78rem', lineHeight: 1.2, color: 'var(--neutral-dark)' }}>{d.nombre}</div>
                <div style={{ fontSize: '0.68rem', marginTop: '0.2rem', opacity: 0.55 }}>
                  {d.tipo === 'nacional' ? '🇻🇪 Nacional' : `✈️ ${d.pais}`}
                </div>
              </button>
            ))}
          </div>

          {donanteSeleccionado && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 0.75rem', borderRadius: '6px',
              backgroundColor: 'rgba(0,143,166,0.08)', border: '1px solid rgba(0,143,166,0.2)',
              fontSize: '0.8rem', fontWeight: 600
            }}>
              <span>{FLAG_MAP[donanteSeleccionado.pais || ''] || '🤝'}</span>
              <span>Financiado por: <strong>{donanteSeleccionado.nombre}</strong></span>
            </div>
          )}

          {/* Acciones */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
            <button type="button" onClick={onClose} className="btn btn-outline" disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting || !donanteId}>
              {isSubmitting ? 'Registrando...' : '✅ Registrar Proyecto'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
