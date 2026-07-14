import React, { useEffect, useState } from 'react';
import { api, isSimulationMode } from '../../services/api';
import type { Beneficiary, Jornada } from '../../services/api';
import { Search, Calendar, Filter, CalendarDays, Download, Activity, History } from 'lucide-react';
import { useNotifications } from '../../components/NotificationProvider';
import { generateBeneficiariesReport } from '../../utils/pdfReport';
import { supabase } from '../../supabaseClient';

export const CapturedRecords: React.FC = () => {
  const [records, setRecords] = useState<Beneficiary[]>([]);
  const [jornadas, setJornadas] = useState<Jornada[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'hoy' | 'ayer' | 'semana' | 'todos'>('todos');
  const [jornadaFilter, setJornadaFilter] = useState<string>('todas');
  const [subTab, setSubTab] = useState<'live' | 'history'>('live');
  const { addNotification } = useNotifications();

  const loadRecords = async () => {
    setLoading(true);
    try {
      const [bData, jData] = await Promise.all([api.getBeneficiaries(), api.getJornadas()]);
      setRecords(bData);
      setJornadas(jData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();

    if (isSimulationMode) return;

    // Supabase Realtime channel subscription for new beneficiaries
    const channel = supabase
      .channel('beneficiarios-live-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'beneficiarios',
        },
        (payload) => {
          const newBen = payload.new as Beneficiary;
          setRecords((prev) => {
            if (prev.some((r) => r.id === newBen.id)) return prev;
            return [newBen, ...prev];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const isToday = (dateString: string) => {
    const d = new Date(dateString);
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  const isYesterday = (dateString: string) => {
    const d = new Date(dateString);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return (
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear()
    );
  };

  const isThisWeek = (dateString: string) => {
    const d = new Date(dateString);
    const today = new Date();
    const firstDay = new Date(today.setDate(today.getDate() - today.getDay()));
    const lastDay = new Date(today.setDate(today.getDate() - today.getDay() + 6));
    return d >= firstDay && d <= lastDay;
  };

  const filteredRecords = records.filter((r) => {
    // 1. Búsqueda por Cédula o Nombre (Funcionalidad para Escritorio/General)
    const term = searchTerm.toLowerCase();
    const matchSearch =
      r.cedula.toLowerCase().includes(term) ||
      r.nombre.toLowerCase().includes(term) ||
      r.apellido.toLowerCase().includes(term);

    // 2. Filtro de Fecha
    let matchDate = true;
    if (r.created_at) {
      if (dateFilter === 'hoy') matchDate = isToday(r.created_at);
      if (dateFilter === 'ayer') matchDate = isYesterday(r.created_at);
      if (dateFilter === 'semana') matchDate = isThisWeek(r.created_at);
    }

    // 3. Filtro de Jornada
    let matchJornada = true;
    if (jornadaFilter !== 'todas') {
      matchJornada = r.jornada_id === jornadaFilter;
    }

    return matchSearch && matchDate && matchJornada;
  });

  const getJornadaName = (id: string) => {
    return jornadas.find((j) => j.id === id)?.nombre || 'Jornada Desconocida';
  };

  const getGroupTitle = (dateString?: string) => {
    if (!dateString) return 'Registros';
    if (isToday(dateString)) return 'HOY';
    if (isYesterday(dateString)) return 'AYER';
    if (isThisWeek(dateString)) return 'ESTA SEMANA';
    return new Date(dateString).toLocaleDateString('es-VE');
  };

  const handleExportPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      await generateBeneficiariesReport({
        records: filteredRecords,
        jornadas,
        title:
          jornadaFilter !== 'todas'
            ? `Reporte de Beneficiarios: ${jornadas.find((j) => j.id === jornadaFilter)?.nombre}`
            : 'Reporte General de Beneficiarios',
      });
      addNotification('Reporte PDF generado correctamente', 'success');
    } catch (e) {
      console.error(e);
      addNotification('Error al generar el reporte PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Agrupamos visualmente

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Sub-tabs para Monitoreo Live / Historial */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '0.5rem',
          marginBottom: '0.5rem',
        }}
      >
        <button
          onClick={() => setSubTab('live')}
          style={{
            padding: '0.5rem 1rem',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            cursor: 'pointer',
            borderBottom: subTab === 'live' ? '3px solid var(--primary)' : '3px solid transparent',
            color: subTab === 'live' ? 'var(--primary)' : 'var(--neutral-gray)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.95rem',
          }}
        >
          <Activity size={16} /> Monitoreo En Vivo (Jornadas Activas)
        </button>
        <button
          onClick={() => setSubTab('history')}
          style={{
            padding: '0.5rem 1rem',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            cursor: 'pointer',
            borderBottom:
              subTab === 'history' ? '3px solid var(--primary)' : '3px solid transparent',
            color: subTab === 'history' ? 'var(--primary)' : 'var(--neutral-gray)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.95rem',
          }}
        >
          <History size={16} /> Historial y Búsqueda General
        </button>
      </div>

      {subTab === 'live' ? (
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.6 }}>
              Cargando monitoreo en vivo...
            </div>
          ) : (
            <div>
              {jornadas.filter((j) => j.activa).length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '3rem',
                    backgroundColor: '#fff',
                    borderRadius: 'var(--radius-md)',
                    border: '1px dashed var(--border-color)',
                  }}
                >
                  <Activity size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.2 }} />
                  <p style={{ fontWeight: 600, color: 'var(--neutral-dark)', opacity: 0.7 }}>
                    No hay jornadas activas bajo monitoreo en este momento.
                  </p>
                </div>
              ) : (
                jornadas
                  .filter((j) => j.activa)
                  .map((jornada) => {
                    const journeyRecords = records.filter((r) => r.jornada_id === jornada.id);
                    return (
                      <div
                        key={jornada.id}
                        className="card animate-fade-in-up"
                        style={{
                          padding: '1.5rem',
                          marginBottom: '1.5rem',
                          backgroundColor: '#fff',
                          borderRadius: 'var(--radius-lg)',
                          border: '1px solid var(--border-color)',
                          boxShadow: 'var(--shadow-sm)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: '2px solid var(--neutral-light)',
                            paddingBottom: '0.75rem',
                            marginBottom: '1rem',
                          }}
                        >
                          <div>
                            <h3
                              style={{
                                margin: 0,
                                color: 'var(--primary)',
                                fontSize: '1.2rem',
                                fontWeight: 700,
                              }}
                            >
                              {jornada.nombre}
                            </h3>
                            <span style={{ fontSize: '0.85rem', color: 'var(--neutral-gray)' }}>
                              Fecha: {new Date(jornada.fecha).toLocaleDateString('es-VE')}
                            </span>
                          </div>
                          <span
                            style={{
                              backgroundColor: '#e8f5e9',
                              color: '#2e7d32',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '1rem',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}
                          >
                            <span
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: '#2e7d32',
                                display: 'inline-block',
                              }}
                            />
                            En Vivo ({journeyRecords.length} entregas)
                          </span>
                        </div>

                        {journeyRecords.length === 0 ? (
                          <p
                            style={{
                              fontStyle: 'italic',
                              color: 'var(--neutral-gray)',
                              padding: '0.5rem 0',
                            }}
                          >
                            Aún no se han registrado entregas de beneficios en esta jornada.
                          </p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {journeyRecords.map((record) => (
                              <div
                                key={record.id}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '0.75rem 1rem',
                                  backgroundColor: 'var(--neutral-light)',
                                  borderRadius: 'var(--radius-md)',
                                  border: '1px solid rgba(0,0,0,0.03)',
                                }}
                              >
                                <div>
                                  <div style={{ fontWeight: 600, color: 'var(--neutral-dark)' }}>
                                    {record.nombre} {record.apellido}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: '0.8rem',
                                      color: 'var(--neutral-gray)',
                                      marginTop: '0.1rem',
                                    }}
                                  >
                                    Cédula: {record.cedula} | Nacimiento:{' '}
                                    {new Date(record.fecha_nacimiento).toLocaleDateString('es-VE')}
                                  </div>
                                  {record.tipo_donacion && record.tipo_donacion.length > 0 && (
                                    <div
                                      style={{
                                        display: 'flex',
                                        gap: '0.3rem',
                                        marginTop: '0.4rem',
                                        flexWrap: 'wrap',
                                      }}
                                    >
                                      {record.tipo_donacion.map((t, idx) => (
                                        <span
                                          key={idx}
                                          style={{
                                            fontSize: '0.75rem',
                                            backgroundColor: '#e3f2fd',
                                            color: '#1565c0',
                                            padding: '0.1rem 0.4rem',
                                            borderRadius: '4px',
                                            fontWeight: 600,
                                          }}
                                        >
                                          {t}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  {record.url_firma ? (
                                    <div
                                      style={{
                                        width: '70px',
                                        height: '35px',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '4px',
                                        backgroundImage: `url(${record.url_firma})`,
                                        backgroundSize: 'contain',
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'center',
                                        backgroundColor: '#fff',
                                      }}
                                      title="Firma capturada"
                                    />
                                  ) : (
                                    <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>
                                      Sin firma
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Filtros Superiores */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              alignItems: 'center',
              backgroundColor: 'var(--neutral-light)',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
              <Search
                size={18}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--neutral-dark)',
                  opacity: 0.6,
                }}
              />
              <input
                type="text"
                placeholder="Buscar por Nombre, Apellido o Cédula..."
                className="app-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '2.2rem', marginBottom: 0 }}
              />
            </div>
            <div className="flex-1" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '150px', position: 'relative' }}>
                <Filter
                  size={16}
                  color="var(--neutral-gray)"
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                />
                <select
                  className="app-input"
                  style={{ paddingLeft: '2rem', height: '100%' }}
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as any)}
                >
                  <option value="todos">Cualquier Fecha</option>
                  <option value="hoy">Hoy</option>
                  <option value="ayer">Ayer</option>
                  <option value="semana">Esta Semana</option>
                </select>
              </div>

              <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                <CalendarDays
                  size={16}
                  color="var(--neutral-gray)"
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                />
                <select
                  className="app-input"
                  style={{ paddingLeft: '2rem', height: '100%' }}
                  value={jornadaFilter}
                  onChange={(e) => setJornadaFilter(e.target.value)}
                >
                  <option value="todas">Todas las Jornadas</option>
                  {jornadas.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <button
                className="btn btn-secondary"
                onClick={handleExportPDF}
                disabled={filteredRecords.length === 0 || isGeneratingPdf}
                style={{
                  padding: '0.6rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Download size={18} />
                {isGeneratingPdf ? 'Generando...' : 'Exportar PDF'}
              </button>
            </div>
          </div>

          {/* Lista de Registros */}
          <div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.6 }}>
                Cargando registros...
              </div>
            ) : filteredRecords.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '3rem',
                  backgroundColor: '#fff',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border-color)',
                }}
              >
                <Calendar size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.2 }} />
                <p style={{ fontWeight: 600, color: 'var(--neutral-dark)', opacity: 0.7 }}>
                  No hay registros que coincidan con la búsqueda.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {filteredRecords.map((record, index) => {
                  const group = getGroupTitle(record.created_at);
                  const prevRecord = index > 0 ? filteredRecords[index - 1] : null;
                  const prevGroup = prevRecord ? getGroupTitle(prevRecord.created_at) : '';
                  const showGroupHeader = group !== prevGroup;

                  return (
                    <React.Fragment key={record.id}>
                      {showGroupHeader && (
                        <div
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            color: 'var(--primary)',
                            marginTop: '1rem',
                            marginBottom: '0.2rem',
                            paddingLeft: '0.5rem',
                            letterSpacing: '0.5px',
                          }}
                        >
                          {group}
                        </div>
                      )}
                      <div
                        className="card"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '1rem',
                          backgroundColor: '#fff',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-color)',
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: 'var(--primary)',
                              marginBottom: '0.2rem',
                            }}
                          >
                            {record.cedula}
                          </div>
                          <div
                            style={{
                              fontSize: '1.05rem',
                              fontWeight: 600,
                              color: 'var(--neutral-dark)',
                            }}
                          >
                            {record.nombre} {record.apellido}
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              gap: '1rem',
                              marginTop: '0.25rem',
                              fontSize: '0.85rem',
                              color: 'var(--neutral-gray)',
                            }}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Calendar size={14} />
                              {new Date(record.fecha_nacimiento).toLocaleDateString('es-VE')}
                            </span>
                            <span>Sexo: {record.sexo}</span>
                          </div>
                          <div
                            style={{
                              marginTop: '0.75rem',
                              padding: '0.5rem',
                              backgroundColor: 'var(--neutral-light)',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.85rem',
                              color: 'var(--primary)',
                            }}
                          >
                            <strong>Jornada:</strong> {getJornadaName(record.jornada_id)}
                          </div>
                        </div>

                        {record.url_firma ? (
                          <div
                            style={{
                              width: '80px',
                              height: '40px',
                              border: '1px solid var(--border-color)',
                              borderRadius: '4px',
                              backgroundImage: `url(${record.url_firma})`,
                              backgroundSize: 'contain',
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'center',
                              backgroundColor: '#f9f9f9',
                            }}
                            title="Firma capturada"
                          />
                        ) : (
                          <div
                            style={{
                              fontSize: '0.7rem',
                              opacity: 0.5,
                              border: '1px dashed var(--border-color)',
                              padding: '0.25rem',
                              borderRadius: '4px',
                            }}
                          >
                            Sin firma
                          </div>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
