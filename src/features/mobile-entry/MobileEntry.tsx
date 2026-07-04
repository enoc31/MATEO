import React, { useState, useEffect } from 'react';
import { api, requisitionsApi } from '../../services/api';
import type { Project, ExpenseCategory, PartidaGasto, ExpenseReceipt, Requisition } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// Helper icons for projects
const getProjectIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('alimentación') || n.includes('comedor')) return '🍲';
  if (n.includes('médica') || n.includes('salud') || n.includes('medicina')) return '🏥';
  if (n.includes('albergue') || n.includes('refugio') || n.includes('logística')) return '🏠';
  return '📋';
};

// Helper icons for categories
const getCategoryIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('1.') || n.includes('direct') || n.includes('alim') || n.includes('nutri')) return '🍲';
  if (n.includes('2.') || n.includes('transp') || n.includes('logis') || n.includes('almacen')) return '🚚';
  if (n.includes('3.') || n.includes('person') || n.includes('recurs')) return '👥';
  if (n.includes('4.') || n.includes('oficin') || n.includes('funcion') || n.includes('operat')) return '🏢';
  if (n.includes('5.') || n.includes('visibil') || n.includes('monito') || n.includes('evalua')) return '📣';
  return '💵';
};

export const MobileEntry: React.FC = () => {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<ExpenseReceipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [projectId, setProjectId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [partidaId, setPartidaId] = useState('');
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaGasto, setFechaGasto] = useState(new Date().toISOString().split('T')[0]);
  const [solicitudId, setSolicitudId] = useState('');
  
  // Requisitions
  const [approvedRequisitions, setApprovedRequisitions] = useState<Requisition[]>([]);
  const [partidas, setPartidas] = useState<PartidaGasto[]>([]);
  const [budgets, setBudgets] = useState<import('../../services/api').Budget[]>([]);
  
  // Document 1: Factura o Recibo
  const [doc1File, setDoc1File] = useState<File | null>(null);
  const [doc1Preview, setDoc1Preview] = useState<string | null>(null);
  
  // Document 2: Comprobante de Pago
  const [doc2File, setDoc2File] = useState<File | null>(null);
  const [doc2Preview, setDoc2Preview] = useState<string | null>(null);

  const loadData = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [projList, catList, partList, expList, reqList, budgetList] = await Promise.all([
        api.getProjects(),
        api.getCategories(),
        api.getPartidas(),
        api.getExpenses(),
        requisitionsApi.getRequisitions(),
        api.getBudgets()
      ]);
      setProjects(projList.filter(p => p.activo));
      setCategories(catList);
      setPartidas(partList);
      setBudgets(budgetList);
      
      // Filter expenses created by this coordinator
      const myExpenses = expList.filter(e => e.solicitante_id === profile.id);
      setRecentExpenses(myExpenses);

      // Filter approved requisitions that do not have an executed expense yet
      const activeReqs = reqList.filter(r => 
        r.solicitante_id === profile.id && 
        r.estado === 'aprobada_ejecucion' &&
        !expList.some(e => e.solicitud_id === r.id)
      );
      setApprovedRequisitions(activeReqs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile]);

  // Handle Photo Capture/Upload helper
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFile: (f: File | null) => void, setPreview: (p: string | null) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
      // For low-bandwidth preview and offline fallback, URL.createObjectURL is fast and requires no network
      setPreview(URL.createObjectURL(file));
    }
  };

  // Reset form helper
  const resetForm = () => {
    setProjectId('');
    setCategoryId('');
    setPartidaId('');
    setMonto('');
    setDescripcion('');
    setFechaGasto(new Date().toISOString().split('T')[0]);
    setSolicitudId('');
    setDoc1File(null);
    setDoc1Preview(null);
    setDoc2File(null);
    setDoc2Preview(null);
  };

  // Partidas con presupuesto asignado en el proyecto seleccionado
  const partidasConPresupuesto = projectId
    ? partidas.filter(p => budgets.some(b => b.proyecto_id === projectId && b.partida_id === p.id && b.monto_asignado > 0))
    : [];

  const handleSelectRequisition = (reqId: string) => {
    setSolicitudId(reqId);
    if (reqId) {
      const selected = approvedRequisitions.find(r => r.id === reqId);
      if (selected) {
        setProjectId(selected.proyecto_id);
        setPartidaId(selected.partida_id);
        
        // Find category from partida
        const partObj = partidas.find(p => p.id === selected.partida_id);
        if (partObj) {
          setCategoryId(partObj.categoria_id);
        }
        
        setMonto(selected.monto_solicitado.toString());
        setDescripcion(selected.motivo);
      }
    } else {
      setProjectId('');
      setCategoryId('');
      setPartidaId('');
      setMonto('');
      setDescripcion('');
    }
  };

  // Submit expense
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    if (!projectId) {
      alert('Por favor selecciona un Proyecto.');
      return;
    }
    if (!partidaId) {
      alert('Por favor selecciona una Partida de gasto.');
      return;
    }
    if (!monto || parseFloat(monto) <= 0) {
      alert('Por favor ingresa un monto válido mayor a 0.');
      return;
    }
    if (!descripcion) {
      alert('Por favor ingresa una descripción del gasto.');
      return;
    }

    setSubmitting(true);
    try {
      await api.createExpense({
        proyecto_id: projectId,
        partida_id: partidaId,
        solicitante_id: profile.id,
        solicitante_nombre: profile.nombre_completo,
        solicitud_id: solicitudId || null,
        monto: parseFloat(monto),
        descripcion: descripcion,
        fecha_gasto: fechaGasto,
        url_comprobante: doc1Preview // fallback simulated URL
      }, doc1File || undefined, doc2File || undefined);

      alert('¡Gasto guardado exitosamente! Ha quedado en revisión para auditoría.');
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
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--primary)' }}>
        <span style={{ fontSize: '2rem', display: 'block', marginBottom: '1rem' }}>🔄</span>
        <strong>Cargando formulario simplificado...</strong>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up" style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '3rem' }}>
      
      {/* Header Info */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--primary)', fontWeight: 800 }}>Carga Rápida de Gastos</h2>
          <p style={{ fontSize: '0.85rem', opacity: 0.8 }}>Diseñado para ingreso fácil en campo 🚜</p>
        </div>
      </div>

      {/* Simplified Entry Form */}
      <div className="card" style={{ marginBottom: '2.5rem', padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
        <form onSubmit={handleSubmit}>
          
          {/* STEP 0: REQUISITION LINKING */}
          {approvedRequisitions.length > 0 && (
            <div style={{ 
              marginBottom: '1.5rem', 
              padding: '1rem', 
              backgroundColor: 'rgba(0, 143, 166, 0.05)', 
              border: '1px solid rgba(0, 143, 166, 0.2)', 
              borderRadius: 'var(--radius-md)' 
            }}>
              <label htmlFor="select-solicitud" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '0.5rem' }}>
                📋 ¿Esta compra proviene de una solicitud autorizada?
              </label>
              <select
                id="select-solicitud"
                className="form-input"
                value={solicitudId}
                onChange={e => handleSelectRequisition(e.target.value)}
                disabled={submitting}
                style={{ borderColor: 'var(--accent)' }}
              >
                <option value="">Gasto independiente (Sin solicitud previa)</option>
                {approvedRequisitions.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.proyecto_nombre} - {r.categoria_nombre} (${r.monto_solicitado.toFixed(2)})
                  </option>
                ))}
              </select>
              {solicitudId && (
                <div style={{ fontSize: '0.75rem', color: 'var(--accent)', marginTop: '0.4rem', fontWeight: 500 }}>
                  ✓ Proyecto, categoría y monto pre-cargados desde la solicitud.
                </div>
              )}
            </div>
          )}

          {/* STEP 1: PROJECT SELECTION */}
          <div style={{ marginBottom: '1.5rem' }}>
            <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.75rem' }}>
              1. Selecciona el Proyecto Asignado *
            </span>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {projects.map(p => {
                const isSelected = projectId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProjectId(p.id)}
                    disabled={submitting}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.85rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected ? '2.5px solid var(--primary)' : '1px solid var(--border-color)',
                      backgroundColor: isSelected ? 'rgba(47, 90, 174, 0.08)' : 'white',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all var(--transition-fast)',
                      fontWeight: isSelected ? 700 : 500
                    }}
                  >
                    <span style={{ fontSize: '1.5rem', marginRight: '0.75rem' }}>
                      {getProjectIcon(p.nombre)}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.9rem', color: 'var(--neutral-dark)' }}>{p.nombre}</div>
                    </div>
                    {isSelected && (
                      <span style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '1.2rem' }}>✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 2: CATEGORY SELECTION */}
          <div style={{ marginBottom: '1.5rem' }}>
            <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.75rem' }}>
              2. ¿En qué se gastó el dinero? *
            </span>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', 
              gap: '0.5rem' 
            }}>
              {categories.map(c => {
                const isSelected = categoryId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setCategoryId(c.id); setPartidaId(''); }}
                    disabled={submitting}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '1rem 0.5rem',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected ? '2.5px solid var(--primary)' : '1px solid var(--border-color)',
                      backgroundColor: isSelected ? 'rgba(47, 90, 174, 0.08)' : 'white',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                      fontWeight: isSelected ? 700 : 500,
                      minHeight: '90px'
                    }}
                  >
                    <span style={{ fontSize: '1.8rem', marginBottom: '0.4rem' }}>
                      {getCategoryIcon(c.nombre)}
                    </span>
                    <span style={{ fontSize: '0.75rem', textAlign: 'center', color: 'var(--neutral-dark)' }}>
                      {c.nombre.split(' (')[0].replace(/^\d+\.\s+/, '')}
                    </span>
                  </button>
                );
              })}
            </div>

            {categoryId && (
              <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column' }}>
                <label htmlFor="partida-select" style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.8, marginBottom: '0.25rem' }}>
                  Seleccionar Partida de Gasto UNDG *
                </label>
                {partidasConPresupuesto.filter(p => p.categoria_id === categoryId).length === 0 ? (
                  <div style={{
                    padding: '0.75rem', borderRadius: '6px',
                    backgroundColor: 'rgba(190,87,75,0.08)', border: '1px solid rgba(190,87,75,0.3)',
                    fontSize: '0.8rem', color: 'var(--danger)'
                  }}>
                    ⚠️ Esta categoría no tiene presupuesto asignado en el proyecto seleccionado.
                    Ve a <strong>Presupuestos → Asistente UNDG</strong> para asignar montos primero.
                  </div>
                ) : (
                  <select
                    id="partida-select"
                    className="form-input form-select"
                    value={partidaId}
                    onChange={e => setPartidaId(e.target.value)}
                    disabled={submitting}
                    required
                  >
                    <option value="">-- Elija la partida contable --</option>
                    {partidasConPresupuesto
                      .filter(p => p.categoria_id === categoryId)
                      .map(p => {
                        const b = budgets.find(b => b.proyecto_id === projectId && b.partida_id === p.id);
                        const disponible = b ? b.monto_asignado - b.monto_ejecutado - b.monto_comprometido : 0;
                        return (
                          <option key={p.id} value={p.id}>
                            [{p.codigo}] {p.nombre} — Disponible: ${disponible.toFixed(2)}
                          </option>
                        );
                      })}
                  </select>
                )}
              </div>
            )}
          </div>

          {/* STEP 3: AMOUNT & DETAILS */}
          <div style={{ marginBottom: '1.5rem' }}>
            <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.75rem' }}>
              3. Ingresa los Datos de la Compra *
            </span>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              {/* Amount */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label htmlFor="amount" style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.8, marginBottom: '0.25rem' }}>
                  Monto Total (Dólares USD)
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ 
                    position: 'absolute', 
                    left: '0.75rem', 
                    fontWeight: 700, 
                    color: 'var(--primary)',
                    fontSize: '1.1rem'
                  }}>$</span>
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
                    style={{ 
                      paddingLeft: '1.75rem', 
                      fontSize: '1.1rem', 
                      fontWeight: 700,
                      color: 'var(--neutral-dark)',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  />
                </div>
              </div>

              {/* Date */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label htmlFor="date" style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.8, marginBottom: '0.25rem' }}>
                  Fecha de Compra
                </label>
                <input
                  id="date"
                  type="date"
                  className="form-input"
                  value={fechaGasto}
                  onChange={e => setFechaGasto(e.target.value)}
                  required
                  disabled={submitting}
                  style={{ borderRadius: 'var(--radius-sm)' }}
                />
              </div>
            </div>

            {/* Description */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label htmlFor="description" style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.8, marginBottom: '0.25rem' }}>
                ¿Qué se compró y para quién?
              </label>
              <textarea
                id="description"
                className="form-input"
                rows={2}
                placeholder="Ej: Compra de 10 botes de agua potable para comedores infantiles..."
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                required
                disabled={submitting}
                style={{ borderRadius: 'var(--radius-sm)', resize: 'vertical' }}
              />
            </div>
          </div>

          {/* STEP 4: DOUBLE DOCUMENT UPLOAD */}
          <div style={{ marginBottom: '2rem' }}>
            <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.75rem' }}>
              4. Toma Fotos de las Evidencias (Factura y Pago) *
            </span>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
              gap: '1rem' 
            }}>
              {/* Document 1: Factura o Recibo */}
              <div style={{ 
                border: '1px solid var(--border-color)', 
                borderRadius: 'var(--radius-md)', 
                padding: '0.85rem',
                backgroundColor: 'var(--neutral-light)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>📄 Recibo o Factura Física</span>
                  {doc1File && <span style={{ color: 'var(--success)', fontSize: '0.7rem', fontWeight: 700 }}>✓ Listo</span>}
                </div>
                
                {doc1Preview ? (
                  <div style={{ position: 'relative', width: '100%', height: '120px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <img src={doc1Preview} alt="Factura Preview" style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#fff' }} />
                    <button
                      type="button"
                      onClick={() => { setDoc1File(null); setDoc1Preview(null); }}
                      style={{
                        position: 'absolute', top: '0.25rem', right: '0.25rem',
                        backgroundColor: 'rgba(239, 68, 68, 0.9)', color: 'white',
                        border: 'none', padding: '0.25rem 0.5rem', borderRadius: '4px',
                        cursor: 'pointer', fontSize: '0.65rem', fontWeight: 600
                      }}
                    >
                      Quitar
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {/* CAMERA SHORTCUT */}
                    <button
                      type="button"
                      onClick={() => document.getElementById('cam-doc1')?.click()}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0.6rem', backgroundColor: 'var(--primary)', color: 'white',
                        border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                        fontSize: '0.75rem', fontWeight: 600
                      }}
                    >
                      📷 Usar Cámara de Campo
                    </button>
                    {/* GALLERY ALTERNATIVE */}
                    <button
                      type="button"
                      onClick={() => document.getElementById('file-doc1')?.click()}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0.5rem', backgroundColor: 'white', color: 'var(--primary)',
                        border: '1px solid var(--primary)', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                        fontSize: '0.7rem', fontWeight: 600
                      }}
                    >
                      📁 Cargar de Galería
                    </button>
                    <input
                      id="cam-doc1"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={e => handleFileChange(e, setDoc1File, setDoc1Preview)}
                      style={{ display: 'none' }}
                    />
                    <input
                      id="file-doc1"
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={e => handleFileChange(e, setDoc1File, setDoc1Preview)}
                      style={{ display: 'none' }}
                    />
                  </div>
                )}
              </div>

              {/* Document 2: Comprobante de Pago */}
              <div style={{ 
                border: '1px solid var(--border-color)', 
                borderRadius: 'var(--radius-md)', 
                padding: '0.85rem',
                backgroundColor: 'var(--neutral-light)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>💳 Comprobante de Pago</span>
                  {doc2File && <span style={{ color: 'var(--success)', fontSize: '0.7rem', fontWeight: 700 }}>✓ Listo</span>}
                </div>
                
                {doc2Preview ? (
                  <div style={{ position: 'relative', width: '100%', height: '120px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <img src={doc2Preview} alt="Comprobante Pago Preview" style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#fff' }} />
                    <button
                      type="button"
                      onClick={() => { setDoc2File(null); setDoc2Preview(null); }}
                      style={{
                        position: 'absolute', top: '0.25rem', right: '0.25rem',
                        backgroundColor: 'rgba(239, 68, 68, 0.9)', color: 'white',
                        border: 'none', padding: '0.25rem 0.5rem', borderRadius: '4px',
                        cursor: 'pointer', fontSize: '0.65rem', fontWeight: 600
                      }}
                    >
                      Quitar
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {/* CAMERA SHORTCUT */}
                    <button
                      type="button"
                      onClick={() => document.getElementById('cam-doc2')?.click()}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0.6rem', backgroundColor: 'var(--primary)', color: 'white',
                        border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                        fontSize: '0.75rem', fontWeight: 600
                      }}
                    >
                      📷 Usar Cámara de Campo
                    </button>
                    {/* GALLERY ALTERNATIVE */}
                    <button
                      type="button"
                      onClick={() => document.getElementById('file-doc2')?.click()}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0.5rem', backgroundColor: 'white', color: 'var(--primary)',
                        border: '1px solid var(--primary)', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                        fontSize: '0.7rem', fontWeight: 600
                      }}
                    >
                      📁 Cargar de Galería
                    </button>
                    <input
                      id="cam-doc2"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={e => handleFileChange(e, setDoc2File, setDoc2Preview)}
                      style={{ display: 'none' }}
                    />
                    <input
                      id="file-doc2"
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={e => handleFileChange(e, setDoc2File, setDoc2Preview)}
                      style={{ display: 'none' }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            className="btn btn-secondary" 
            style={{ 
              width: '100%', 
              padding: '1rem', 
              fontSize: '1rem', 
              fontWeight: 700, 
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-md)',
              cursor: submitting ? 'not-allowed' : 'pointer'
            }}
            disabled={submitting}
          >
            {submitting ? 'Enviando comprobantes...' : '🚀 Guardar Gasto y Enviar a Auditoría'}
          </button>

        </form>
      </div>

      {/* History of coordinator spends */}
      <div>
        <h3 style={{ fontSize: '1.2rem', color: 'var(--primary)', marginBottom: '1rem', fontWeight: 800 }}>
          Tus Envíos Recientes
        </h3>

        {recentExpenses.length === 0 ? (
          <div className="card" style={{ padding: '2.5rem', textAlign: 'center', opacity: 0.6, backgroundColor: '#fff', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>📭</span>
            No has cargado gastos todavía.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {recentExpenses.map(exp => (
              <div key={exp.id} className="card" style={{ padding: '1.2rem', borderRadius: 'var(--radius-md)', backgroundColor: '#fff', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.8rem', opacity: 0.6, fontWeight: 700 }}>{exp.fecha_gasto}</span>
                  <span style={{ fontWeight: 800, color: 'var(--neutral-dark)', fontSize: '1.1rem' }}>
                    {formatCurrency(exp.monto)}
                  </span>
                </div>
                
                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', color: 'var(--neutral-dark)', fontWeight: 500 }}>
                  {exp.descripcion}
                </p>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--neutral-light)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--neutral-dark)', opacity: 0.75 }}>
                    Partida: {partidas.find(p => p.id === exp.partida_id)?.nombre || 'Ayuda'}
                  </span>
                  {getStatusBadge(exp.estado)}
                </div>

                {exp.estado === 'rechazado' && exp.comentarios_auditoria && (
                  <div style={{
                    marginTop: '0.75rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.05)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.6rem 0.85rem',
                    fontSize: '0.8rem',
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
