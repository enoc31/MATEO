import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { BankTransaction, ExpenseReceipt, TasaBCV, Donation } from '../../services/api';
import Papa from 'papaparse';
import { InternalControlModal } from '../../components/InternalControlModal';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(amount);
};

const formatVesCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(amount);
};

export interface ReconciliationItem {
  id: string;
  tipo: 'gasto' | 'donacion';
  monto: number; // En USD siempre
  monto_original?: number;
  moneda?: 'USD' | 'VES';
  tasa_bcv?: number | null;
  descripcion: string;
  fecha: string;
  transaccion_id: string | null;
  reference_object: ExpenseReceipt | Donation;
}

export const Reconciliation: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [reconciliationItems, setReconciliationItems] = useState<ReconciliationItem[]>([]);
  const [selectedTx, setSelectedTx] = useState<BankTransaction | null>(null);
  const [selectedItem, setSelectedItem] = useState<ReconciliationItem | null>(null);
  
  // Tasas de cambio
  const [tasas, setTasas] = useState<TasaBCV[]>([]);
  const [latestRate, setLatestRate] = useState<number | null>(null);
  const [isCosoModalOpen, setIsCosoModalOpen] = useState(false);

  // Estados para importación CSV
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvDataRows, setCsvDataRows] = useState<any[]>([]);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [mappings, setMappings] = useState({
    fecha: '',
    referencia: '',
    descripcion: '',
    monto: ''
  });

  const getRateForDateLocal = (dateStr: string) => {
    if (!tasas || tasas.length === 0) return latestRate;
    const exacta = tasas.find(t => t.fecha === dateStr);
    if (exacta) return exacta.tasa;
    const anteriores = tasas.filter(t => t.fecha < dateStr).sort((a, b) => b.fecha.localeCompare(a.fecha));
    return anteriores[0]?.tasa || latestRate;
  };

  const formatTxAmount = (tx: BankTransaction) => {
    const isVES = tx.csv_metadata?.moneda === 'VES';
    if (isVES) {
      return formatVesCurrency(tx.monto);
    } else {
      return formatCurrency(tx.monto);
    }
  };

  const getSelectedTxDescription = (tx: BankTransaction) => {
    const isVES = tx.csv_metadata?.moneda === 'VES';
    const originalText = formatTxAmount(tx);
    if (!isVES) return originalText;

    const rate = getRateForDateLocal(tx.fecha);
    if (!rate) return `${originalText} (Sin Tasa)`;

    const usdVal = tx.monto / rate;
    return `${originalText} [Equiv. en USD: ${formatCurrency(usdVal)} (BCV: ${rate.toFixed(4)})]`;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [txList, expList, ratesList, donationList] = await Promise.all([
        api.getBankTransactions(),
        api.getExpenses(),
        api.getTasasBCV(),
        api.getDonations()
      ]);
      // Mostrar solo transacciones pendientes
      setTransactions(txList.filter(t => t.estado === 'pendiente'));
      
      // Mapear gastos pendientes
      const mappedExpenses: ReconciliationItem[] = expList
        .filter(e => !e.transaccion_id && e.estado !== 'rechazado')
        .map(e => ({
          id: e.id,
          tipo: 'gasto',
          monto: e.monto,
          descripcion: `[EGRESO] ${e.descripcion}`,
          fecha: e.fecha_gasto,
          transaccion_id: e.transaccion_id,
          reference_object: e
        }));

      // Mapear donaciones pendientes
      const mappedDonations: ReconciliationItem[] = donationList
        .filter(d => !d.transaccion_id)
        .map(d => ({
          id: d.id,
          tipo: 'donacion',
          monto: d.monto_usd || d.monto,
          monto_original: d.monto_original || d.monto,
          moneda: d.moneda,
          tasa_bcv: d.tasa_bcv,
          descripcion: `[INGRESO] Donación de: ${d.donante} - ${d.descripcion || 'Sin descripción'}`,
          fecha: d.fecha,
          transaccion_id: d.transaccion_id,
          reference_object: d
        }));

      // Unificar y ordenar por fecha (más reciente primero)
      const unified = [...mappedExpenses, ...mappedDonations].sort((a, b) => b.fecha.localeCompare(a.fecha));
      setReconciliationItems(unified);

      setTasas(ratesList);
      const latest = ratesList[0];
      setLatestRate(latest ? latest.tasa : null);
    } catch (err) {
      console.error('Error loading reconciliation data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Manejo de archivo CSV seleccionado
  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length > 0) {
          const firstRow = results.data[0] as object;
          const headers = Object.keys(firstRow);
          setCsvHeaders(headers);
          setCsvDataRows(results.data);
          
          // Mapeo automático inteligente por similitud de nombres
          const findHeader = (keywords: string[]) => {
            return headers.find(h => 
              keywords.some(k => h.toLowerCase().includes(k))
            ) || '';
          };

          setMappings({
            fecha: findHeader(['fech', 'date', 'day']),
            referencia: findHeader(['ref', 'num', 'id', 'comprobante']),
            descripcion: findHeader(['desc', 'concep', 'glosa', 'detalle']),
            monto: findHeader(['mont', 'amou', 'valor', 'ingreso', 'egreso'])
          });

          setShowMappingModal(true);
        } else {
          alert('El archivo CSV está vacío.');
        }
      },
      error: (error) => {
        alert('Error al leer el archivo CSV: ' + error.message);
      }
    });
  };

  // Procesar e importar los datos del CSV mapeado
  const handleImportMappedCsv = async () => {
    if (!mappings.fecha || !mappings.descripcion || !mappings.monto) {
      alert('Por favor, mapea como mínimo la Fecha, Descripción y Monto.');
      return;
    }

    try {
      const parsedTransactions = csvDataRows.map((row, idx) => {
        let montoStr = row[mappings.monto] || '0';
        montoStr = montoStr.replace(/[^0-9.-]+/g, ''); // Remover símbolos de moneda
        const monto = parseFloat(montoStr);

        return {
          fecha: row[mappings.fecha] || new Date().toISOString().split('T')[0],
          referencia: row[mappings.referencia] || `CSV-${idx}-${Date.now().toString().slice(-4)}`,
          descripcion: row[mappings.descripcion] || 'Transacción CSV',
          monto: monto,
          csv_metadata: { rowNumber: idx + 1, fileName: csvFile?.name }
        };
      });

      await api.importBankTransactions(parsedTransactions);
      alert(`Se importaron ${parsedTransactions.length} transacciones bancarias exitosamente.`);
      setShowMappingModal(false);
      setCsvFile(null);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Error al guardar transacciones en la base de datos.');
    }
  };

  // Ejecución de conciliación entre elemento bancario y egreso/donación
  const handleReconcile = async () => {
    if (!selectedTx || !selectedItem) return;

    // Validación de montos aproximados o exactos
    const isVES = selectedTx.csv_metadata?.moneda === 'VES';
    let txMontoUsd = Math.abs(selectedTx.monto);
    
    if (isVES) {
      const rate = getRateForDateLocal(selectedTx.fecha);
      if (rate) {
        txMontoUsd = Math.abs(selectedTx.monto) / rate;
      }
    }

    const diff = Math.abs(txMontoUsd - selectedItem.monto);
    if (diff > 0.01) {
      const formattedTxVal = isVES 
        ? `${formatVesCurrency(Math.abs(selectedTx.monto))} [Equiv: ${formatCurrency(txMontoUsd)}]`
        : formatCurrency(txMontoUsd);

      const confirmDiff = window.confirm(
        `Atención: El monto del extracto bancario (${formattedTxVal}) no coincide exactamente con el monto del comprobante cargado (${formatCurrency(selectedItem.monto)}).\n\n¿Desea forzar la conciliación de todas formas?`
      );
      if (!confirmDiff) return;
    }

    try {
      setLoading(true);
      if (selectedItem.tipo === 'gasto') {
        await api.reconcileExpense(selectedItem.id, selectedTx.id);
      } else {
        await api.reconcileDonation(selectedItem.id, selectedTx.id);
      }
      
      // Limpiar selección
      setSelectedTx(null);
      setSelectedItem(null);
      
      // Recargar datos
      await loadData();
      alert('Conciliación realizada con éxito.');
    } catch (err) {
      console.error(err);
      alert('Ocurrió un error al conciliar.');
      setLoading(false);
    }
  };

  // Generador de un CSV de prueba descargable para facilitar la evaluación
  const handleDownloadDemoCsv = () => {
    const headers = 'Fecha,Referencia Bancaria,Detalle de Transaccion,Monto USD\n';
    const rows = [
      '2026-06-08,REF-92011,PAGO ALIMENTOS POLAR COMEDOR MARACAIBO,-4850.00',
      '2026-06-04,REF-33412,PAGO FARMA-SALUD SUMINISTROS MEDICOS,-12500.00',
      '2026-06-25,REF-09881,DONACION ESPECIAL ALIANZA INTERNACIONAL,5000.00',
      '2026-06-28,REF-22910,PAGO LOGISTICA TRANSPORTE TACHIRA,-850.00'
    ].join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'estado_cuenta_demo.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };



  return (
    <div className="animate-fade-in-up">
      {/* Encabezado y Herramientas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ color: 'var(--primary)', fontSize: '1.75rem', fontWeight: 700 }}>Conciliación Bancaria</h2>
          <p style={{ color: 'var(--neutral-dark)', opacity: 0.8, fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Importa el extracto bancario CSV y vincula las transacciones con los comprobantes de gastos.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={() => setIsCosoModalOpen(true)} className="btn btn-outline" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', borderColor: 'var(--primary)' }}>
            📖 Manual COSO
          </button>
          
          <button onClick={handleDownloadDemoCsv} className="btn btn-outline" style={{ fontSize: '0.85rem' }}>
            📥 Descargar CSV de Prueba
          </button>
          
          <label className="btn btn-primary" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
            📂 Subir Extracto Bancario (CSV)
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleCsvFileChange} 
              style={{ display: 'none' }} 
            />
          </label>
        </div>
      </div>

      {loading && transactions.length === 0 && reconciliationItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Cargando datos de conciliación...</div>
      ) : (
        /* Grid Principal de Conciliación */
        <div className="reconciliation-grid">
          
          {/* Columna Izquierda: Extracto Bancario (Transacciones) */}
          <div className="reconciliation-column">
            <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Extracto Bancario ({transactions.length} pendientes)</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--neutral-dark)' }}>Selecciona una salida (-)</span>
            </div>
            
            <div className="reconciliation-list">
              {transactions.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', color: 'var(--neutral-dark)', opacity: 0.7, padding: '3rem' }}>
                  <p style={{ fontSize: '2.5rem' }}>🏦</p>
                  <p style={{ fontWeight: 600, marginTop: '1rem' }}>No hay transacciones bancarias pendientes</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Sube un archivo CSV de tu banco para iniciar.</p>
                </div>
              ) : (
                transactions.map(tx => (
                  <div 
                    key={tx.id}
                    onClick={() => setSelectedTx(selectedTx?.id === tx.id ? null : tx)}
                    className="card"
                    style={{
                      padding: '1rem',
                      cursor: 'pointer',
                      borderColor: selectedTx?.id === tx.id ? 'var(--primary)' : 'var(--border-color)',
                      borderLeft: `5px solid ${tx.monto < 0 ? 'var(--danger)' : 'var(--success)'}`,
                      backgroundColor: selectedTx?.id === tx.id ? 'rgba(47, 90, 174, 0.03)' : '#ffffff',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--neutral-dark)', opacity: 0.7 }}>
                        {tx.fecha}
                      </span>
                      <span style={{ fontWeight: 700, color: tx.monto < 0 ? 'var(--danger)' : 'var(--success)' }}>
                        {formatTxAmount(tx)}
                      </span>
                    </div>
                    {tx.csv_metadata?.moneda === 'VES' && (() => {
                      const rate = getRateForDateLocal(tx.fecha);
                      const usdVal = rate ? tx.monto / rate : 0;
                      return (
                        <div style={{ fontSize: '0.72rem', opacity: 0.85, textAlign: 'right', marginTop: '0.15rem', color: 'var(--primary)' }}>
                          Equiv: <strong style={{ color: tx.monto < 0 ? 'var(--danger)' : 'var(--success)' }}>{formatCurrency(usdVal)}</strong> <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>(Tasa: {rate ? rate.toFixed(4) : '—'})</span>
                        </div>
                      );
                    })()}
                    <p style={{ fontWeight: 500, fontSize: '0.9rem', marginTop: '0.5rem', wordBreak: 'break-word' }}>
                      {tx.descripcion}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--neutral-dark)', opacity: 0.6 }}>
                      <span>Ref: {tx.referencia || 'N/A'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Columna Derecha: Comprobantes de Campo */}
          <div className="reconciliation-column">
            <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Gastos y Donaciones Cargados ({reconciliationItems.length} sin conciliar)</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--neutral-dark)' }}>Selecciona un registro</span>
            </div>

            <div className="reconciliation-list">
              {reconciliationItems.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', color: 'var(--neutral-dark)', opacity: 0.7, padding: '3rem' }}>
                  <p style={{ fontSize: '2.5rem' }}>📸</p>
                  <p style={{ fontWeight: 600, marginTop: '1rem' }}>No hay gastos o donaciones pendientes por conciliar</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Los registros del sistema aparecerán aquí de forma automática.</p>
                </div>
              ) : (
                reconciliationItems.map(item => (
                  <div 
                    key={`${item.tipo}-${item.id}`}
                    onClick={() => setSelectedItem(selectedItem?.id === item.id && selectedItem?.tipo === item.tipo ? null : item)}
                    className="card"
                    style={{
                      padding: '1rem',
                      cursor: 'pointer',
                      borderColor: selectedItem?.id === item.id && selectedItem?.tipo === item.tipo ? 'var(--primary)' : 'var(--border-color)',
                      borderLeft: `5px solid ${item.tipo === 'gasto' ? 'var(--danger)' : 'var(--success)'}`,
                      backgroundColor: selectedItem?.id === item.id && selectedItem?.tipo === item.tipo ? 'rgba(47, 90, 174, 0.03)' : '#ffffff',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--neutral-dark)', opacity: 0.7 }}>
                        {item.fecha}
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ fontWeight: 700, color: item.tipo === 'gasto' ? 'var(--danger)' : 'var(--success)' }}>
                          {item.tipo === 'gasto' ? '-' : '+'}{item.moneda === 'VES' ? formatVesCurrency(item.monto_original || item.monto) : formatCurrency(item.monto)}
                        </span>
                        {item.moneda === 'VES' && (
                          <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>
                            Equiv: {formatCurrency(item.monto)}
                          </span>
                        )}
                      </div>
                    </div>
                    <p style={{ fontWeight: 500, fontSize: '0.9rem', marginTop: '0.5rem', wordBreak: 'break-word' }}>
                      {item.descripcion}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', fontSize: '0.75rem' }}>
                      <span style={{ color: 'var(--neutral-dark)', opacity: 0.6 }}>
                        {item.tipo === 'gasto' 
                          ? `Solicitante: ${(item.reference_object as ExpenseReceipt).solicitante_nombre || 'N/A'}` 
                          : `Donante: ${(item.reference_object as Donation).donante}`
                        }
                      </span>
                      <span className={`badge ${item.tipo === 'gasto' ? 'badge-warning' : 'badge-success'}`}>
                        {item.tipo === 'gasto' ? '💸 Egreso' : '🤝 Donación'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* Barra Flotante de Conciliación */}
      {(selectedTx || selectedItem) && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#ffffff',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          padding: '1.25rem 2rem',
          borderRadius: 'var(--radius-md)',
          border: '2px solid var(--primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '2.5rem',
          zIndex: 1000,
          width: '90%',
          maxWidth: '900px',
          justifyContent: 'space-between',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', gap: '2rem', flex: 1, flexWrap: 'wrap' }}>
            {/* Resumen Tx */}
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--neutral-dark)', opacity: 0.6 }}>BANCO:</div>
              {selectedTx ? (
                <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  <strong style={{ color: 'var(--primary)' }}>{getSelectedTxDescription(selectedTx)}</strong> - {selectedTx.descripcion.substring(0, 45)}...
                </div>
              ) : (
                <div style={{ fontSize: '0.85rem', color: 'red', marginTop: '0.25rem' }}>Seleccione transacción bancaria</div>
              )}
            </div>
            
            {/* Símbolo de Enlace */}
            <div style={{ display: 'flex', alignItems: 'center', fontSize: '1.5rem' }}>🔗</div>

            {/* Resumen Exp */}
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--neutral-dark)', opacity: 0.6 }}>REGISTRO DEL SISTEMA:</div>
              {selectedItem ? (
                <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  <strong>
                    {selectedItem.moneda === 'VES' 
                      ? formatVesCurrency(selectedItem.monto_original || selectedItem.monto) 
                      : formatCurrency(selectedItem.monto)
                    }
                  </strong> - {selectedItem.descripcion.substring(0, 45)}...
                </div>
              ) : (
                <div style={{ fontSize: '0.85rem', color: 'red', marginTop: '0.25rem' }}>Seleccione comprobante o donación</div>
              )}
            </div>
          </div>

          <div>
            <button 
              disabled={!selectedTx || !selectedItem}
              onClick={handleReconcile}
              className="btn btn-secondary animate-fade-in-up"
              style={{
                opacity: selectedTx && selectedItem ? 1 : 0.5,
                cursor: selectedTx && selectedItem ? 'pointer' : 'not-allowed',
                padding: '0.75rem 1.5rem'
              }}
            >
              Conciliar Movimiento ⚖️
            </button>
          </div>
        </div>
      )}

      {/* Modal de Mapeo Dinámico de Columnas */}
      {showMappingModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: '600px', width: '100%', padding: '2rem', borderRadius: 'var(--radius-md)' }}>
            <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Mapeador Dinámico de Columnas CSV</h3>
            <p style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '1.5rem' }}>
              Hemos detectado la estructura del archivo. Por favor, asocia cada campo requerido con la columna correspondiente en tu archivo CSV:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              {/* Fecha */}
              <div className="form-group">
                <label className="form-label">Fecha de la Transacción *</label>
                <select 
                  className="form-input form-select"
                  value={mappings.fecha}
                  onChange={e => setMappings({ ...mappings, fecha: e.target.value })}
                >
                  <option value="">-- Seleccionar columna --</option>
                  {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              {/* Referencia */}
              <div className="form-group">
                <label className="form-label">Referencia / ID (Opcional)</label>
                <select 
                  className="form-input form-select"
                  value={mappings.referencia}
                  onChange={e => setMappings({ ...mappings, referencia: e.target.value })}
                >
                  <option value="">-- Seleccionar columna --</option>
                  {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              {/* Descripción */}
              <div className="form-group">
                <label className="form-label">Concepto / Descripción *</label>
                <select 
                  className="form-input form-select"
                  value={mappings.descripcion}
                  onChange={e => setMappings({ ...mappings, descripcion: e.target.value })}
                >
                  <option value="">-- Seleccionar columna --</option>
                  {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              {/* Monto */}
              <div className="form-group">
                <label className="form-label">Monto (USD/Monto) *</label>
                <select 
                  className="form-input form-select"
                  value={mappings.monto}
                  onChange={e => setMappings({ ...mappings, monto: e.target.value })}
                >
                  <option value="">-- Seleccionar columna --</option>
                  {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>

            {/* Previsualización rápida */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--neutral-dark)', opacity: 0.6, marginBottom: '0.5rem' }}>
                Previsualización de los primeros registros mapeados:
              </div>
              <div style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--neutral-light)' }}>
                      <th style={{ padding: '4px 8px' }}>Fecha</th>
                      <th style={{ padding: '4px 8px' }}>Descripción</th>
                      <th style={{ padding: '4px 8px' }}>Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvDataRows.slice(0, 3).map((row, idx) => (
                      <tr key={idx} style={{ borderTop: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '4px 8px' }}>{row[mappings.fecha]}</td>
                        <td style={{ padding: '4px 8px' }}>{row[mappings.descripcion]?.substring(0, 25)}...</td>
                        <td style={{ padding: '4px 8px', fontWeight: 700, color: parseFloat(row[mappings.monto]) < 0 ? 'red' : 'green' }}>
                          {row[mappings.monto]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button 
                onClick={() => { setShowMappingModal(false); setCsvFile(null); }}
                className="btn btn-outline"
                style={{ padding: '0.5rem 1rem' }}
              >
                Cancelar
              </button>
              <button 
                onClick={handleImportMappedCsv}
                className="btn btn-primary"
                style={{ padding: '0.5rem 1rem' }}
              >
                Confirmar e Importar
              </button>
            </div>
          </div>
        </div>
      )}

      <InternalControlModal 
        isOpen={isCosoModalOpen} 
        onClose={() => setIsCosoModalOpen(false)} 
      />
    </div>
  );
};
