import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { Project, Donation, Donante } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(amount);

const formatVesCurrency = (amount: number) =>
  new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(amount);

const FLAG_MAP: Record<string, string> = {
  'Venezuela': '🇻🇪', 'Reino Unido': '🇬🇧', 'Estados Unidos': '🇺🇸',
  'Europa': '🇪🇺', 'Internacional': '🌐'
};

export const IncomesManager: React.FC = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);

  // Data
  const [projects, setProjects] = useState<Project[]>([]);
  const [donantes, setDonantes] = useState<Donante[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);

  // Filters
  const [filterProject, setFilterProject] = useState('todos');

  const loadData = async () => {
    setLoading(true);
    try {
      const [projList, donList, donationList] = await Promise.all([
        api.getProjects(),
        api.getDonantes(),
        api.getDonations()
      ]);
      setProjects(projList.filter(p => p.activo));
      setDonantes(donList);
      setDonations(donationList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Recargar datos cuando el usuario vuelve a enfocar esta pestaña (ej: tras cerrar la pestaña de registro)
  useEffect(() => {
    const handleFocus = () => {
      loadData();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);





  // Filtered & computed
  const filteredDonations = donations.filter(d =>
    filterProject === 'todos' ? true : d.proyecto_id === filterProject
  );

  const totalIngresosUsd = filteredDonations.reduce((s, d) => s + (d.monto_usd || d.monto), 0);
  const totalIngresosVes = filteredDonations.reduce((s, d) => s + (d.monto_ves || 0), 0);

  const getProjectName = (id: string | null) =>
    id ? (projects.find(p => p.id === id)?.nombre ?? 'Proyecto Desconocido') : 'Sin Proyecto';

  const getDonanteInfo = (nombre: string) => {
    const d = donantes.find(x => x.nombre === nombre);
    return d ? { flag: FLAG_MAP[d.pais || ''] || '🤝', tipo: d.tipo } : { flag: '🤝', tipo: null };
  };

  const projectTotals = projects.map(p => {
    const projDonations = donations.filter(d => d.proyecto_id === p.id);
    return {
      ...p,
      totalUsd: projDonations.reduce((s, d) => s + (d.monto_usd || d.monto), 0),
      totalVes: projDonations.reduce((s, d) => s + (d.monto_ves || 0), 0),
      count: projDonations.length
    };
  }).filter(p => p.totalUsd > 0 || p.activo);

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
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              className="btn btn-outline"
              onClick={() => window.open('/?page=importar-extracto', '_blank')}
              style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              📥 Importar Extracto (CSV)
            </button>
            <button
              className="btn btn-primary"
              onClick={() => window.open('/?page=nuevo-ingreso', '_blank')}
              style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              ＋ Registrar Ingreso
            </button>
          </div>
        )}
      </div>

      {/* ── RESUMEN GENERAL Y POR PROYECTO ───────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {/* Total general */}
        <div className="card" style={{ padding: '1.25rem', background: 'linear-gradient(135deg, var(--primary) 0%, #1a3a7a 100%)', color: '#fff', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', opacity: 0.8, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Ingresos</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{formatCurrency(totalIngresosUsd)}</div>
          {totalIngresosVes > 0 && (
            <div style={{ fontSize: '0.9rem', opacity: 0.9, marginTop: '0.15rem' }}>
              Equiv. VES: {formatVesCurrency(totalIngresosVes)}
            </div>
          )}
          <div style={{ fontSize: '0.75rem', opacity: 0.75, marginTop: '0.4rem' }}>{filteredDonations.length} transacciones registradas</div>
        </div>

        {/* Por proyecto (Top 3) */}
        {projectTotals.slice(0, 3).map(p => (
          <div key={p.id} className="card" style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--primary)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.6, textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
                {p.nombre.length > 30 ? p.nombre.slice(0, 30) + '…' : p.nombre}
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>{formatCurrency(p.totalUsd)}</div>
              {p.totalVes > 0 && (
                <div style={{ fontSize: '0.8rem', opacity: 0.7, fontWeight: 500 }}>
                  {formatVesCurrency(p.totalVes)}
                </div>
              )}
            </div>
            <div style={{ fontSize: '0.75rem', opacity: 0.55, marginTop: '0.5rem' }}>{p.count} {p.count === 1 ? 'ingreso' : 'ingresos'}</div>
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
            {formatCurrency(totalIngresosUsd)}
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
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700, opacity: 0.7 }}>Medio/Moneda</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, opacity: 0.7 }}>Monto Original</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, opacity: 0.7 }}>Tasa BCV</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, opacity: 0.7 }}>Equiv. USD</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700, opacity: 0.7 }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredDonations.map((d, i) => {
                  const { flag, tipo } = getDonanteInfo(d.donante);
                  const isVES = d.moneda === 'VES';
                  
                  return (
                    <tr key={d.id} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)' }}>
                      <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600 }}>{d.fecha}</div>
                        {d.created_at && (
                          <div style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '0.15rem' }} title="Fecha en que se procesó el registro">
                            Reg: {new Date(d.created_at).toLocaleDateString('es-VE')}
                          </div>
                        )}
                      </td>
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
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.15rem', alignItems: 'center' }}>
                          <span className={`badge ${isVES ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.1rem 0.4rem' }}>
                            {isVES ? '🇻🇪 VES' : '💵 USD'}
                          </span>
                          <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>
                            {d.medio_pago === 'efectivo' ? '💵 Efectivo' : '🏦 Transf.'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>
                        {isVES 
                          ? formatVesCurrency(d.monto_original || 0) 
                          : formatCurrency(d.monto_original || d.monto)
                        }
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontFamily: 'monospace', opacity: d.tasa_bcv ? 1 : 0.4 }}>
                        {d.tasa_bcv ? `${d.tasa_bcv.toFixed(4)} Bs` : '—'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 800, color: 'var(--success)', whiteSpace: 'nowrap' }}>
                        +{formatCurrency(d.monto_usd || d.monto)}
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
    </div>
  );
};
