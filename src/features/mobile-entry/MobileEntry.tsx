import React, { useState, useEffect } from 'react';
import {
  Send,
  ClipboardList,
  Truck,
  Users,
  Building,
  Megaphone,
  Banknote,
  RefreshCw,
  MapPin,
  Check,
  AlertTriangle,
  FileText,
  Camera,
  FolderOpen,
  CreditCard,
  Mailbox,
  HeartHandshake,
} from 'lucide-react';
import { api, requisitionsApi } from '../../services/api';
import type {
  Project,
  ExpenseCategory,
  PartidaGasto,
  ExpenseReceipt,
  Requisition,
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatDateForFrontEnd } from '../../utils/formatters';

// Helper icons for categories
const getCategoryIcon = (name: string) => {
  const n = name.toLowerCase();
  if (
    n.includes('1.') ||
    n.includes('costos directos') ||
    n.includes('alim') ||
    n.includes('nutri')
  )
    return <HeartHandshake size={24} />;
  if (n.includes('2.') || n.includes('transp') || n.includes('logis') || n.includes('almacen'))
    return <Truck size={24} />;
  if (n.includes('3.') || n.includes('person') || n.includes('recurs')) return <Users size={24} />;
  if (
    n.includes('4.') ||
    n.includes('oficin') ||
    n.includes('funcion') ||
    n.includes('operat') ||
    n.includes('indirect')
  )
    return <Building size={24} />;
  if (n.includes('5.') || n.includes('visibil') || n.includes('monito') || n.includes('evalua'))
    return <Megaphone size={24} />;
  return <Banknote size={24} />;
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
      const [projList, catList, partList, myExpenses, approvedReqs, budgetList] = await Promise.all(
        [
          api.getProjects(),
          api.getCategories(),
          api.getPartidas(),
          api.getRecentExpensesByUserId(profile.id, 20),
          requisitionsApi.getApprovedRequisitions(50),
          api.getBudgets(),
        ],
      );
      setProjects(projList.filter((p) => p.activo));
      setCategories(catList);
      setPartidas(partList);
      setBudgets(budgetList);

      setRecentExpenses(myExpenses);

      // Filter approved requisitions that do not have an executed expense yet from this user
      // Note: If someone else executed it, it might still appear here, but directors can see all open ones.
      const activeReqs = approvedReqs.filter(
        (r) => !myExpenses.some((e) => e.solicitud_id === r.id),
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
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (f: File | null) => void,
    setPreview: (p: string | null) => void,
  ) => {
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
    ? partidas.filter((p) =>
        budgets.some(
          (b) => b.proyecto_id === projectId && b.partida_id === p.id && b.monto_asignado > 0,
        ),
      )
    : [];

  const handleSelectRequisition = (reqId: string) => {
    setSolicitudId(reqId);
    if (reqId) {
      const selected = approvedRequisitions.find((r) => r.id === reqId);
      if (selected) {
        setProjectId(selected.proyecto_id);
        setPartidaId(selected.partida_id);

        // Find category from partida
        const partObj = partidas.find((p) => p.id === selected.partida_id);
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
      await api.createExpense(
        {
          proyecto_id: projectId,
          partida_id: partidaId,
          solicitante_id: profile.id,
          solicitante_nombre: profile.nombre_completo,
          solicitud_id: solicitudId || null,
          monto: parseFloat(monto),
          descripcion: descripcion,
          fecha_gasto: fechaGasto,
          url_comprobante: doc1Preview, // fallback simulated URL
        },
        doc1File || undefined,
        doc2File || undefined,
      );

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
      case 'aprobado':
        return <span className="badge badge-success">Aprobado</span>;
      case 'pendiente_revision':
        return <span className="badge badge-warning">En Revisión</span>;
      case 'rechazado':
        return <span className="badge badge-danger">Rechazado</span>;
      default:
        return <span className="badge badge-info">{status}</span>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(amount);
  };

  if (loading && recentExpenses.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <RefreshCw size={32} />
        </div>
        <strong>Cargando formulario simplificado...</strong>
      </div>
    );
  }

  return (
    <div
      className="animate-fade-in-up"
      style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '3rem' }}
    >
      {/* Header Info */}
      <div
        style={{
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--primary)', fontWeight: 800 }}>
            Carga Rápida de Gastos
          </h2>
          <p
            style={{
              fontSize: '0.85rem',
              opacity: 0.8,
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            Diseñado para ingreso fácil en campo <MapPin size={14} />
          </p>
        </div>
      </div>

      {/* Simplified Entry Form */}
      <div style={{ marginBottom: '2.5rem', padding: '0.5rem' }}>
        <form onSubmit={handleSubmit}>
          {/* Requisition Selector (Always visible so users know the feature exists) */}
          <div
            style={{
              marginBottom: '1.5rem',
              padding: '1rem',
              backgroundColor: 'rgba(0, 143, 166, 0.05)',
              border: '1px solid rgba(0, 143, 166, 0.2)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <label
              htmlFor="select-solicitud"
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: 'var(--accent)',
                marginBottom: '0.5rem',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ClipboardList size={16} /> ¿Esta compra proviene de una solicitud autorizada?
              </span>
            </label>

            {approvedRequisitions.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--neutral-dark)', opacity: 0.8 }}>
                No tienes requisiciones aprobadas pendientes por ejecutar. Se registrará como un
                gasto independiente.
              </div>
            ) : (
              <>
                <select
                  id="select-solicitud"
                  className="app-input"
                  value={solicitudId}
                  onChange={(e) => handleSelectRequisition(e.target.value)}
                  disabled={submitting}
                  style={{ borderColor: 'var(--accent)' }}
                >
                  <option value="">Gasto independiente (Sin solicitud previa)</option>
                  {approvedRequisitions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.codigo ? `${r.codigo} - ` : ''}
                      {r.proyecto_nombre} - {r.categoria_nombre} (${r.monto_solicitado.toFixed(2)})
                    </option>
                  ))}
                </select>
                {solicitudId && (
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--accent)',
                      marginTop: '0.4rem',
                      fontWeight: 500,
                    }}
                  >
                    ✓ Proyecto, categoría y monto pre-cargados desde la solicitud.
                  </div>
                )}
              </>
            )}
          </div>

          {/* STEP 1: PROJECT SELECTION */}
          <div style={{ marginBottom: '1.5rem' }}>
            <span
              style={{
                display: 'block',
                fontSize: '0.9rem',
                fontWeight: 700,
                color: 'var(--primary)',
                marginBottom: '0.75rem',
              }}
            >
              1. Selecciona el Proyecto Asignado *
            </span>

            <select
              id="select-proyecto"
              className="app-input"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={submitting}
              required
            >
              <option value="">-- Selecciona el proyecto --</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* STEP 2: CATEGORY SELECTION */}
          <div style={{ marginBottom: '1.5rem' }}>
            <span
              style={{
                display: 'block',
                fontSize: '0.9rem',
                fontWeight: 700,
                color: 'var(--primary)',
                marginBottom: '0.75rem',
              }}
            >
              2. ¿En qué se gastó el dinero? *
            </span>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '0.5rem',
              }}
            >
              {categories.map((c) => {
                const isSelected = categoryId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setCategoryId(c.id);
                      setPartidaId('');
                    }}
                    disabled={submitting}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '1rem 0.5rem',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected
                        ? '2.5px solid var(--primary)'
                        : '1px solid var(--border-color)',
                      backgroundColor: isSelected ? 'rgba(47, 90, 174, 0.08)' : 'white',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                      fontWeight: isSelected ? 700 : 500,
                      minHeight: '90px',
                    }}
                  >
                    <span style={{ fontSize: '1.8rem', marginBottom: '0.4rem' }}>
                      {getCategoryIcon(c.nombre)}
                    </span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        textAlign: 'center',
                        color: 'var(--neutral-dark)',
                      }}
                    >
                      {c.nombre.split(' (')[0].replace(/^\d+\.\s+/, '')}
                    </span>
                  </button>
                );
              })}
            </div>

            {categoryId && (
              <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column' }}>
                <label
                  htmlFor="partida-select"
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    opacity: 0.8,
                    marginBottom: '0.25rem',
                  }}
                >
                  Seleccionar Partida de Gasto UNDG *
                </label>
                {partidasConPresupuesto.filter((p) => p.categoria_id === categoryId).length ===
                0 ? (
                  <div
                    style={{
                      padding: '0.75rem',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(190,87,75,0.08)',
                      border: '1px solid rgba(190,87,75,0.3)',
                      fontSize: '0.8rem',
                      color: 'var(--danger)',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <AlertTriangle size={16} /> Esta categoría no tiene presupuesto asignado en el
                      proyecto seleccionado.
                    </span>
                    Ve a <strong>Presupuestos → Asistente UNDG</strong> para asignar montos primero.
                  </div>
                ) : (
                  <select
                    id="partida-select"
                    className="app-input form-select"
                    value={partidaId}
                    onChange={(e) => setPartidaId(e.target.value)}
                    disabled={submitting}
                    required
                  >
                    <option value="">-- Elija la partida contable --</option>
                    {partidasConPresupuesto
                      .filter((p) => p.categoria_id === categoryId)
                      .map((p) => {
                        const b = budgets.find(
                          (b) => b.proyecto_id === projectId && b.partida_id === p.id,
                        );
                        const disponible = b
                          ? b.monto_asignado - b.monto_ejecutado - b.monto_comprometido
                          : 0;
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
            <span
              style={{
                display: 'block',
                fontSize: '0.9rem',
                fontWeight: 700,
                color: 'var(--primary)',
                marginBottom: '0.75rem',
              }}
            >
              3. Ingresa los Datos de la Compra *
            </span>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.75rem',
                marginBottom: '0.75rem',
              }}
            >
              {/* Amount */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label
                  htmlFor="amount"
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    opacity: 0.8,
                    marginBottom: '0.25rem',
                  }}
                >
                  Monto Total (Dólares USD)
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: '0.75rem',
                      fontWeight: 700,
                      color: 'var(--primary)',
                      fontSize: '1.1rem',
                    }}
                  >
                    $
                  </span>
                  <input
                    id="amount"
                    type="number"
                    step="0.01"
                    className="app-input"
                    placeholder="0.00"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    required
                    disabled={submitting}
                    style={{
                      paddingLeft: '1.75rem',
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      color: 'var(--neutral-dark)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  />
                </div>
              </div>

              {/* Date */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label
                  htmlFor="date"
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    opacity: 0.8,
                    marginBottom: '0.25rem',
                  }}
                >
                  Fecha de Compra
                </label>
                <input
                  id="date"
                  type="date"
                  className="app-input"
                  value={fechaGasto}
                  onChange={(e) => setFechaGasto(e.target.value)}
                  required
                  disabled={submitting}
                  style={{ borderRadius: 'var(--radius-sm)' }}
                />
              </div>
            </div>

            {/* Description */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label
                htmlFor="description"
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  opacity: 0.8,
                  marginBottom: '0.25rem',
                }}
              >
                ¿Qué se compró y para quién?
              </label>
              <textarea
                id="description"
                className="app-input"
                rows={2}
                placeholder="Ej: Compra de 10 botes de agua potable para comedores infantiles..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                required
                disabled={submitting}
                style={{ borderRadius: 'var(--radius-sm)', resize: 'vertical' }}
              />
            </div>
          </div>

          {/* STEP 4: DOUBLE DOCUMENT UPLOAD */}
          <div style={{ marginBottom: '2rem' }}>
            <span
              style={{
                display: 'block',
                fontSize: '0.9rem',
                fontWeight: 700,
                color: 'var(--primary)',
                marginBottom: '0.75rem',
              }}
            >
              4. Toma Fotos de las Evidencias (Factura y Pago) *
            </span>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1rem',
              }}
            >
              {/* Document 1: Factura o Recibo */}
              <div
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem',
                  backgroundColor: 'var(--neutral-light)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.5rem',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <FileText size={14} /> Recibo o Factura Física
                  </span>
                  {doc1File && (
                    <span
                      style={{
                        color: 'var(--success)',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                      }}
                    >
                      <Check size={10} /> Listo
                    </span>
                  )}
                </div>

                {doc1Preview ? (
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '120px',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <img
                      src={doc1Preview}
                      alt="Factura Preview"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        backgroundColor: '#fff',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setDoc1File(null);
                        setDoc1Preview(null);
                      }}
                      style={{
                        position: 'absolute',
                        top: '0.25rem',
                        right: '0.25rem',
                        backgroundColor: 'rgba(239, 68, 68, 0.9)',
                        color: 'white',
                        border: 'none',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.65rem',
                        fontWeight: 600,
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
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.6rem',
                        backgroundColor: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        minHeight: '44px',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Camera size={14} /> Usar Cámara de Campo
                      </span>
                    </button>
                    {/* GALLERY ALTERNATIVE */}
                    <button
                      type="button"
                      onClick={() => document.getElementById('file-doc1')?.click()}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.5rem',
                        backgroundColor: 'white',
                        color: 'var(--primary)',
                        border: '1px solid var(--primary)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        minHeight: '44px',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <FolderOpen size={14} /> Cargar de Galería
                      </span>
                    </button>
                    <input
                      id="cam-doc1"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handleFileChange(e, setDoc1File, setDoc1Preview)}
                      style={{ display: 'none' }}
                    />
                    <input
                      id="file-doc1"
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileChange(e, setDoc1File, setDoc1Preview)}
                      style={{ display: 'none' }}
                    />
                  </div>
                )}
              </div>

              {/* Document 2: Comprobante de Pago */}
              <div
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem',
                  backgroundColor: 'var(--neutral-light)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.5rem',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <CreditCard size={14} /> Comprobante de Pago
                  </span>
                  {doc2File && (
                    <span
                      style={{
                        color: 'var(--success)',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                      }}
                    >
                      <Check size={10} /> Listo
                    </span>
                  )}
                </div>

                {doc2Preview ? (
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '120px',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <img
                      src={doc2Preview}
                      alt="Comprobante Pago Preview"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        backgroundColor: '#fff',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setDoc2File(null);
                        setDoc2Preview(null);
                      }}
                      style={{
                        position: 'absolute',
                        top: '0.25rem',
                        right: '0.25rem',
                        backgroundColor: 'rgba(239, 68, 68, 0.9)',
                        color: 'white',
                        border: 'none',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.65rem',
                        fontWeight: 600,
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
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.6rem',
                        backgroundColor: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        minHeight: '44px',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Camera size={14} /> Usar Cámara de Campo
                      </span>
                    </button>
                    {/* GALLERY ALTERNATIVE */}
                    <button
                      type="button"
                      onClick={() => document.getElementById('file-doc2')?.click()}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.5rem',
                        backgroundColor: 'white',
                        color: 'var(--primary)',
                        border: '1px solid var(--primary)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        minHeight: '44px',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <FolderOpen size={14} /> Cargar de Galería
                      </span>
                    </button>
                    <input
                      id="cam-doc2"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handleFileChange(e, setDoc2File, setDoc2Preview)}
                      style={{ display: 'none' }}
                    />
                    <input
                      id="file-doc2"
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileChange(e, setDoc2File, setDoc2Preview)}
                      style={{ display: 'none' }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="sticky-bottom-bar">
            <button
              type="submit"
              className="btn btn-secondary"
              style={{
                width: '100%',
                padding: '1.2rem',
                fontSize: '1.1rem',
                fontWeight: 700,
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-md)',
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
              disabled={submitting}
            >
              {submitting ? (
                'Enviando comprobantes...'
              ) : (
                <>
                  <Send size={20} /> Guardar Gasto y Enviar a Auditoría
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* History of coordinator spends */}
      <div>
        <h3
          style={{
            fontSize: '1.2rem',
            color: 'var(--primary)',
            marginBottom: '1rem',
            fontWeight: 800,
          }}
        >
          Tus Envíos Recientes
        </h3>

        {recentExpenses.length === 0 ? (
          <div
            className="card"
            style={{
              padding: '2.5rem',
              textAlign: 'center',
              opacity: 0.6,
              backgroundColor: '#fff',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
              <Mailbox size={32} />
            </div>
            No has cargado gastos todavía.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {recentExpenses.map((exp) => (
              <div
                key={exp.id}
                className="card"
                style={{
                  padding: '1.2rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#fff',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <span style={{ fontSize: '0.8rem', opacity: 0.6, fontWeight: 700 }}>
                    {formatDateForFrontEnd(exp.fecha_gasto)}
                  </span>
                  <span
                    style={{ fontWeight: 800, color: 'var(--neutral-dark)', fontSize: '1.1rem' }}
                  >
                    {formatCurrency(exp.monto)}
                  </span>
                </div>

                <p
                  style={{
                    fontSize: '0.9rem',
                    marginTop: '0.5rem',
                    color: 'var(--neutral-dark)',
                    fontWeight: 500,
                  }}
                >
                  {exp.descripcion}
                </p>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '0.75rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid var(--neutral-light)',
                  }}
                >
                  <span
                    style={{ fontSize: '0.75rem', color: 'var(--neutral-dark)', opacity: 0.75 }}
                  >
                    Partida: {partidas.find((p) => p.id === exp.partida_id)?.nombre || 'Ayuda'}
                  </span>
                  {getStatusBadge(exp.estado)}
                </div>

                {exp.estado === 'rechazado' && exp.comentarios_auditoria && (
                  <div
                    style={{
                      marginTop: '0.75rem',
                      backgroundColor: 'rgba(239, 68, 68, 0.05)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.6rem 0.85rem',
                      fontSize: '0.8rem',
                      color: 'var(--danger)',
                    }}
                  >
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
