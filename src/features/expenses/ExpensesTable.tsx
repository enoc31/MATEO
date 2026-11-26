import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Filter,
  Plus,
  Search,
} from 'lucide-react';
import type { Requisition } from '../../services/api';
import { formatUsd } from '../../utils/formatters';
import '../../components/DataTable.css';

type ExpenseTab = 'todas' | 'pendientes' | 'aprobadas' | 'rechazadas';

export interface ExpensesTableProps {
  requisitions: Requisition[];
  onNavigateRequisitions: () => void;
}

function getStatusPillClass(estado: string): string {
  if (estado === 'aprobada_ejecucion' || estado === 'pagada' || estado === 'completada') {
    return 'mdt-pill--baptized';
  }
  if (estado.startsWith('rechazada')) {
    return 'mdt-pill--danger';
  }
  return 'mdt-pill--pending';
}

function formatStatusLabel(estado: string): string {
  if (estado === 'aprobada_ejecucion') return 'Aprobada';
  if (estado === 'pendiente_admin') return 'Pendiente Admin';
  if (estado === 'pendiente_director') return 'Pendiente Director';
  if (estado === 'rechazada') return 'Rechazada';
  return estado.replace(/_/g, ' ');
}

export const ExpensesTable: React.FC<ExpensesTableProps> = ({
  requisitions,
  onNavigateRequisitions,
}) => {
  const [activeTab, setActiveTab] = useState<ExpenseTab>('todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [projectFilter, setProjectFilter] = useState('todos');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const projects = useMemo(() => {
    const set = new Set<string>();
    requisitions.forEach((r) => {
      if (r.proyecto_nombre) set.add(r.proyecto_nombre);
    });
    return Array.from(set);
  }, [requisitions]);

  const filteredRequisitions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return requisitions.filter((r) => {
      if (activeTab === 'pendientes' && !r.estado.startsWith('pendiente')) return false;
      if (activeTab === 'aprobadas' && r.estado !== 'aprobada_ejecucion') return false;
      if (activeTab === 'rechazadas' && !r.estado.startsWith('rechazada')) return false;
      if (projectFilter !== 'todos' && r.proyecto_nombre !== projectFilter) return false;
      if (q) {
        const hay = [r.codigo, r.motivo, r.solicitante_nombre, r.proyecto_nombre, r.partida_nombre]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [requisitions, activeTab, projectFilter, searchTerm]);

  const totalUsd = useMemo(
    () => filteredRequisitions.reduce((acc, r) => acc + (r.monto_solicitado || 0), 0),
    [filteredRequisitions],
  );

  const totalFiltered = filteredRequisitions.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const pageRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredRequisitions.slice(start, start + pageSize);
  }, [filteredRequisitions, safePage, pageSize]);

  const allOnPageSelected = pageRows.length > 0 && pageRows.every((r) => selectedIds.has(r.id));

  const toggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (allOnPageSelected) {
      pageRows.forEach((r) => next.delete(r.id));
    } else {
      pageRows.forEach((r) => next.add(r.id));
    }
    setSelectedIds(next);
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleExpand = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
  };

  const rangeStart = totalFiltered === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, totalFiltered);

  return (
    <div className="mdt-wrapper">
      <div className="mdt-top-bar">
        <div className="mdt-tabs" role="tablist" aria-label="Estados de solicitudes de gasto">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'todas'}
            className={`mdt-tab ${activeTab === 'todas' ? 'mdt-tab--active' : ''}`}
            onClick={() => {
              setActiveTab('todas');
              setCurrentPage(1);
            }}
          >
            Todas
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'pendientes'}
            className={`mdt-tab ${activeTab === 'pendientes' ? 'mdt-tab--active' : ''}`}
            onClick={() => {
              setActiveTab('pendientes');
              setCurrentPage(1);
            }}
          >
            Pendientes
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'aprobadas'}
            className={`mdt-tab ${activeTab === 'aprobadas' ? 'mdt-tab--active' : ''}`}
            onClick={() => {
              setActiveTab('aprobadas');
              setCurrentPage(1);
            }}
          >
            Aprobadas
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'rechazadas'}
            className={`mdt-tab ${activeTab === 'rechazadas' ? 'mdt-tab--active' : ''}`}
            onClick={() => {
              setActiveTab('rechazadas');
              setCurrentPage(1);
            }}
          >
            Rechazadas
          </button>
        </div>

        <div className="mdt-summary mdt-nowrap">
          Total listado: <strong>{formatUsd(totalUsd)}</strong> ({totalFiltered} solicitudes)
        </div>
      </div>

      <div className="mdt-card">
        <div className="mdt-toolbar">
          <div className="mdt-toolbar-left">
            <button
              type="button"
              className={`mdt-filter-btn ${showFilters ? 'mdt-filter-btn--active' : ''}`}
              onClick={() => setShowFilters((p) => !p)}
            >
              <Filter size={15} />
              Filtrar
            </button>

            <div className="mdt-search-box">
              <Search size={16} className="mdt-search-icon" />
              <input
                type="text"
                className="mdt-search-input"
                placeholder="Buscar solicitud por código, concepto o solicitante..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Buscar solicitud de gasto"
              />
            </div>
          </div>

          <div className="mdt-toolbar-actions">
            <button type="button" className="mdt-primary-btn" onClick={onNavigateRequisitions}>
              <Plus size={15} />
              Nueva Solicitud
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mdt-filter-drawer">
            <label htmlFor="exp-project" className="mdt-secondary-text">
              Proyecto:
            </label>
            <select
              id="exp-project"
              className="mdt-filter-select"
              value={projectFilter}
              onChange={(e) => {
                setProjectFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="todos">Todos los proyectos</option>
              {projects.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        )}

        {pageRows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            <ClipboardList size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.35 }} />
            <p style={{ fontWeight: 700, margin: 0 }}>No hay solicitudes de gasto</p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Crea una nueva solicitud o cambia la pestaña de filtro.
            </p>
          </div>
        ) : (
          <div className="mdt-table-scroll">
            <table className="mdt-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      className="mdt-checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleSelectAll}
                      aria-label="Seleccionar todas las solicitudes de la página"
                    />
                  </th>
                  <th style={{ width: '36px' }} aria-label="Expandir detalle" />
                  <th>Concepto / Solicitante</th>
                  <th>Proyecto / Partida</th>
                  <th>Estado</th>
                  <th className="mdt-align-right">Monto</th>
                  <th className="mdt-align-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((req) => {
                  const isSelected = selectedIds.has(req.id);
                  const isExpanded = expandedIds.has(req.id);

                  return (
                    <React.Fragment key={req.id}>
                      <tr className={`mdt-row ${isSelected ? 'mdt-row--selected' : ''}`}>
                        <td>
                          <input
                            type="checkbox"
                            className="mdt-checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(req.id)}
                            aria-label={`Seleccionar solicitud ${req.codigo || req.id}`}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`mdt-expand-btn ${isExpanded ? 'mdt-expand-btn--open' : ''}`}
                            onClick={() => toggleExpand(req.id)}
                            aria-expanded={isExpanded}
                            aria-label={`Ver detalle de solicitud ${req.codigo || req.id}`}
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        </td>
                        <td>
                          <div className="mdt-primary-text">
                            {req.codigo ? `${req.codigo} · ` : ''}
                            {req.motivo}
                          </div>
                          <div className="mdt-secondary-text">
                            {req.solicitante_nombre || 'Solicitante interno'}
                          </div>
                        </td>
                        <td>
                          <div className="mdt-primary-text">
                            {req.proyecto_nombre || 'Proyecto General'}
                          </div>
                          <div className="mdt-secondary-text">
                            {req.partida_nombre || req.categoria_nombre || 'Sin partida'}
                          </div>
                        </td>
                        <td>
                          <span className={`mdt-pill ${getStatusPillClass(req.estado)}`}>
                            <span className="mdt-pill-dot" />
                            {formatStatusLabel(req.estado)}
                          </span>
                        </td>
                        <td className="mdt-align-right mdt-nowrap">
                          <div className="mdt-primary-text mdt-nowrap">
                            {formatUsd(req.monto_solicitado)}
                          </div>
                          <div className="mdt-secondary-text">USD</div>
                        </td>
                        <td>
                          <div className="mdt-actions-cell">
                            <button
                              type="button"
                              className="mdt-view-more-btn"
                              onClick={onNavigateRequisitions}
                            >
                              Ver más
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="mdt-expanded-row">
                          <td colSpan={7}>
                            <div className="mdt-expanded-grid">
                              <div>
                                <div className="mdt-expanded-label">Motivo completo</div>
                                <div className="mdt-expanded-value">{req.motivo}</div>
                              </div>
                              <div>
                                <div className="mdt-expanded-label">Categoría</div>
                                <div className="mdt-expanded-value">
                                  {req.categoria_nombre || 'No especificada'}
                                </div>
                              </div>
                              <div>
                                <div className="mdt-expanded-label">Validación 1</div>
                                <div className="mdt-expanded-value">
                                  {req.validador_1_nombre || 'Pendiente'}
                                </div>
                              </div>
                              <div>
                                <div className="mdt-expanded-label">Validación 2</div>
                                <div className="mdt-expanded-value">
                                  {req.validador_2_nombre || 'Pendiente'}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mdt-footer mdt-nowrap">
          <div className="mdt-rows-per-page">
            <span>Filas por página:</span>
            <select
              aria-label="Filas por página"
              className="mdt-rows-select"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <span>
            {rangeStart}-{rangeEnd} de {totalFiltered}
          </span>

          <div className="mdt-page-nav">
            <button
              type="button"
              className="mdt-page-btn"
              aria-label="Página anterior"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className="mdt-page-btn"
              aria-label="Página siguiente"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
