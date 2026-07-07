import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { Beneficiary } from '../../services/api';
import { Search, Calendar, Filter } from 'lucide-react';

export const CapturedRecords: React.FC = () => {
  const [records, setRecords] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'hoy' | 'ayer' | 'semana' | 'todos'>('todos');

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await api.getBeneficiaries();
      setRecords(data);
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

    return matchSearch && matchDate;
  });

  const getGroupTitle = (dateString?: string) => {
    if (!dateString) return 'Registros';
    if (isToday(dateString)) return 'HOY';
    if (isYesterday(dateString)) return 'AYER';
    if (isThisWeek(dateString)) return 'ESTA SEMANA';
    return new Date(dateString).toLocaleDateString('es-VE');
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
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={16} color="var(--primary)" />
          <select 
            className="app-input" 
            value={dateFilter} 
            onChange={e => setDateFilter(e.target.value as any)}
            style={{ marginBottom: 0, minWidth: '150px' }}
          >
            <option value="todos">Todas las Fechas</option>
            <option value="hoy">Hoy</option>
            <option value="ayer">Ayer</option>
            <option value="semana">Esta Semana</option>
          </select>
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
                      <div style={{ fontSize: '0.75rem', color: 'var(--neutral-dark)', opacity: 0.7, marginTop: '0.2rem' }}>
                        Captura: {record.created_at ? new Date(record.created_at).toLocaleTimeString('es-VE', {hour: '2-digit', minute: '2-digit'}) : 'N/A'}
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
