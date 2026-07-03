import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { Project, ExpenseCategory, ExpenseReceipt } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export const MobileEntry: React.FC = () => {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<ExpenseReceipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Estados del Formulario
  const [projectId, setProjectId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaGasto, setFechaGasto] = useState(new Date().toISOString().split('T')[0]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const loadData = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [projList, catList, expList] = await Promise.all([
        api.getProjects(),
        api.getCategories(),
        api.getExpenses()
      ]);
      setProjects(projList.filter(p => p.activo));
      setCategories(catList);
      
      // Mostrar solo los egresos creados por este coordinador
      setRecentExpenses(expList.filter(e => e.solicitante_id === profile.id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile]);

  // Manejo de la captura de foto
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  // Limpiar formulario
  const resetForm = () => {
    setProjectId('');
    setCategoryId('');
    setMonto('');
    setDescripcion('');
    setFechaGasto(new Date().toISOString().split('T')[0]);
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  // Enviar el gasto
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    if (!projectId || !categoryId || !monto || !descripcion) {
      alert('Por favor complete todos los campos obligatorios.');
      return;
    }

    setSubmitting(true);
    try {
      await api.createExpense({
        proyecto_id: projectId,
        categoria_id: categoryId,
        solicitante_id: profile.id,
        solicitante_nombre: profile.nombre_completo,
        monto: parseFloat(monto),
        descripcion: descripcion,
        fecha_gasto: fechaGasto,
        url_comprobante: photoPreview
      }, photoFile || undefined);

      alert('Gasto cargado exitosamente. Queda pendiente para revisión de auditoría.');
      resetForm();
      await loadData();
    } catch (err) {
      console.error(err);
      alert('Ocurrió un error al guardar el gasto.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: ExpenseReceipt['estado']) => {
    switch (status) {
      case 'aprobado': return <span className="badge badge-success">Aprobado</span>;
      case 'pendiente_revision': return <span className="badge badge-warning">En Revisión</span>;
      case 'rechazado': return <span className="badge badge-danger">Rechazado</span>;
      default: return <span className="badge badge-info">{status}</span>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(amount);
  };

  if (loading && recentExpenses.length === 0) {
    return <div>Cargando cargador de gastos...</div>;
  }

  return (
    <div className="animate-fade-in-up" style={{ maxWidth: '600px', margin: '0 auto' }}>
      
      {/* Saludo y Cabecera Móvil */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--primary)', fontWeight: 700 }}>Carga de Comprobantes</h2>
          <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>Ingresa gastos de ayuda humanitaria desde el sitio.</p>
        </div>
        <span style={{ fontSize: '1.8rem' }}>📲</span>
      </div>

      {/* Formulario de Carga */}
      <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
        <h3 className="card-title" style={{ fontSize: '1rem', marginBottom: '1rem' }}>Registrar Gasto de Campo</h3>
        
        <form onSubmit={handleSubmit}>
          {/* Proyecto */}
          <div className="form-group">
            <label className="form-label" htmlFor="project">Proyecto Asignado *</label>
            <select 
              id="project"
              className="form-input form-select"
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              required
              disabled={submitting}
            >
              <option value="">Selecciona el Proyecto</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>

          {/* Categoría */}
          <div className="form-group">
            <label className="form-label" htmlFor="category">Categoría de Gasto *</label>
            <select 
              id="category"
              className="form-input form-select"
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              required
              disabled={submitting}
            >
              <option value="">Selecciona la Categoría</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Monto */}
            <div className="form-group">
              <label className="form-label" htmlFor="amount">Monto (USD) *</label>
              <input 
                id="amount"
                type="number" 
                step="0.01" 
                className="form-input" 
                placeholder="0.00"
                value={monto}
                onChange={e => setMonto(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            {/* Fecha */}
            <div className="form-group">
              <label className="form-label" htmlFor="date">Fecha del Gasto *</label>
              <input 
                id="date"
                type="date" 
                className="form-input" 
                value={fechaGasto}
                onChange={e => setFechaGasto(e.target.value)}
                required
                disabled={submitting}
              />
            </div>
          </div>

          {/* Detalle */}
          <div className="form-group">
            <label className="form-label" htmlFor="description">Detalles del Gasto (Destinatarios / Fin) *</label>
            <textarea 
              id="description"
              className="form-input" 
              rows={3} 
              placeholder="Ej: Compra de medicamentos para 25 niños de la comunidad..."
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              required
              disabled={submitting}
            />
          </div>

          {/* Cámara / Carga de foto */}
          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label className="form-label">Foto de Factura o Recibo Físico</label>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
              {photoPreview ? (
                <div style={{ 
                  position: 'relative', 
                  width: '100%', 
                  height: '200px', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden'
                }}>
                  <img src={photoPreview} alt="Vista Previa" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  <button 
                    type="button" 
                    onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                    style={{
                      position: 'absolute',
                      top: '0.5rem',
                      right: '0.5rem',
                      backgroundColor: 'rgba(239, 68, 68, 0.9)',
                      color: 'white',
                      border: 'none',
                      padding: '0.3rem 0.6rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              ) : (
                <label style={{
                  width: '100%',
                  height: '100px',
                  border: '2px dashed var(--primary)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  backgroundColor: 'rgba(47, 90, 174, 0.02)',
                  transition: 'background-color var(--transition-fast)'
                }}>
                  <span style={{ fontSize: '1.5rem' }}>📷</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', marginTop: '0.25rem' }}>
                    Tomar Foto o Cargar Imagen
                  </span>
                  {/* Atributo capture="environment" abre la cámara de inmediato en móviles */}
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    onChange={handlePhotoChange} 
                    style={{ display: 'none' }} 
                  />
                </label>
              )}
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-secondary" 
            style={{ width: '100%', padding: '0.75rem' }}
            disabled={submitting}
          >
            {submitting ? 'Enviando gasto...' : 'Enviar Comprobante a Auditoría'}
          </button>
        </form>
      </div>

      {/* Lista de Envios Recientes del Coordinador */}
      <div>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '1rem', fontWeight: 700 }}>
          Historial de Envíos
        </h3>

        {recentExpenses.length === 0 ? (
          <div className="card" style={{ padding: '2rem', textAlign: 'center', opacity: 0.6 }}>
            No has cargado gastos todavía.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recentExpenses.map(exp => (
              <div key={exp.id} className="card" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.75rem', opacity: 0.6, fontWeight: 700 }}>{exp.fecha_gasto}</span>
                  <span style={{ fontWeight: 700 }}>{formatCurrency(exp.monto)}</span>
                </div>
                
                <p style={{ fontSize: '0.85rem', marginTop: '0.25rem', fontWeight: 500 }}>{exp.descripcion}</p>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--neutral-dark)', opacity: 0.7 }}>
                    Categoría: {categories.find(c => c.id === exp.categoria_id)?.nombre || 'Ayuda'}
                  </span>
                  {getStatusBadge(exp.estado)}
                </div>

                {/* Mostrar observaciones de rechazo en caso de auditoría desfavorable */}
                {exp.estado === 'rechazado' && exp.comentarios_auditoria && (
                  <div style={{
                    marginTop: '0.75rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.05)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '4px',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.75rem',
                    color: 'var(--danger)'
                  }}>
                    <strong>Nota de Auditoría:</strong> {exp.comentarios_auditoria}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
