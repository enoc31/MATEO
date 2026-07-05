import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import type { Project, Donation, Donante, BankTransaction, TasaBCV } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Papa from 'papaparse';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(amount);

const formatVesCurrency = (amount: number) =>
  new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(amount);

const FLAG_MAP: Record<string, string> = {
  'Venezuela': '🇻🇪', 'Reino Unido': '🇬🇧', 'Estados Unidos': '🇺🇸',
  'Europa': '🇪🇺', 'Internacional': '🌐'
};

const parseRobustAmount = (amountStr: string): number => {
  let str = amountStr.trim();
  if (str.includes('.') && str.includes(',')) {
    const firstDot = str.indexOf('.');
    const firstComma = str.indexOf(',');
    if (firstDot < firstComma) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    const lastCommaIndex = str.lastIndexOf(',');
    if (str.length - lastCommaIndex <= 3) {
      str = str.replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  }
  return parseFloat(str);
};

export const IncomesManager: React.FC = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [importingFile, setImportingFile] = useState(false);

  // Data
  const [projects, setProjects] = useState<Project[]>([]);
  const [donantes, setDonantes] = useState<Donante[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [tasas, setTasas] = useState<TasaBCV[]>([]);
  const [latestRate, setLatestRate] = useState<number | null>(null);

  // Import CSV state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMoneda, setImportMoneda] = useState<'USD' | 'VES'>('USD');
  const [csvTxs, setCsvTxs] = useState<Omit<BankTransaction, 'id' | 'estado'>[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // Filters
  const [filterProject, setFilterProject] = useState('todos');

  const loadData = async () => {
    setLoading(true);
    try {
      const [projList, donList, donationList, ratesList] = await Promise.all([
        api.getProjects(),
        api.getDonantes(),
        api.getDonations(),
        api.getTasasBCV()
      ]);
      setProjects(projList.filter(p => p.activo));
      setDonantes(donList);
      setDonations(donationList);
      setTasas(ratesList);
      
      const latest = ratesList[0];
      setLatestRate(latest ? latest.tasa : null);
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

  // Helper local para buscar tasa
  const getRateForDateLocal = (dateStr: string) => {
    if (!tasas || tasas.length === 0) return latestRate;
    const exacta = tasas.find(t => t.fecha === dateStr);
    if (exacta) return exacta.tasa;
    const anteriores = tasas.filter(t => t.fecha < dateStr).sort((a, b) => b.fecha.localeCompare(a.fecha));
    return anteriores[0]?.tasa || latestRate;
  };

  // Procesar archivo CSV del banco
  const handleImportCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'ISO-8859-1',
      complete: (results) => {
        const parsedTxs: Omit<BankTransaction, 'id' | 'estado'>[] = [];

        results.data.forEach((row: any) => {
          const keys = Object.keys(row);
          if (keys.length === 0) return;

          const fechaKey = keys.find(k => {
            const ck = k.replace(/^\uFEFF/, '').replace(/"/g, '').trim().toLowerCase();
            return ck.includes('fecha') || ck.includes('date');
          });
          const refKey = keys.find(k => {
            const ck = k.replace(/^\uFEFF/, '').replace(/"/g, '').trim().toLowerCase();
            return ck.includes('ref');
          });
          const descKey = keys.find(k => {
            const ck = k.replace(/^\uFEFF/, '').replace(/"/g, '').trim().toLowerCase();
            return ck.includes('desc');
          });
          const amountKey = keys.find(k => {
            const ck = k.replace(/^\uFEFF/, '').replace(/"/g, '').trim().toLowerCase();
            return ck.includes('importe') || ck.includes('amount') || ck.includes('monto');
          });

          // Fallback por índice si no coincide por nombre
          const fKey = fechaKey || keys[0];
          const rKey = refKey || keys[1];
          const dKey = descKey || keys[2];
          const aKey = amountKey || keys[3];

          const dateStr = fKey ? row[fKey]?.replace(/"/g, '').trim() : null;
          const refStr = rKey ? row[rKey]?.replace(/"/g, '').trim() : null;
          const descStr = dKey ? row[dKey]?.replace(/"/g, '').trim() : null;
          const amountStr = aKey ? row[aKey]?.replace(/"/g, '').trim() : null;

          if (dateStr && amountStr && descStr) {
            const dateStrClean = dateStr.replace(/\//g, '-');
            const dateParts = dateStrClean.split('-');
            if (dateParts.length === 3) {
              let formattedDate = '';
              if (dateParts[0].length === 4) {
                formattedDate = `${dateParts[0]}-${dateParts[1]}-${dateParts[2]}`;
              } else {
                let year = dateParts[2];
                if (year.length === 2) year = '20' + year;
                formattedDate = `${year}-${dateParts[1]}-${dateParts[0]}`;
              }
              const amountVal = parseRobustAmount(amountStr);

              if (!isNaN(amountVal) && amountVal > 0) {
                parsedTxs.push({
                  fecha: formattedDate,
                  referencia: refStr || `REF-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
                  descripcion: descStr,
                  monto: amountVal,
                  csv_metadata: {
                    fileName: file.name,
                    moneda: importMoneda
                  }
                });
              }
            }
          }
        });

        if (parsedTxs.length === 0) {
          const firstRow = results.data[0] || {};
          const detectedHeaders = Object.keys(firstRow).join(', ');
          alert(`No se encontraron transacciones de ingreso válidas en el archivo.\n\nCabeceras detectadas: [${detectedHeaders || 'Ninguna'}]\n\nAsegúrese de que el archivo tenga columnas para Fecha, Referencia, Descripción e Importe.`);
          setCsvTxs([]);
          setImportFileName('');
        } else {
          setCsvTxs(parsedTxs);
        }
      },
      error: (err) => {
        alert('Error al leer el archivo CSV: ' + err.message);
      }
    });
  };

  // Confirmar importación
  const handleConfirmImport = async () => {
    if (csvTxs.length === 0) return;
    setImportingFile(true);
    try {
      await api.importBankTransactions(csvTxs);
      alert(`✅ Se importaron exitosamente ${csvTxs.length} transacciones de ingreso.`);
      setCsvTxs([]);
      setImportFileName('');
      setShowImportModal(false);
      await loadData();
    } catch (err: any) {
      const errMsg = err.message || '';
      const errDetails = err.details || '';
      const errHint = err.hint || '';
      alert(`Error al registrar las transacciones: ${errMsg}\nDetalles: ${errDetails}\nSugerencia: ${errHint}`);
    } finally {
      setImportingFile(false);
    }
  };

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

  // Totales de vista previa en el modal de importación
  const sumOriginal = csvTxs.reduce((s, tx) => s + tx.monto, 0);
  const sumUsdEquivalent = csvTxs.reduce((s, tx) => {
    if (importMoneda === 'VES') {
      const rate = getRateForDateLocal(tx.fecha);
      return s + (rate ? tx.monto / rate : 0);
    } else {
      return s + tx.monto;
    }
  }, 0);

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
              onClick={() => setShowImportModal(true)}
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

      {/* ── MODAL IMPORTACIÓN CSV ───────────────────────────────── */}
      {showImportModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 1200, padding: '1.5rem', overflowY: 'auto'
        }}>
          <div className="card" style={{
            width: '100%', maxWidth: '660px', padding: '2rem',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
            backgroundColor: 'var(--card-bg, #ffffff)',
            maxHeight: '90vh', overflowY: 'auto'
          }}>

            {/* Header modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div>
                <h3 style={{ color: 'var(--primary)', fontWeight: 800, margin: 0 }}>📥 Importar Extracto Bancario</h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', opacity: 0.6 }}>Subir movimientos en formato CSV para conciliar</p>
              </div>
              <button onClick={() => { setShowImportModal(false); setCsvTxs([]); setImportFileName(''); }} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', opacity: 0.5 }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Selector de Moneda */}
              <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Seleccione la moneda del Extracto Bancario *</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {(['USD', 'VES'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setImportMoneda(m);
                        setCsvTxs([]);
                        setImportFileName('');
                        if (importFileInputRef.current) importFileInputRef.current.value = '';
                      }}
                      style={{
                        flex: 1, padding: '0.6rem', borderRadius: '8px', fontWeight: 600,
                        fontSize: '0.85rem', border: '2px solid', cursor: 'pointer', transition: 'all 0.2s',
                        borderColor: importMoneda === m ? 'var(--primary)' : 'var(--border-color)',
                        backgroundColor: importMoneda === m ? 'var(--primary)' : 'transparent',
                        color: importMoneda === m ? '#fff' : 'var(--neutral-dark)'
                      }}
                    >
                      {m === 'USD' ? '💵 Dólares (USD)' : '🇻🇪 Bolívares (VES)'}
                    </button>
                  ))}
                </div>
              </div>

              <p style={{ fontSize: '0.82rem', opacity: 0.7, lineHeight: 1.5, margin: 0 }}>
                Seleccione el archivo <strong>REPORTE.CSV</strong> del banco. Solo se considerarán los depósitos o transferencias recibidos (importes positivos mayores a 0).
              </p>

              <input
                type="file"
                accept=".csv"
                ref={importFileInputRef}
                onChange={handleImportCsvChange}
                style={{ display: 'none' }}
              />

              <button
                type="button"
                className="btn btn-outline"
                style={{ borderStyle: 'dashed', borderWidth: '2px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '1.25rem' }}
                onClick={() => importFileInputRef.current?.click()}
                disabled={importingFile}
              >
                <span>📂</span> {importFileName || 'Seleccionar Archivo REPORTE.CSV'}
              </button>

              {csvTxs.length > 0 && (
                <div style={{ backgroundColor: 'rgba(47,90,174,0.05)', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Movimientos detectados: {csvTxs.length} ingresos</span>
                    <button
                      type="button"
                      onClick={() => { setCsvTxs([]); setImportFileName(''); if (importFileInputRef.current) importFileInputRef.current.value = ''; }}
                      style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                    >
                      Limpiar
                    </button>
                  </div>

                  <div style={{ maxHeight: '180px', overflowY: 'auto', fontSize: '0.78rem', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: '#fff' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                          <th style={{ padding: '0.4rem 0.6rem', textAlign: 'left', fontWeight: 600, backgroundColor: '#f1f5f9', borderBottom: '1px solid var(--border-color)' }}>Fecha</th>
                          <th style={{ padding: '0.4rem 0.6rem', textAlign: 'left', fontWeight: 600, backgroundColor: '#f1f5f9', borderBottom: '1px solid var(--border-color)' }}>Descripción</th>
                          <th style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontWeight: 600, backgroundColor: '#f1f5f9', borderBottom: '1px solid var(--border-color)' }}>Monto Original</th>
                          {importMoneda === 'VES' && (
                            <>
                              <th style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontWeight: 600, backgroundColor: '#f1f5f9', borderBottom: '1px solid var(--border-color)' }}>Tasa BCV</th>
                              <th style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontWeight: 600, backgroundColor: '#f1f5f9', borderBottom: '1px solid var(--border-color)' }}>Equiv. USD</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {csvTxs.map((tx, idx) => {
                          const rate = importMoneda === 'VES' ? getRateForDateLocal(tx.fecha) : null;
                          const usdVal = importMoneda === 'VES' && rate ? tx.monto / rate : tx.monto;
                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '0.4rem 0.6rem', whiteSpace: 'nowrap' }}>{tx.fecha}</td>
                              <td style={{ padding: '0.4rem 0.6rem', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.descripcion}</td>
                              <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontWeight: 600 }}>
                                {importMoneda === 'VES' ? formatVesCurrency(tx.monto) : formatCurrency(tx.monto)}
                              </td>
                              {importMoneda === 'VES' && (
                                <>
                                  <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontFamily: 'monospace', opacity: rate ? 1 : 0.4 }}>
                                    {rate ? `${rate.toFixed(4)}` : 'Sin Tasa'}
                                  </td>
                                  <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>
                                    {formatCurrency(usdVal)}
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Resumen de totales */}
                  <div style={{ display: 'grid', gridTemplateColumns: importMoneda === 'VES' ? '1fr 1fr' : '1fr', gap: '0.75rem', backgroundColor: '#fff', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                    <div>
                      <span style={{ opacity: 0.6, display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700 }}>Total Original ({importMoneda})</span>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--neutral-dark)' }}>
                        {importMoneda === 'VES' ? formatVesCurrency(sumOriginal) : formatCurrency(sumOriginal)}
                      </strong>
                    </div>
                    {importMoneda === 'VES' && (
                      <div>
                        <span style={{ opacity: 0.6, display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700 }}>Total Equivalente (USD)</span>
                        <strong style={{ fontSize: '1.05rem', color: 'var(--success)' }}>
                          {formatCurrency(sumUsdEquivalent)}
                        </strong>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '0.6rem', fontWeight: 700 }}
                    onClick={handleConfirmImport}
                    disabled={importingFile}
                  >
                    {importingFile ? 'Importando transacciones...' : `Importar ${csvTxs.length} Transacciones`}
                  </button>
                </div>
              )}

              {/* Acciones */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => { setShowImportModal(false); setCsvTxs([]); setImportFileName(''); }} disabled={importingFile}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
