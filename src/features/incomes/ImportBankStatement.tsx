import React, { useState, useEffect, useRef } from 'react';
import { Download, XCircle, DollarSign, FolderOpen, ClipboardList, Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import type { BankTransaction, TasaBCV } from '../../services/api';
import Papa from 'papaparse';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(amount);

const formatVesCurrency = (amount: number) =>
  new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(amount);

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

export const ImportBankStatement: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [importingFile, setImportingFile] = useState(false);

  const [tasas, setTasas] = useState<TasaBCV[]>([]);
  const [latestRate, setLatestRate] = useState<number | null>(null);

  // Import state
  const [importMoneda, setImportMoneda] = useState<'USD' | 'VES'>('USD');
  const [csvTxs, setCsvTxs] = useState<Omit<BankTransaction, 'id' | 'estado'>[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const ratesList = await api.getTasasBCV();
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

  const getRateForDateLocal = (dateStr: string) => {
    if (!tasas || tasas.length === 0) return latestRate;
    const exacta = tasas.find(t => t.fecha === dateStr);
    if (exacta) return exacta.tasa;
    const anteriores = tasas.filter(t => t.fecha < dateStr).sort((a, b) => b.fecha.localeCompare(a.fecha));
    return anteriores[0]?.tasa || latestRate;
  };

  const handleImportCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    const target = e.target;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'ISO-8859-1',
      complete: (results) => {
        try {
          if (!results || !results.data) {
            alert('El archivo no contiene datos legibles.');
            return;
          }

          const parsedTxs: Omit<BankTransaction, 'id' | 'estado'>[] = [];

          results.data.forEach((row: any) => {
            if (!row) return;
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

            const fKey = fechaKey || keys[0];
            const rKey = refKey || keys[1];
            const dKey = descKey || keys[2];
            const aKey = amountKey || keys[3];

            const rawDate = (fKey && row[fKey] !== undefined && row[fKey] !== null) ? String(row[fKey]) : '';
            const rawRef = (rKey && row[rKey] !== undefined && row[rKey] !== null) ? String(row[rKey]) : '';
            const rawDesc = (dKey && row[dKey] !== undefined && row[dKey] !== null) ? String(row[dKey]) : '';
            const rawAmount = (aKey && row[aKey] !== undefined && row[aKey] !== null) ? String(row[aKey]) : '';

            const dateStr = rawDate.replace(/"/g, '').trim();
            const refStr = rawRef.replace(/"/g, '').trim();
            const descStr = rawDesc.replace(/"/g, '').trim();
            const amountStr = rawAmount.replace(/"/g, '').trim();

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
        } catch (error: any) {
          alert('Error durante el procesamiento del archivo: ' + (error.message || error));
          console.error(error);
        } finally {
          target.value = '';
        }
      },
      error: (err) => {
        target.value = '';
        alert('Error al leer el archivo CSV: ' + err.message);
      }
    });
  };

  const handleConfirmImport = async () => {
    if (csvTxs.length === 0) return;
    setImportingFile(true);
    try {
      await api.importBankTransactions(csvTxs);
      alert(`✅ Se importaron exitosamente ${csvTxs.length} transacciones de ingreso.`);
      window.close();
      setTimeout(() => {
        window.location.href = '/?page=incomes';
      }, 100);
    } catch (err: any) {
      console.error('Error al registrar transacciones:', err);
      alert('Error al registrar las transacciones. Por favor, intente de nuevo o comuníquese con el administrador del sistema.');
    } finally {
      setImportingFile(false);
    }
  };

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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f8fafc', color: 'var(--primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: '1rem', color: 'var(--primary)', display: 'flex', justifyContent: 'center' }}><Download size={40} /></div>
          <strong>Cargando importador bancario...</strong>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '780px', margin: '0 auto' }}>
        
        {/* Cabecera */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ color: 'var(--primary)', fontWeight: 800, margin: 0, fontSize: '1.8rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}><Download size={18} /> Importar Extracto Bancario (CSV)</span>
            </h1>
            <p style={{ margin: '0.25rem 0 0', opacity: 0.6, fontSize: '0.85rem' }}>
              Cargue los depósitos o transferencias del banco para conciliación.
            </p>
          </div>
          <button 
            type="button" 
            className="btn btn-outline" 
            onClick={() => {
              window.close();
              setTimeout(() => {
                window.location.href = '/?page=incomes';
              }, 100);
            }}
            style={{ fontWeight: 700 }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><XCircle size={18} /> Cerrar Ventana</span>
          </button>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '2.5rem', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', backgroundColor: '#fff', borderRadius: 'var(--radius-lg)' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Moneda */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 700 }}>Seleccione la moneda del Extracto Bancario *</label>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
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
                      flex: 1, padding: '0.8rem', borderRadius: '8px', fontWeight: 700,
                      fontSize: '0.9rem', border: '2px solid', cursor: 'pointer', transition: 'all 0.2s',
                      borderColor: importMoneda === m ? 'var(--primary)' : 'var(--border-color)',
                      backgroundColor: importMoneda === m ? 'var(--primary)' : 'transparent',
                      color: importMoneda === m ? '#fff' : 'var(--neutral-dark)'
                    }}
                  >
                    {m === 'USD' ? <span style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}><DollarSign size={16}/> Dólares (USD)</span> : '🇻🇪 Bolívares (VES)'}
                  </button>
                ))}
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', opacity: 0.7, lineHeight: 1.5, margin: '0.5rem 0' }}>
              Seleccione el archivo <strong>CSV</strong> del banco. Solo se considerarán los depósitos o transferencias recibidos (importes positivos mayores a 0).
            </p>

            {/* Input archivo oculto */}
            <input
              type="file"
              accept=".csv"
              ref={importFileInputRef}
              onChange={handleImportCsvChange}
              style={{ display: 'none' }}
            />

            {/* Botón de carga visible */}
            <button
              type="button"
              className="btn btn-outline"
              style={{
                borderStyle: 'dashed', borderWidth: '2px', display: 'flex', 
                flexDirection: 'column', justifyContent: 'center', alignItems: 'center', 
                gap: '0.75rem', padding: '2.5rem', backgroundColor: '#f8fafc',
                borderRadius: '8px', transition: 'all 0.2s', cursor: 'pointer'
              }}
              onClick={() => importFileInputRef.current?.click()}
              disabled={importingFile}
            >
              <div style={{ display: 'flex', justifyContent: 'center' }}><FolderOpen size={40} color="var(--primary)" /></div>
              <strong style={{ fontSize: '0.95rem', color: 'var(--primary)' }}>
                {importFileName || 'Haga clic aquí para seleccionar el archivo CSV'}
              </strong>
              <span style={{ fontSize: '0.78rem', opacity: 0.6 }}>
                Formatos soportados: CSV delimitado por comas (,) o punto y coma (;)
              </span>
            </button>

            {/* Vista previa de transacciones */}
            {csvTxs.length > 0 && (
              <div style={{ backgroundColor: 'rgba(47,90,174,0.05)', padding: '1.25rem', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid rgba(47,90,174,0.1)' }}>
                
                <div style={{ fontSize: '0.88rem', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ClipboardList size={18} /> Movimientos de Ingreso Detectados ({csvTxs.length})</span>
                  <button
                    type="button"
                    onClick={() => { setCsvTxs([]); setImportFileName(''); if (importFileInputRef.current) importFileInputRef.current.value = ''; }}
                    style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Trash2 size={16} /> Limpiar Archivo</span>
                  </button>
                </div>

                <div style={{ maxHeight: '240px', overflowY: 'auto', fontSize: '0.8rem', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: '#fff' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                        <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', fontWeight: 700, backgroundColor: '#f1f5f9', borderBottom: '1px solid var(--border-color)' }}>Fecha</th>
                        <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', fontWeight: 700, backgroundColor: '#f1f5f9', borderBottom: '1px solid var(--border-color)' }}>Descripción</th>
                        <th style={{ padding: '0.6rem 0.8rem', textAlign: 'right', fontWeight: 700, backgroundColor: '#f1f5f9', borderBottom: '1px solid var(--border-color)' }}>Monto Original</th>
                        {importMoneda === 'VES' && (
                          <>
                            <th style={{ padding: '0.6rem 0.8rem', textAlign: 'right', fontWeight: 700, backgroundColor: '#f1f5f9', borderBottom: '1px solid var(--border-color)' }}>Tasa BCV</th>
                            <th style={{ padding: '0.6rem 0.8rem', textAlign: 'right', fontWeight: 700, backgroundColor: '#f1f5f9', borderBottom: '1px solid var(--border-color)' }}>Equiv. USD</th>
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
                            <td style={{ padding: '0.5rem 0.8rem', whiteSpace: 'nowrap' }}>{tx.fecha}</td>
                            <td style={{ padding: '0.5rem 0.8rem' }}>{tx.descripcion}</td>
                            <td style={{ padding: '0.5rem 0.8rem', textAlign: 'right', fontWeight: 700 }}>
                              {importMoneda === 'VES' ? formatVesCurrency(tx.monto) : formatCurrency(tx.monto)}
                            </td>
                            {importMoneda === 'VES' && (
                              <>
                                <td style={{ padding: '0.5rem 0.8rem', textAlign: 'right', fontFamily: 'monospace', opacity: rate ? 1 : 0.4 }}>
                                  {rate ? `${rate.toFixed(4)}` : 'Sin Tasa'}
                                </td>
                                <td style={{ padding: '0.5rem 0.8rem', textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: importMoneda === 'VES' ? '1fr 1fr' : '1fr', gap: '1rem', backgroundColor: '#fff', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <div>
                    <span style={{ opacity: 0.6, display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700 }}>Total Depósitos Detectados ({importMoneda})</span>
                    <strong style={{ fontSize: '1.2rem', color: 'var(--neutral-dark)' }}>
                      {importMoneda === 'VES' ? formatVesCurrency(sumOriginal) : formatCurrency(sumOriginal)}
                    </strong>
                  </div>
                  {importMoneda === 'VES' && (
                    <div>
                      <span style={{ opacity: 0.6, display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700 }}>Total Equivalente (USD)</span>
                      <strong style={{ fontSize: '1.2rem', color: 'var(--success)' }}>
                        {formatCurrency(sumUsdEquivalent)}
                      </strong>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.8rem', fontWeight: 700, fontSize: '0.95rem' }}
                  onClick={handleConfirmImport}
                  disabled={importingFile}
                >
                  {importingFile ? 'Procesando importación...' : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}><Download size={18} /> Confirmar e Importar {csvTxs.length} Transacciones</span>}
                </button>
              </div>
            )}

            {/* Cancelar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => {
               window.close();
               setTimeout(() => {
                 window.location.href = '/?page=incomes';
               }, 100);
             }} 
                disabled={importingFile}
                style={{ fontWeight: 700 }}
              >
                Cancelar
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
