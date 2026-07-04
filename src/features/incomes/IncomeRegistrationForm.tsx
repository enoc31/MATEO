import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { Project, Donante, BankTransaction, TasaBCV } from '../../services/api';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(amount);

const formatVesCurrency = (amount: number) =>
  new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(amount);

const FLAG_MAP: Record<string, string> = {
  'Venezuela': '🇻🇪', 'Reino Unido': '🇬🇧', 'Estados Unidos': '🇺🇸',
  'Europa': '🇪🇺', 'Internacional': '🌐'
};

export const IncomeRegistrationForm: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Data
  const [projects, setProjects] = useState<Project[]>([]);
  const [donantes, setDonantes] = useState<Donante[]>([]);
  const [bankTxs, setBankTxs] = useState<BankTransaction[]>([]);
  const [tasas, setTasas] = useState<TasaBCV[]>([]);
  const [latestRate, setLatestRate] = useState<number | null>(null);

  // Form state
  const [proyectoId, setProyectoId] = useState('');
  const [donanteId, setDonanteId] = useState('');
  const [montoOriginal, setMontoOriginal] = useState('');
  const [moneda, setMoneda] = useState<'USD' | 'VES'>('USD');
  const [medioPago, setMedioPago] = useState<'efectivo' | 'transferencia'>('transferencia');
  const [tasaBcv, setTasaBcv] = useState<number | null>(null);
  const [tasaManualEditable, setTasaManualEditable] = useState(false);
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [transaccionId, setTransaccionId] = useState('');
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);
  const [tipoRegistro, setTipoRegistro] = useState<'manual' | 'bancario'>('manual');

  // Multi-conversion totals calculated dynamically
  const [calculatedTotals, setCalculatedTotals] = useState<{ usd: number; ves: number; avgRate: number | null }>({ usd: 0, ves: 0, avgRate: null });

  const loadData = async () => {
    setLoading(true);
    try {
      const [projList, donList, txList, ratesList] = await Promise.all([
        api.getProjects(),
        api.getDonantes(),
        api.getBankTransactions(),
        api.getTasasBCV()
      ]);
      setProjects(projList.filter(p => p.activo));
      setDonantes(donList);
      setBankTxs(txList.filter(t => t.monto > 0 && t.estado === 'pendiente'));
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

  // Helper local para buscar tasa
  const getRateForDateLocal = (dateStr: string) => {
    if (!tasas || tasas.length === 0) return latestRate;
    const exacta = tasas.find(t => t.fecha === dateStr);
    if (exacta) return exacta.tasa;
    const anteriores = tasas.filter(t => t.fecha < dateStr).sort((a, b) => b.fecha.localeCompare(a.fecha));
    return anteriores[0]?.tasa || latestRate;
  };

  // Buscar tasa BCV al cambiar fecha o moneda (para registro manual)
  useEffect(() => {
    const fetchTasa = async () => {
      if (tipoRegistro === 'manual' && moneda === 'VES' && fecha) {
        try {
          const rateObj = await api.getTasaByDate(fecha);
          if (rateObj) {
            setTasaBcv(rateObj.tasa);
            setTasaManualEditable(false);
          } else {
            setTasaBcv(null);
            setTasaManualEditable(true);
          }
        } catch (err) {
          console.error(err);
          setTasaBcv(null);
          setTasaManualEditable(true);
        }
      }
    };
    fetchTasa();
  }, [fecha, moneda, tipoRegistro]);

  // Recalcular montos e equivalentes cuando cambian las transacciones seleccionadas
  useEffect(() => {
    if (tipoRegistro === 'bancario' && selectedTxIds.length > 0) {
      const selectedTxs = bankTxs.filter(t => selectedTxIds.includes(t.id));
      
      let sumVes = 0;
      let sumUsd = 0;

      if (moneda === 'VES') {
        // Convertir cada movimiento usando la tasa de su propio día
        selectedTxs.forEach(t => {
          const rate = getRateForDateLocal(t.fecha) || 1;
          sumVes += t.monto;
          sumUsd += t.monto / rate;
        });
      } else {
        // Moneda USD
        selectedTxs.forEach(t => {
          const rate = getRateForDateLocal(t.fecha) || 1;
          sumUsd += t.monto;
          sumVes += t.monto * rate;
        });
      }

      const totalOriginalValue = moneda === 'VES' ? sumVes : sumUsd;
      setMontoOriginal(totalOriginalValue.toFixed(2));

      const calculatedAvgRate = sumUsd > 0 ? parseFloat((sumVes / sumUsd).toFixed(4)) : null;
      setTasaBcv(calculatedAvgRate);

      setCalculatedTotals({
        usd: parseFloat(sumUsd.toFixed(2)),
        ves: parseFloat(sumVes.toFixed(2)),
        avgRate: calculatedAvgRate
      });

      // Actualizar descripción
      const combinedDesc = selectedTxs.map(t => {
        const ref = t.referencia ? ` [Ref: ${t.referencia.trim()}]` : '';
        const tRate = getRateForDateLocal(t.fecha);
        const rateInfo = tRate ? ` (Tasa BCV del día: ${tRate.toFixed(4)})` : '';
        return `${t.fecha}${ref}: ${t.descripcion.trim()}${rateInfo}`;
      }).join('\n');
      setDescripcion(combinedDesc);

      // Usar la fecha del movimiento más reciente
      const dates = selectedTxs.map(t => t.fecha).sort();
      setFecha(dates[dates.length - 1]);
    } else if (tipoRegistro === 'bancario') {
      setMontoOriginal('');
      setDescripcion('');
      setTasaBcv(null);
      setCalculatedTotals({ usd: 0, ves: 0, avgRate: null });
    }
  }, [selectedTxIds, moneda, tipoRegistro, bankTxs]);

  const handleToggleTx = (txId: string) => {
    setSelectedTxIds(prev => {
      const next = prev.includes(txId) ? prev.filter(id => id !== txId) : [...prev, txId];
      if (next.length > 0) {
        setTransaccionId(next[0]);
      } else {
        setTransaccionId('');
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedTxIds.length === bankTxs.length) {
      setSelectedTxIds([]);
      setTransaccionId('');
    } else {
      const allIds = bankTxs.map(t => t.id);
      setSelectedTxIds(allIds);
      if (allIds.length > 0) {
        setTransaccionId(allIds[0]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tipoRegistro === 'bancario' && selectedTxIds.length === 0) {
      alert('Debe seleccionar al menos una transacción bancaria.');
      return;
    }
    if (!proyectoId || !donanteId || !montoOriginal || !descripcion) {
      alert('Complete todos los campos obligatorios.');
      return;
    }
    const numMontoOriginal = parseFloat(montoOriginal);
    if (isNaN(numMontoOriginal) || numMontoOriginal <= 0) {
      alert('El monto debe ser mayor a 0.');
      return;
    }

    let calculatedMontoUsd = numMontoOriginal;
    let calculatedMontoVes = null;
    let finalTasaBcv = null;

    if (tipoRegistro === 'bancario') {
      calculatedMontoUsd = calculatedTotals.usd;
      calculatedMontoVes = calculatedTotals.ves;
      finalTasaBcv = calculatedTotals.avgRate;
    } else {
      // Manual
      if (moneda === 'VES') {
        if (!tasaBcv || tasaBcv <= 0) {
          alert('Debe especificar una tasa BCV válida.');
          return;
        }
        finalTasaBcv = tasaBcv;
        calculatedMontoUsd = parseFloat((numMontoOriginal / tasaBcv).toFixed(2));
        calculatedMontoVes = numMontoOriginal;
      } else {
        const activeRate = tasaBcv || latestRate;
        if (activeRate) {
          calculatedMontoVes = parseFloat((numMontoOriginal * activeRate).toFixed(2));
        }
      }
    }

    setSubmitting(true);
    try {
      const donante = donantes.find(d => d.id === donanteId);
      await api.createDonation({
        proyecto_id: proyectoId,
        transaccion_id: transaccionId || null,
        donante: donante?.nombre || 'Donante Desconocido',
        monto: calculatedMontoUsd,
        descripcion: descripcion.trim(),
        fecha,
        moneda,
        medio_pago: medioPago,
        monto_original: numMontoOriginal,
        tasa_bcv: finalTasaBcv,
        monto_usd: calculatedMontoUsd,
        monto_ves: calculatedMontoVes,
        vinculo_transaccion_ids: selectedTxIds.length > 0 ? selectedTxIds : undefined
      });
      
      alert('✅ Ingreso registrado con éxito.');
      window.close(); // Cerrar pestaña al finalizar
    } catch (err: any) {
      alert('Error al registrar el ingreso: ' + (err.message || ''));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f8fafc', color: 'var(--primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💰</div>
          <strong>Cargando formulario de registro...</strong>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '780px', margin: '0 auto' }}>
        
        {/* Cabecera de Página Completa */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ color: 'var(--primary)', fontWeight: 800, margin: 0, fontSize: '1.8rem' }}>
              💰 Registrar Nuevo Ingreso
            </h1>
            <p style={{ margin: '0.25rem 0 0', opacity: 0.6, fontSize: '0.85rem' }}>
              Complete el formulario para registrar un aporte o donación en el sistema.
            </p>
          </div>
          <button 
            type="button" 
            className="btn btn-outline" 
            onClick={() => window.close()}
            style={{ fontWeight: 700 }}
          >
            ❌ Cerrar Ventana
          </button>
        </div>

        {/* Card Principal */}
        <div className="card" style={{ padding: '2.5rem', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', backgroundColor: '#fff', borderRadius: 'var(--radius-lg)' }}>
          
          {/* Selector de Tipo de Registro */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {(['manual', 'bancario'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTipoRegistro(t);
                  setTransaccionId('');
                  setSelectedTxIds([]);
                  setMontoOriginal('');
                  setDescripcion('');
                  setTasaBcv(null);
                  setCalculatedTotals({ usd: 0, ves: 0, avgRate: null });
                }}
                style={{
                  flex: 1, padding: '0.8rem', borderRadius: '8px', fontWeight: 700,
                  fontSize: '0.9rem', border: '2px solid', cursor: 'pointer', transition: 'all 0.2s',
                  borderColor: tipoRegistro === t ? 'var(--primary)' : 'var(--border-color)',
                  backgroundColor: tipoRegistro === t ? 'var(--primary)' : 'transparent',
                  color: tipoRegistro === t ? '#fff' : 'var(--neutral-dark)'
                }}
              >
                {t === 'manual' ? '✏️ Registro de Ingreso Manual' : '🏦 Registro Desde Extracto Bancario'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* VINCULACIÓN MASIVA DESDE EXTRACTO */}
            {tipoRegistro === 'bancario' && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label className="form-label" style={{ fontWeight: 700, margin: 0 }}>Seleccione los movimientos del extracto *</label>
                  {bankTxs.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      style={{
                        border: 'none', background: 'none', color: 'var(--primary)',
                        fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer'
                      }}
                    >
                      {selectedTxIds.length === bankTxs.length ? '☑️ Desmarcar Todos' : '✅ Marcar Todos'}
                    </button>
                  )}
                </div>

                {bankTxs.length === 0 ? (
                  <div style={{ padding: '1rem', borderRadius: '6px', backgroundColor: 'rgba(190,87,75,0.06)', border: '1px solid rgba(190,87,75,0.2)', fontSize: '0.85rem', color: 'var(--danger)' }}>
                    No hay transacciones de ingreso pendientes de conciliar en el extracto bancario.
                  </div>
                ) : (
                  <div style={{
                    maxHeight: '220px', overflowY: 'auto', border: '1px solid var(--border-color)',
                    borderRadius: '6px', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem',
                    backgroundColor: '#f8fafc'
                  }}>
                    {bankTxs.map(tx => {
                      const isChecked = selectedTxIds.includes(tx.id);
                      const isTxVes = tx.csv_metadata?.moneda === 'VES' || 
                        tx.descripcion.toLowerCase().includes('ves') || 
                        tx.descripcion.toLowerCase().includes('bs') || 
                        tx.monto > 1000;
                      return (
                        <label key={tx.id} style={{
                          display: 'flex', alignItems: 'flex-start', gap: '0.6rem', padding: '0.6rem',
                          borderRadius: '6px', backgroundColor: isChecked ? 'rgba(47,90,174,0.06)' : '#fff',
                          cursor: 'pointer', fontSize: '0.8rem', border: '1px solid',
                          borderColor: isChecked ? 'var(--primary)' : '#e2e8f0', transition: 'all 0.15s',
                          userSelect: 'none', boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                        }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleTx(tx.id)}
                            style={{ marginTop: '0.2rem' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                              <span>📅 {tx.fecha} — Ref: {tx.referencia}</span>
                              <span style={{ color: 'var(--success)', fontSize: '0.85rem' }}>
                                {isTxVes ? formatVesCurrency(tx.monto) : formatCurrency(tx.monto)}
                              </span>
                            </div>
                            <div style={{ opacity: 0.7, fontSize: '0.75rem', marginTop: '0.2rem' }}>{tx.descripcion}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
                {selectedTxIds.length > 0 && (
                  <div style={{ fontSize: '0.78rem', opacity: 0.7, marginTop: '0.35rem', textAlign: 'right' }}>
                    Seleccionados: <strong>{selectedTxIds.length}</strong> movimientos bancarios sumados.
                  </div>
                )}
              </div>
            )}

            {/* Fila de Proyecto y Donante */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Proyecto Receptor *</label>
                <select className="form-input" value={proyectoId} onChange={e => setProyectoId(e.target.value)} required disabled={submitting}>
                  <option value="">Selecciona el proyecto...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Donante / Fuente de Fondos *</label>
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
            </div>

            {/* Moneda y Medio de Pago */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Moneda de Registro *</label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {(['USD', 'VES'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMoneda(m)}
                      style={{
                        flex: 1, padding: '0.6rem', borderRadius: '6px', fontWeight: 700,
                        fontSize: '0.85rem', border: '2px solid', cursor: 'pointer', transition: 'all 0.2s',
                        borderColor: moneda === m ? 'var(--primary)' : 'var(--border-color)',
                        backgroundColor: moneda === m ? 'var(--primary)' : 'transparent',
                        color: moneda === m ? '#fff' : 'var(--neutral-dark)'
                      }}
                    >
                      {m === 'USD' ? '💵 Dólares (USD)' : '🇻🇪 Bolívares (VES)'}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Medio de Pago *</label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {(['transferencia', 'efectivo'] as const).map(mp => (
                    <button
                      key={mp}
                      type="button"
                      onClick={() => setMedioPago(mp)}
                      style={{
                        flex: 1, padding: '0.6rem', borderRadius: '6px', fontWeight: 700,
                        fontSize: '0.85rem', border: '2px solid', cursor: 'pointer', transition: 'all 0.2s',
                        borderColor: medioPago === mp ? 'var(--primary)' : 'var(--border-color)',
                        backgroundColor: medioPago === mp ? 'var(--primary)' : 'transparent',
                        color: medioPago === mp ? '#fff' : 'var(--neutral-dark)'
                      }}
                    >
                      {mp === 'transferencia' ? '🏦 Transferencia / Banco' : '💵 Dinero en Efectivo'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Fecha y Monto */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Fecha de Recepción *</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={fecha} 
                  onChange={e => setFecha(e.target.value)} 
                  required 
                  disabled={submitting || tipoRegistro === 'bancario'} 
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Monto del Ingreso ({moneda}) *</label>
                <input
                  type="number" step="0.01" min="0.01"
                  className="form-input"
                  value={montoOriginal}
                  onChange={e => setMontoOriginal(e.target.value)}
                  placeholder="0.00"
                  required
                  disabled={submitting || tipoRegistro === 'bancario'}
                  style={{ backgroundColor: tipoRegistro === 'bancario' ? '#f1f5f9' : '#fff' }}
                />
              </div>
            </div>

            {/* TASA BCV E INFORMACIÓN MULTI-MONEDA */}
            {tipoRegistro === 'bancario' && selectedTxIds.length > 0 && (
              <div style={{ backgroundColor: 'rgba(47,90,174,0.05)', padding: '1.25rem', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '0.75rem', border: '1px solid rgba(47,90,174,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>⚙️ Desglose de Conversión Multi-Moneda</span>
                  {tasaBcv && (
                    <span style={{ fontSize: '0.75rem', opacity: 0.8, fontWeight: 600 }}>
                      Tasa promedio implícita: <strong>{tasaBcv.toFixed(4)} Bs/$</strong>
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', backgroundColor: '#fff', padding: '0.85rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <div>
                    <span style={{ opacity: 0.6, display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700 }}>Total en Bolívares (VES)</span>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--neutral-dark)' }}>
                      {formatVesCurrency(calculatedTotals.ves)}
                    </strong>
                  </div>
                  <div>
                    <span style={{ opacity: 0.6, display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700 }}>Total Equivalente en Dólares (USD)</span>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--success)' }}>
                      {formatCurrency(calculatedTotals.usd)}
                    </strong>
                  </div>
                </div>

                <span style={{ fontSize: '0.72rem', opacity: 0.6, lineHeight: 1.4 }}>
                  💡 Nota: El valor equivalente en USD se calcula convirtiendo cada movimiento bancario individualmente según la tasa oficial del BCV de su fecha correspondiente, garantizando precisión contable total.
                </span>
              </div>
            )}

            {/* Formulario Manual - Tasa BCV si aplica */}
            {tipoRegistro === 'manual' && moneda === 'VES' && (
              <div style={{ backgroundColor: 'rgba(47,90,174,0.05)', padding: '1.25rem', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Tasa de Cambio BCV (Bs./USD) *</span>
                  {!tasaManualEditable && (
                    <button 
                      type="button" 
                      onClick={() => setTasaManualEditable(true)}
                      style={{ border: 'none', background: 'none', color: 'var(--primary)', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
                    >
                      Ajustar Tasa Manualmente
                    </button>
                  )}
                </div>
                {tasaBcv ? (
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <input
                      type="number" step="0.0001"
                      className="form-input"
                      value={tasaBcv}
                      onChange={e => setTasaBcv(parseFloat(e.target.value) || null)}
                      disabled={!tasaManualEditable || submitting}
                      style={{ width: '140px', padding: '0.35rem 0.6rem', fontSize: '0.9rem', backgroundColor: tasaManualEditable ? '#fff' : 'rgba(0,0,0,0.03)' }}
                      required
                    />
                    <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                      {!tasaManualEditable ? '🤖 Tasa oficial cargada desde base de datos.' : '✏️ Tasa modificada manualmente.'}
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <input
                        type="number" step="0.0001"
                        className="form-input"
                        placeholder="Ingrese tasa"
                        onChange={e => setTasaBcv(parseFloat(e.target.value) || null)}
                        disabled={submitting}
                        style={{ width: '140px', padding: '0.35rem 0.6rem', fontSize: '0.9rem' }}
                        required
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--warning)', fontWeight: 600 }}>
                        ⚠️ No se encontró tasa oficial en base de datos.
                      </span>
                    </div>
                    <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>
                      Por favor, ingrese el valor de la tasa BCV manualmente para realizar la conversión.
                    </span>
                  </div>
                )}

                {/* Preview de conversión */}
                {montoOriginal && tasaBcv && tasaBcv > 0 && (
                  <div style={{ borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '0.6rem', marginTop: '0.25rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span>Equivalente en Dólares (USD):</span>
                    <strong style={{ color: 'var(--success)' }}>
                      {formatCurrency(parseFloat(montoOriginal) / tasaBcv)}
                    </strong>
                  </div>
                )}
              </div>
            )}

            {/* Descripción / Referencia */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 700 }}>Descripción y Detalles del Ingreso *</label>
              <textarea
                className="form-input" rows={4}
                placeholder="Ej: Aporte inicial de fondos del donante, detallando transferencias conciliadas o conceptos de la donación..."
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                required
                disabled={submitting}
                style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '0.8rem' }}
              />
            </div>

            {/* Botonera de Acciones */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => window.close()} 
                disabled={submitting}
                style={{ fontWeight: 700 }}
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting} style={{ fontWeight: 700, padding: '0.6rem 1.5rem' }}>
                {submitting ? 'Registrando...' : '✅ Registrar Ingreso'}
              </button>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
};
