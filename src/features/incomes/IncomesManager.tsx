import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { Project, Donation, Donante, BankTransaction } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(amount);

const FLAG_MAP: Record<string, string> = {
  'Venezuela': '🇻🇪', 'Reino Unido': '🇬🇧', 'Estados Unidos': '🇺🇸',
  'Europa': '🇪🇺', 'Internacional': '🌐'
};

export const IncomesManager: React.FC = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Data
  const [projects, setProjects] = useState<Project[]>([]);
  const [donantes, setDonantes] = useState<Donante[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [bankTxs, setBankTxs] = useState<BankTransaction[]>([]);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [proyectoId, setProyectoId] = useState('');
  const [donanteId, setDonanteId] = useState('');
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [transaccionId, setTransaccionId] = useState('');
  const [tipoRegistro, setTipoRegistro] = useState<'manual' | 'bancario'>('manual');

  // Filters
  const [filterProject, setFilterProject] = useState('todos');

  const loadData = async () => {
    setLoading(true);
    try {
      const [projList, donList, donationList, txList] = await Promise.all([
        api.getProjects(),
        api.getDonantes(),
        api.getDonations(),
        api.getBankTransactions()
      ]);
      setProjects(projList.filter(p => p.activo));
      setDonantes(donList);
      setDonations(donationList);
      // Only show pending inflows (positive amounts not yet reconciled)
      setBankTxs(txList.filter(t => t.monto > 0 && t.estado === 'pendiente'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSelectTx = (txId: string) => {
    setTransaccionId(txId);
    if (txId) {
      const tx = bankTxs.find(t => t.id === txId);
      if (tx) {
        setMonto(tx.monto.toString());
        setDescripcion(tx.descripcion);
        setFecha(tx.fecha);
      }
    } else {
      setMonto(''); setDescripcion(''); setFecha(new Date().toISOString().split('T')[0]);
    }
  };

  const resetForm = () => {
    setProyectoId(''); setDonanteId(''); setMonto(''); setDescripcion('');
    setFecha(new Date().toISOString().split('T')[0]);
    setTransaccionId(''); setTipoRegistro('manual');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proyectoId || !donanteId || !monto || !descripcion) {
      alert('Complete todos los campos obligatorios.'); return;
    }
    const numMonto = parseFloat(monto);
    if (isNaN(numMonto) || numMonto <= 0) {
      alert('El monto debe ser mayor a 0.'); return;
    }

    setSubmitting(true);
    try {
      const donante = donantes.find(d => d.id === donanteId);
      await api.createDonation({
        proyecto_id: proyectoId,
        transaccion_id: transaccionId || null,
        donante: donante?.nombre || 'Donante Desconocido',
        monto: numMonto,
        descripcion: descripcion.trim(),
        fecha
      });
      alert('✅ Ingreso registrado correctamente.');
      resetForm();
      setShowForm(false);
      await loadData();
    } catch (err: any) {
      alert('Error al registrar el ingreso: ' + (err.message || ''));
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered & computed
  const filteredDonations = donations.filter(d =>
    filterProject === 'todos' ? true : d.proyecto_id === filterProject
  );

  const totalIngresos = filteredDonations.reduce((s, d) => s + d.monto, 0);

  const getProjectName = (id: string | null) =>
    id ? (projects.find(p => p.id === id)?.nombre ?? 'Proyecto Desconocido') : 'Sin Proyecto';

  const getDonanteInfo = (nombre: string) => {
    const d = donantes.find(x => x.nombre === nombre);
    return d ? { flag: FLAG_MAP[d.pais || ''] || '🤝', tipo: d.tipo } : { flag: '🤝', tipo: null };
  };

  const projectTotals = projects.map(p => ({
    ...p,
    total: donations.filter(d => d.proyecto_id === p.id).reduce((s, d) => s + d.monto, 0),
    count: donations.filter(d => d.proyecto_id === p.id).length
  })).filter(p => p.total > 0 || p.activo);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--primary)' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>💰</div>
        <strong>Cargando ingresos...</strong>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">

      {/* ── HEADER ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ color: 'var(--primary)', fontWeight: 800, margin: 0, fontSize: '1.6rem' }}>
            💰 Registro de Ingresos
          </h2>
          <p style={{ margin: '0.25rem 0 0', opacity: 0.6, fontSize: '0.85rem' }}>
            Donaciones y aportes confirmados por proyecto y donante
          </p>
        </div>
        {['administrador', 'director'].includes(profile?.rol || '') && (
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
            style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            ＋ Registrar Ingreso
          </button>
        )}
      </div>

      {/* ── RESUMEN POR PROYECTO ─────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {/* Total general */}
        <div className="card" style={{ padding: '1.25rem', background: 'linear-gradient(135deg, var(--primary) 0%, #1a3a7a 100%)', color: '#fff', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', opacity: 0.8, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Ingresos Registrados</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{formatCurrency(donations.reduce((s, d) => s + d.monto, 0))}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.75, marginTop: '0.25rem' }}>{donations.length} transferencias registradas</div>
        </div>

        {/* Por proyecto */}
        {projectTotals.slice(0, 4).map(p => (
          <div key={p.id} className="card" style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--primary)' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.6, textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
              {p.nombre.length > 30 ? p.nombre.slice(0, 30) + '…' : p.nombre}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>{formatCurrency(p.total)}</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.55, marginTop: '0.2rem' }}>{p.count} {p.count === 1 ? 'ingreso' : 'ingresos'}</div>
          </div>
        ))}
      </div>

      {/* ── FILTRO ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, opacity: 0.7 }}>Filtrar por proyecto:</span>
        {[{ id: 'todos', nombre: '🌐 Todos los proyectos' }, ...projects].map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => setFilterProject(p.id)}
            style={{
              padding: '0.3rem 0.9rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600,
              border: '1.5px solid', cursor: 'pointer', transition: 'all 0.2s',
              borderColor: filterProject === p.id ? 'var(--primary)' : 'var(--border-color)',
              backgroundColor: filterProject === p.id ? 'var(--primary)' : 'transparent',
              color: filterProject === p.id ? '#fff' : 'var(--neutral-dark)'
            }}
          >
            {p.nombre}
          </button>
        ))}
      </div>

      {/* ── TABLA DE INGRESOS ────────────────────────────────────── */}
      <div className="card" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700 }}>Historial de Ingresos</span>
          <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.05rem' }}>
            {formatCurrency(totalIngresos)}
          </span>
        </div>

        {filteredDonations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', opacity: 0.5 }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
            <p style={{ fontWeight: 600 }}>No hay ingresos registrados aún.</p>
            <p style={{ fontSize: '0.85rem' }}>Haz clic en <strong>"Registrar Ingreso"</strong> para comenzar.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.87rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(47,90,174,0.05)', borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, opacity: 0.7 }}>Fecha</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, opacity: 0.7 }}>Donante</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, opacity: 0.7 }}>Proyecto</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, opacity: 0.7 }}>Descripción</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, opacity: 0.7 }}>Monto</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700, opacity: 0.7 }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredDonations.map((d, i) => {
                  const { flag, tipo } = getDonanteInfo(d.donante);
                  return (
                    <tr key={d.id} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)' }}>
                      <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap', fontWeight: 600 }}>{d.fecha}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span>{flag}</span>
                          <div>
                            <div style={{ fontWeight: 600 }}>{d.donante}</div>
                            {tipo && (
                              <div style={{ fontSize: '0.7rem', opacity: 0.5, textTransform: 'capitalize' }}>{tipo}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', opacity: 0.85 }}>{getProjectName(d.proyecto_id)}</td>
                      <td style={{ padding: '0.85rem 1rem', maxWidth: '220px', fontSize: '0.82rem', opacity: 0.75 }}>{d.descripcion}</td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 800, color: 'var(--success)', whiteSpace: 'nowrap' }}>
                        +{formatCurrency(d.monto)}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <span className={`badge ${d.transaccion_id ? 'badge-success' : 'badge-warning'}`}>
                          {d.transaccion_id ? '⚖️ Conciliado' : '📋 Registrado'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL FORMULARIO ─────────────────────────────────────── */}
      {showForm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 1200, padding: '1.5rem', overflowY: 'auto'
        }}>
          <div className="card" style={{
            width: '100%', maxWidth: '560px', padding: '2rem',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
            backgroundColor: 'var(--card-bg, #ffffff)',
            maxHeight: '90vh', overflowY: 'auto'
          }}>

            {/* Header modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div>
                <h3 style={{ color: 'var(--primary)', fontWeight: 800, margin: 0 }}>💰 Nuevo Ingreso</h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', opacity: 0.6 }}>Registrar un aporte o donación confirmada</p>
              </div>
              <button onClick={() => { setShowForm(false); resetForm(); }} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', opacity: 0.5 }}>×</button>
            </div>

            {/* Tipo de registro */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {(['manual', 'bancario'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setTipoRegistro(t); setTransaccionId(''); setMonto(''); setDescripcion(''); }}
                  style={{
                    flex: 1, padding: '0.6rem', borderRadius: '8px', fontWeight: 600,
                    fontSize: '0.8rem', border: '2px solid', cursor: 'pointer', transition: 'all 0.2s',
                    borderColor: tipoRegistro === t ? 'var(--primary)' : 'var(--border-color)',
                    backgroundColor: tipoRegistro === t ? 'var(--primary)' : 'transparent',
                    color: tipoRegistro === t ? '#fff' : 'var(--neutral-dark)'
                  }}
                >
                  {t === 'manual' ? '✏️ Ingreso Manual' : '🏦 Desde Extracto Bancario'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* Vincular a transacción bancaria */}
              {tipoRegistro === 'bancario' && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Transacción Bancaria Pendiente *</label>
                  {bankTxs.length === 0 ? (
                    <div style={{ padding: '0.75rem', borderRadius: '6px', backgroundColor: 'rgba(190,87,75,0.06)', border: '1px solid rgba(190,87,75,0.2)', fontSize: '0.82rem', color: 'var(--danger)' }}>
                      No hay transacciones de ingreso pendientes de conciliar.
                    </div>
                  ) : (
                    <select className="form-input" value={transaccionId} onChange={e => handleSelectTx(e.target.value)} required>
                      <option value="">Seleccionar transferencia bancaria...</option>
                      {bankTxs.map(tx => (
                        <option key={tx.id} value={tx.id}>
                          {tx.fecha} — {tx.referencia} — ${tx.monto.toFixed(2)} — {tx.descripcion.slice(0, 40)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Proyecto */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Proyecto Receptor *</label>
                <select className="form-input" value={proyectoId} onChange={e => setProyectoId(e.target.value)} required disabled={submitting}>
                  <option value="">Selecciona el proyecto...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>

              {/* Donante */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Donante / Fuente *</label>
                <select className="form-input" value={donanteId} onChange={e => setDonanteId(e.target.value)} required disabled={submitting}>
                  <option value="">Selecciona el donante...</option>
                  <optgroup label="🇻🇪 Nacionales">
                    {donantes.filter(d => d.tipo === 'nacional').map(d => (
                      <option key={d.id} value={d.id}>{FLAG_MAP[d.pais || ''] || '🤝'} {d.nombre}</option>
                    ))}
                  </optgroup>
                  <optgroup label="✈️ Extranjeros">
                    {donantes.filter(d => d.tipo === 'extranjero').map(d => (
                      <option key={d.id} value={d.id}>{FLAG_MAP[d.pais || ''] || '🤝'} {d.nombre}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Fecha y Monto */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Fecha Recepción *</label>
                  <input type="date" className="form-input" value={fecha} onChange={e => setFecha(e.target.value)} required disabled={submitting} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Monto (USD) *</label>
                  <input
                    type="number" step="0.01" min="0.01"
                    className="form-input"
                    value={monto}
                    onChange={e => setMonto(e.target.value)}
                    placeholder="0.00"
                    required
                    disabled={submitting || (tipoRegistro === 'bancario' && !!transaccionId)}
                  />
                </div>
              </div>

              {/* Descripción */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Descripción / Referencia *</label>
                <textarea
                  className="form-input" rows={3}
                  placeholder="Ej: Primer desembolso Convenio 2026-A, cuota trimestral confirmada..."
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  required
                  disabled={submitting}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Acciones */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => { setShowForm(false); resetForm(); }} disabled={submitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Guardando...' : '✅ Registrar Ingreso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
