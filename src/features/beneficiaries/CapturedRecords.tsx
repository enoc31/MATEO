import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { Beneficiary, Jornada } from '../../services/api';
import { Search, Calendar, Filter, CalendarDays, Download } from 'lucide-react';
import { useNotifications } from '../../components/NotificationProvider';
import { generateBeneficiariesReport } from '../../utils/pdfReport';

export const CapturedRecords: React.FC = () => {
  const [records, setRecords] = useState<Beneficiary[]>([]);
  const [jornadas, setJornadas] = useState<Jornada[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'hoy' | 'ayer' | 'semana' | 'todos'>('todos');
  const [jornadaFilter, setJornadaFilter] = useState<string>('todas');
  const { addNotification } = useNotifications();

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const [bData, jData] = await Promise.all([
        api.getBeneficiaries(),
        api.getJornadas()
      ]);
      setRecords(bData);
      setJornadas(jData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isToday = (dateString: string) => {
    const d = new Date(dateString);
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  };

  const isYesterday = (dateString: string) => {
    const d = new Date(dateString);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth() && d.getFullYear() === yesterday.getFullYear();
  };

  const isThisWeek = (dateString: string) => {
    const d = new Date(dateString);
    const today = new Date();
    const firstDay = new Date(today.setDate(today.getDate() - today.getDay()));
    const lastDay = new Date(today.setDate(today.getDate() - today.getDay() + 6));
    return d >= firstDay && d <= lastDay;
  };

  const filteredRecords = records.filter(r => {
    // 1. Búsqueda por Cédula o Nombre (Funcionalidad para Escritorio/General)
    const term = searchTerm.toLowerCase();
    const matchSearch = r.cedula.toLowerCase().includes(term) || 
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
    return jornadas.find(j => j.id === id)?.nombre || 'Jornada Desconocida';
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
        title: jornadaFilter !== 'todas' 
          ? `Reporte de Beneficiarios: ${jornadas.find(j => j.id === jornadaFilter)?.nombre}`
          : 'Reporte General de Beneficiarios'
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
  let currentGroup = '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      
      {/* Filtros Superiores */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '0.75rem', 
        alignItems: 'center',
        backgroundColor: 'var(--neutral-light)',
        padding: '1rem',
        borderRadius: 'var(--radius-md)'
      }}>
        <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-dark)', opacity: 0.6 }} />
          <input 
            type="text" 
            placeholder="Buscar por Nombre, Apellido o Cédula..." 
            className="app-input"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.2rem', marginBottom: 0 }}
          />
        </div>
        <div className="flex-1" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '150px', position: 'relative' }}>
                <Filter size={16} color="var(--neutral-gray)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
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
                <CalendarDays size={16} color="var(--neutral-gray)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <select 
                  className="app-input" 
                  style={{ paddingLeft: '2rem', height: '100%' }}
                  value={jornadaFilter}
                  onChange={(e) => setJornadaFilter(e.target.value)}
                >
                  <option value="todas">Todas las Jornadas</option>
                  {jornadas.map(j => (
                    <option key={j.id} value={j.id}>{j.nombre}</option>
                  ))}
                </select>
              </div>
              
              <button
                className="btn btn-secondary"
                onClick={handleExportPDF}
                disabled={filteredRecords.length === 0 || isGeneratingPdf}
                style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Download size={18} />
                {isGeneratingPdf ? 'Generando...' : 'Exportar PDF'}
              </button>
            </div>
      </div>

      {/* Lista de Registros */}
      <div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.6 }}>Cargando registros...</div>
        ) : filteredRecords.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#fff', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
            <Calendar size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.2 }} />
            <p style={{ fontWeight: 600, color: 'var(--neutral-dark)', opacity: 0.7 }}>No hay registros que coincidan con la búsqueda.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filteredRecords.map(record => {
              const group = getGroupTitle(record.created_at);
              const showGroupHeader = group !== currentGroup;
              if (showGroupHeader) currentGroup = group;

              return (
                <React.Fragment key={record.id}>
                  {showGroupHeader && (
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', marginTop: '1rem', marginBottom: '0.2rem', paddingLeft: '0.5rem', letterSpacing: '0.5px' }}>
                      {group}
                    </div>
                  )}
                  <div className="card" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '1rem', 
                    backgroundColor: '#fff',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.2rem' }}>
                        {record.cedula}
                      </div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--neutral-dark)' }}>
                        {record.nombre} {record.apellido}
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', fontSize: '0.85rem', color: 'var(--neutral-gray)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={14} />
                        {new Date(record.fecha_nacimiento).toLocaleDateString('es-VE')}
                      </span>
                      <span>Sexo: {record.sexo}</span>
                    </div>
                    <div style={{ marginTop: '0.75rem', padding: '0.5rem', backgroundColor: 'var(--neutral-light)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', color: 'var(--primary)' }}>
                  <strong>Jornada:</strong> {getJornadaName(record.jornada_id)}
                </div>
                  </div>
                    
                    {record.url_firma ? (
                      <div style={{ 
                        width: '80px', 
                        height: '40px', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '4px',
                        backgroundImage: `url(${record.url_firma})`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        backgroundColor: '#f9f9f9'
                      }} title="Firma capturada" />
                    ) : (
                      <div style={{ fontSize: '0.7rem', opacity: 0.5, border: '1px dashed var(--border-color)', padding: '0.25rem', borderRadius: '4px' }}>
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

    </div>
  );
};
