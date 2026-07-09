import React, { useState, useEffect, useRef } from 'react';

import { api } from '../../services/api';
import type { TasaBCV } from '../../services/api';
import { formatDateForFrontEnd, getCaracasDateParts } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import Papa from 'papaparse';

export const TasasManager: React.FC = () => {
  const { profile } = useAuth();
  const [tasas, setTasas] = useState<TasaBCV[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [syncingHistory, setSyncingHistory] = useState(false);

  // Formulario manual
  const [fechaManual, setFechaManual] = useState(new Date().toISOString().split('T')[0]);
  const [tasaManual, setTasaManual] = useState('');

  // Edición en tabla
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTasa, setEditingTasa] = useState('');

  // CSV
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvPreview, setCsvPreview] = useState<{ fecha: string; tasa: number }[]>([]);
  const [csvFileName, setCsvFileName] = useState('');

  // Cargar datos
  const loadTasas = async () => {
    setLoading(true);
    try {
      const list = await api.getTasasBCV();
      setTasas(list);
    } catch (err) {
      console.error('Error al cargar tasas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasas();
  }, []);

  // Sincronizar histórico desde API
  const handleSyncHistory = async () => {
    setSyncingHistory(true);
    try {
      // DolarVZLA public CDN returns history per year or month
      // Fetching current year to get recent history
      const res = await fetch('https://rates.dolarvzla.com/bcv/2026/list.json');
      if (!res.ok) throw new Error('No se pudo conectar al API de histórico');
      const data = await res.json();

      const parsed: {
        fecha: string;
        tasa: number;
        fuente: 'bcv_api' | 'manual' | 'historico_csv';
      }[] = [];

      if (Array.isArray(data)) {
        data.forEach((item: any) => {
          if (item && item.date && item.usd) {
            parsed.push({
              fecha: item.date,
              tasa: item.usd,
              fuente: 'bcv_api',
            });
          }
        });
      } else if (data && typeof data === 'object') {
        Object.values(data).forEach((item: any) => {
          if (item && item.date && item.usd) {
            parsed.push({
              fecha: item.date,
              tasa: item.usd,
              fuente: 'bcv_api',
            });
          }
        });
      }

      if (parsed.length > 0) {
        // Solo insertamos los últimos 35 días para no sobrecargar
        const recentRates = parsed.sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 35);

        await api.bulkUpsertTasasBCV(recentRates);
        alert(`✅ Se sincronizaron ${recentRates.length} tasas históricas correctamente.`);
        await loadTasas();
      } else {
        alert('No se encontraron registros históricos en la API.');
      }
    } catch (err: any) {
      alert('Error obteniendo el histórico: ' + (err.message || ''));
    } finally {
      setSyncingHistory(false);
    }
  };

  // Calcular la fecha destino esperada hoy (próximo día hábil o el mismo día si es temprano)
  const getExpectedFechaTasaHoy = () => {
    const { year, month, day, hour } = getCaracasDateParts();

    // Asignar los componentes a un objeto Date interpretado como UTC para calcular el getUTCDay
    const ahoraVE = new Date(Date.UTC(year, month - 1, day, hour));
    const diaSemana = ahoraVE.getUTCDay(); // 0=Dom, 1=Lun, ..., 6=Sáb
    const hora = ahoraVE.getUTCHours();

    let diasASumar: number;
    // Si son más de las 3:00 PM (15:00), asumimos que el BCV ya publicó la tasa para el próximo día hábil.
    if (hora >= 15) {
      if (diaSemana === 5)
        diasASumar = 3; // Viernes -> Lunes
      else if (diaSemana === 6)
        diasASumar = 2; // Sábado -> Lunes
      else diasASumar = 1; // Lunes-Jueves -> Día siguiente
    } else {
      // Si es antes de las 3:00 PM, asumimos que el usuario está registrando la tasa rezagada para el día de HOY.
      if (diaSemana === 0)
        diasASumar = 1; // Domingo -> Lunes
      else if (diaSemana === 6)
        diasASumar = 2; // Sábado -> Lunes
      else diasASumar = 0; // Hoy
    }

    const fechaDest = new Date(ahoraVE);
    fechaDest.setUTCDate(ahoraVE.getUTCDate() + diasASumar);

    const yyyy = fechaDest.getUTCFullYear();
    const mm = String(fechaDest.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(fechaDest.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const expectedFechaTasa = getExpectedFechaTasaHoy();
  const tasaHoyRegistrada = tasas.find((t) => t.fecha === expectedFechaTasa);

  // Registrar tasa manual
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fechaManual || !tasaManual) {
      alert('Complete la fecha y el valor de la tasa.');
      return;
    }
    const numTasa = parseFloat(tasaManual);
    if (isNaN(numTasa) || numTasa <= 0) {
      alert('La tasa debe ser un número positivo.');
      return;
    }

    setSubmitting(true);
    try {
      await api.upsertTasaBCV({
        fecha: fechaManual,
        tasa: numTasa,
        fuente: 'manual',
      });
      alert('✅ Tasa registrada correctamente.');
      setTasaManual('');
      await loadTasas();
    } catch (err: any) {
      alert('Error al guardar la tasa: ' + (err.message || ''));
    } finally {
      setSubmitting(false);
    }
  };

  // Procesar archivo CSV
  const handleCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed: { fecha: string; tasa: number }[] = [];

        results.data.forEach((row: any) => {
          // Detectar columnas (fecha/date y tasa/rate/value)
          const keys = Object.keys(row);
          const fechaKey = keys.find(
            (k) => k.toLowerCase().includes('fecha') || k.toLowerCase().includes('date'),
          );
          const tasaKey = keys.find(
            (k) =>
              k.toLowerCase().includes('tasa') ||
              k.toLowerCase().includes('rate') ||
              k.toLowerCase().includes('valor') ||
              k.toLowerCase().includes('value'),
          );

          if (fechaKey && tasaKey) {
            const fechaStr = row[fechaKey]?.trim();
            const tasaVal = parseFloat(row[tasaKey]);

            // Validar formato YYYY-MM-DD
            if (
              fechaStr &&
              /^\d{4}-\d{2}-\d{2}$/.test(fechaStr) &&
              !isNaN(tasaVal) &&
              tasaVal > 0
            ) {
              parsed.push({ fecha: fechaStr, tasa: tasaVal });
            }
          }
        });

        if (parsed.length === 0) {
          alert(
            'No se encontraron registros válidos. Asegúrese de que el CSV tenga cabeceras como "fecha" y "tasa" y el formato de fecha sea YYYY-MM-DD.',
          );
          setCsvPreview([]);
          setCsvFileName('');
        } else {
          setCsvPreview(parsed.slice(0, 50)); // Vista previa de máx 50 registros
        }
      },
      error: (err) => {
        alert('Error al procesar el archivo CSV: ' + err.message);
      },
    });
  };

  // Importar lote de CSV
  const handleConfirmCsvImport = async () => {
    if (csvPreview.length === 0) return;
    setSubmitting(true);
    try {
      await api.bulkUpsertTasasBCV(csvPreview);
      alert(`✅ Se cargaron/actualizaron ${csvPreview.length} tasas de cambio.`);
      setCsvPreview([]);
      setCsvFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadTasas();
    } catch (err: any) {
      alert('Error al importar el lote: ' + (err.message || ''));
    } finally {
      setSubmitting(false);
    }
  };

  // Guardar edición rápida
  const handleSaveEdit = async (tasaObj: TasaBCV) => {
    const numTasa = parseFloat(editingTasa);
    if (isNaN(numTasa) || numTasa <= 0) {
      alert('Monto de tasa inválido.');
      return;
    }
    try {
      await api.upsertTasaBCV({
        fecha: tasaObj.fecha,
        tasa: numTasa,
        fuente: tasaObj.fuente === 'bcv_api' ? 'bcv_api' : 'manual',
      });
      setEditingId(null);
      await loadTasas();
    } catch (err: any) {
      alert('Error al actualizar: ' + (err.message || ''));
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--primary)' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>💱</div>
        <strong>Cargando tasas de cambio...</strong>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      {/* HEADER */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--primary)', fontWeight: 800, margin: 0, fontSize: '1.6rem' }}>
          💱 Administración de Tasas BCV
        </h2>
        <p style={{ margin: '0.25rem 0 0', opacity: 0.6, fontSize: '0.85rem' }}>
          Historial y carga del tipo de cambio oficial del Banco Central de Venezuela para la
          conversión de VES a USD.
        </p>
      </div>

      {/* ESTADO DE LA TASA Y RESUMEN */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        {/* Card Estado de Hoy */}
        <div
          className="card"
          style={{
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            borderRadius: 'var(--radius-md)',
            borderLeft: '5px solid ' + (tasaHoyRegistrada ? 'var(--success)' : 'var(--warning)'),
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}
            >
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  opacity: 0.6,
                }}
              >
                Tasa del Próximo Día Hábil
              </span>
              <span className={`badge ${tasaHoyRegistrada ? 'badge-success' : 'badge-warning'}`}>
                {tasaHoyRegistrada ? '✅ Registrada' : '⏳ Pendiente'}
              </span>
            </div>
            {tasaHoyRegistrada ? (
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>
                  {tasaHoyRegistrada.tasa.toFixed(4)}{' '}
                  <span style={{ fontSize: '1rem', fontWeight: 500 }}>Bs/$</span>
                </div>
                <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.5rem' }}>
                  Aplica para la fecha:{' '}
                  <strong>{formatDateForFrontEnd(tasaHoyRegistrada.fecha)}</strong>
                </div>
                <div style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '0.2rem' }}>
                  Origen:{' '}
                  {tasaHoyRegistrada.fuente === 'bcv_api'
                    ? 'Sincronización Automática API'
                    : 'Registro Manual'}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--neutral-dark)' }}>
                  Aún sin tasa para la fecha: {expectedFechaTasa}
                </div>
                <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '0.5rem' }}>
                  La rutina del servidor ejecuta la sincronización diaria de lunes a viernes a las
                  5:05 PM (Hora VE). Puede ingresarla manualmente a la derecha si la necesita de
                  inmediato.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Card Último Registro */}
        <div className="card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.75rem',
            }}
          >
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                opacity: 0.6,
                display: 'block',
              }}
            >
              Últimas Tasas Registradas
            </span>
            <button
              onClick={handleSyncHistory}
              disabled={syncingHistory}
              className="btn btn-outline"
              style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem' }}
              title="Obtener últimos 30 días desde DolarVZLA"
            >
              {syncingHistory ? '⏳ Obteniendo...' : '🔄 Extraer Histórico API'}
            </button>
          </div>
          {tasas.length === 0 ? (
            <div style={{ opacity: 0.5, fontSize: '0.85rem', padding: '1rem 0' }}>
              No hay tasas registradas.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {tasas.slice(0, 4).map((t, idx) => (
                <div
                  key={t.id || idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.85rem',
                    paddingBottom: '0.4rem',
                    borderBottom: idx < 3 ? '1px solid var(--border-color)' : 'none',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{formatDateForFrontEnd(t.fecha)}</span>
                  <span
                    style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}
                  >
                    {t.tasa.toFixed(4)} Bs.
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CARGA HISTÓRICA Y REGISTRO MANUAL */}
      {['administrador', 'director'].includes(profile?.rol || '') && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem',
          }}
        >
          {/* Registro Manual */}
          <div className="card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
            <h3
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--primary)',
                marginBottom: '1rem',
              }}
            >
              ✏️ Registro Individual de Tasa
            </h3>
            <form
              onSubmit={handleManualSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Fecha de Aplicación *
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={fechaManual}
                  onChange={(e) => setFechaManual(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Tasa de Cambio (Bs./USD) *
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  className="form-input"
                  placeholder="Ej: 652.9726"
                  value={tasaManual}
                  onChange={(e) => setTasaManual(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.5rem' }}
                disabled={submitting}
              >
                {submitting ? 'Guardando...' : 'Guardar Tasa'}
              </button>
            </form>
          </div>

          {/* Carga Histórica CSV */}
          <div className="card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
            <h3
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--primary)',
                marginBottom: '1rem',
              }}
            >
              📁 Carga Masiva Histórica (CSV)
            </h3>
            <p style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '1rem' }}>
              Suba un archivo CSV con las columnas <strong>fecha</strong> (formato AAAA-MM-DD) y{' '}
              <strong>tasa</strong> (tipo numérico).
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleCsvChange}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="btn btn-outline"
                style={{
                  borderStyle: 'dashed',
                  borderWidth: '2px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '1rem',
                }}
                onClick={() => fileInputRef.current?.click()}
                disabled={submitting}
              >
                <span>📂</span> {csvFileName || 'Seleccionar Archivo CSV'}
              </button>

              {csvPreview.length > 0 && (
                <div
                  style={{
                    backgroundColor: 'rgba(47,90,174,0.05)',
                    padding: '1rem',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <span>Registros cargados: {csvPreview.length}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setCsvPreview([]);
                        setCsvFileName('');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--danger)',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}
                    >
                      Limpiar
                    </button>
                  </div>
                  <div
                    style={{
                      maxHeight: '100px',
                      overflowY: 'auto',
                      fontSize: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      backgroundColor: '#fff',
                      padding: '0.25rem',
                    }}
                  >
                    {csvPreview.slice(0, 10).map((p, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '0.2rem 0.5rem',
                          borderBottom: idx < 9 ? '1px solid var(--border-color)' : 'none',
                        }}
                      >
                        <span>{formatDateForFrontEnd(p.fecha)}</span>
                        <span style={{ fontWeight: 600 }}>{p.tasa.toFixed(4)} Bs.</span>
                      </div>
                    ))}
                    {csvPreview.length > 10 && (
                      <div style={{ textAlign: 'center', opacity: 0.5, padding: '0.2rem' }}>
                        ... y {csvPreview.length - 10} registros más
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '0.75rem', padding: '0.5rem' }}
                    onClick={handleConfirmCsvImport}
                    disabled={submitting}
                  >
                    {submitting ? 'Importando...' : 'Confirmar Importación Masiva'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TABLA COMPLETA */}
      <div className="card" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontWeight: 700 }}>Historial de Tasas</span>
          <span style={{ opacity: 0.5, fontSize: '0.8rem' }}>
            Total de registros: {tasas.length}
          </span>
        </div>

        {tasas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', opacity: 0.5 }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
            <p style={{ fontWeight: 600 }}>No hay tasas registradas aún.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.87rem' }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: 'rgba(47,90,174,0.05)',
                    borderBottom: '2px solid var(--border-color)',
                  }}
                >
                  <th
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontWeight: 700,
                      opacity: 0.7,
                    }}
                  >
                    Fecha de Aplicación
                  </th>
                  <th
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontWeight: 700,
                      opacity: 0.7,
                    }}
                  >
                    Tasa de Cambio (Bs./USD)
                  </th>
                  <th
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontWeight: 700,
                      opacity: 0.7,
                    }}
                  >
                    Fuente
                  </th>
                  <th
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontWeight: 700,
                      opacity: 0.7,
                    }}
                  >
                    Fecha Registro
                  </th>
                  {['administrador', 'director'].includes(profile?.rol || '') && (
                    <th
                      style={{
                        padding: '0.75rem 1rem',
                        textAlign: 'center',
                        fontWeight: 700,
                        opacity: 0.7,
                      }}
                    >
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {tasas.map((t) => {
                  const isEditing = editingId === t.id;

                  return (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>
                        {formatDateForFrontEnd(t.fecha)}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.0001"
                            className="form-input"
                            style={{
                              padding: '0.2rem 0.5rem',
                              width: '120px',
                              fontSize: '0.85rem',
                            }}
                            value={editingTasa}
                            onChange={(e) => setEditingTasa(e.target.value)}
                          />
                        ) : (
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              color: 'var(--primary)',
                            }}
                          >
                            {t.tasa.toFixed(4)} Bs.
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          className={`badge ${t.fuente === 'bcv_api' ? 'badge-success' : t.fuente === 'manual' ? 'badge-info' : 'badge-warning'}`}
                          style={{ textTransform: 'uppercase', fontSize: '0.65rem' }}
                        >
                          {t.fuente === 'bcv_api'
                            ? '🤖 API'
                            : t.fuente === 'manual'
                              ? '✏️ Manual'
                              : '📁 CSV'}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', opacity: 0.6 }}>
                        {new Date(t.created_at).toLocaleString()}
                      </td>
                      {['administrador', 'director'].includes(profile?.rol || '') && (
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          {isEditing ? (
                            <div
                              style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}
                            >
                              <button
                                onClick={() => handleSaveEdit(t)}
                                className="btn btn-outline"
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  fontSize: '0.75rem',
                                  borderColor: 'var(--success)',
                                  color: 'var(--success)',
                                }}
                              >
                                Guardar
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="btn btn-outline"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingId(t.id);
                                setEditingTasa(t.tasa.toString());
                              }}
                              className="btn btn-outline"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            >
                              Editar
                            </button>
                          )}
                        </td>
                      )}
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
