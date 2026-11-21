import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Eye,
  Filter,
  MoreVertical,
  Search,
  UserPlus,
  Users,
} from 'lucide-react';
import type { Beneficiary } from '../../services/api';
import './MembersDataTable.css';

export type MemberTableTab = 'todos' | 'bautizados' | 'por_bautizar' | 'lideres';

export interface MembersDataTableProps {
  members: Beneficiary[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  cargoFilter: string;
  onCargoFilterChange: (value: string) => void;
  bautizadoFilter: string;
  onBautizadoFilterChange: (value: string) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  onViewProfile: (member: Beneficiary) => void;
  onEditMember: (member: Beneficiary) => void;
  onNewMember?: () => void;
}

const LEADER_CARGOS = new Set([
  'PASTOR / OBISPO O SIMILAR',
  'DIÁCONO / ANCIANO O SIMILAR',
  'MINISTRO / COORDINADOR / LÍDER O SIMILAR',
]);

function formatShortDate(dateValue?: string): string {
  if (!dateValue) return 'Sin registro';
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return 'Sin registro';
  return parsed.toLocaleDateString('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export const MembersDataTable: React.FC<MembersDataTableProps> = ({
  members,
  searchTerm,
  onSearchChange,
  cargoFilter,
  onCargoFilterChange,
  bautizadoFilter,
  onBautizadoFilterChange,
  pageSize,
  onPageSizeChange,
  currentPage,
  onPageChange,
  onViewProfile,
  onEditMember,
  onNewMember,
}) => {
  const [activeTab, setActiveTab] = useState<MemberTableTab>('todos');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const tabFilteredMembers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return members.filter((member) => {
      const isBautizado =
        Boolean(member.bautizado) ||
        (Array.isArray(member.tipo_donacion) && member.tipo_donacion.includes('Bautizado'));

      if (activeTab === 'bautizados' && !isBautizado) return false;
      if (activeTab === 'por_bautizar' && isBautizado) return false;
      if (
        activeTab === 'lideres' &&
        !(member.cargo_eclesiastico && LEADER_CARGOS.has(member.cargo_eclesiastico))
      ) {
        return false;
      }

      if (cargoFilter !== 'todos' && member.cargo_eclesiastico !== cargoFilter) {
        return false;
      }

      if (bautizadoFilter === 'bautizado' && !isBautizado) return false;
      if (bautizadoFilter === 'no_bautizado' && isBautizado) return false;

      if (term) {
        const fullName = `${member.nombre || ''} ${member.apellido || ''}`.toLowerCase();
        const matchesSearch =
          fullName.includes(term) ||
          (member.cedula || '').toLowerCase().includes(term) ||
          (member.email || '').toLowerCase().includes(term) ||
          (member.telefono || '').toLowerCase().includes(term);
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [members, activeTab, searchTerm, cargoFilter, bautizadoFilter]);

  const totalFiltered = tabFilteredMembers.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const pageMembers = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return tabFilteredMembers.slice(start, start + pageSize);
  }, [tabFilteredMembers, safePage, pageSize]);

  const baptizedCount = useMemo(
    () => members.filter((m) => Boolean(m.bautizado)).length,
    [members],
  );

  const allOnPageSelected =
    pageMembers.length > 0 && pageMembers.every((member) => selectedIds.has(member.id));

  const handleTabSelect = (tab: MemberTableTab) => {
    setActiveTab(tab);
    onPageChange(1);
    if (tab === 'bautizados') {
      onBautizadoFilterChange('bautizado');
    } else if (tab === 'por_bautizar') {
      onBautizadoFilterChange('no_bautizado');
    } else {
      onBautizadoFilterChange('todos');
    }
  };

  const toggleSelectAllPage = () => {
    const next = new Set(selectedIds);
    if (allOnPageSelected) {
      pageMembers.forEach((m) => next.delete(m.id));
    } else {
      pageMembers.forEach((m) => next.add(m.id));
    }
    setSelectedIds(next);
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleExpandRow = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedIds(next);
  };

  const rangeStart = totalFiltered === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, totalFiltered);

  return (
    <div className="mdt-wrapper">
      {/* Encabezado de pestañas y resumen numérico */}
      <div className="mdt-top-bar">
        <div className="mdt-tabs" role="tablist" aria-label="Filtros rápidos de miembros">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'todos'}
            className={`mdt-tab ${activeTab === 'todos' ? 'mdt-tab--active' : ''}`}
            onClick={() => handleTabSelect('todos')}
          >
            Todos
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'bautizados'}
            className={`mdt-tab ${activeTab === 'bautizados' ? 'mdt-tab--active' : ''}`}
            onClick={() => handleTabSelect('bautizados')}
          >
            Bautizados
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'por_bautizar'}
            className={`mdt-tab ${activeTab === 'por_bautizar' ? 'mdt-tab--active' : ''}`}
            onClick={() => handleTabSelect('por_bautizar')}
          >
            Por Bautizar
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'lideres'}
            className={`mdt-tab ${activeTab === 'lideres' ? 'mdt-tab--active' : ''}`}
            onClick={() => handleTabSelect('lideres')}
          >
            Líderes y Pastores
          </button>
        </div>

        <div className="mdt-summary font-numeric">
          Bautizados: <strong>{baptizedCount}</strong> / {members.length} fieles
        </div>
      </div>

      {/* Tarjeta principal de la tabla */}
      <div className="mdt-card">
        <div className="mdt-toolbar">
          <div className="mdt-toolbar-left">
            <button
              type="button"
              className={`mdt-filter-btn ${showFilterDrawer ? 'mdt-filter-btn--active' : ''}`}
              onClick={() => setShowFilterDrawer((prev) => !prev)}
            >
              <Filter size={15} />
              Filtrar
            </button>

            <div className="mdt-search-box">
              <Search size={16} className="mdt-search-icon" />
              <input
                type="text"
                className="mdt-search-input"
                placeholder="Buscar miembro por nombre, cédula o correo..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                aria-label="Buscar miembro por nombre, cédula o correo"
              />
            </div>
          </div>

          <div className="mdt-toolbar-actions">
            {selectedIds.size > 0 && (
              <span className="mdt-secondary-text font-numeric">
                {selectedIds.size} seleccionado(s)
              </span>
            )}
            {onNewMember && (
              <button type="button" className="mdt-primary-btn" onClick={onNewMember}>
                <UserPlus size={15} />
                Nuevo Miembro
              </button>
            )}
          </div>
        </div>

        {showFilterDrawer && (
          <div className="mdt-filter-drawer">
            <label htmlFor="mdt-cargo-select" className="mdt-secondary-text">
              Cargo eclesiástico:
            </label>
            <select
              id="mdt-cargo-select"
              className="mdt-filter-select"
              value={cargoFilter}
              onChange={(e) => onCargoFilterChange(e.target.value)}
            >
              <option value="todos">Todos los cargos</option>
              <option value="PASTOR / OBISPO O SIMILAR">Pastor / Obispo</option>
              <option value="DIÁCONO / ANCIANO O SIMILAR">Diácono / Anciano</option>
              <option value="MINISTRO / COORDINADOR / LÍDER O SIMILAR">
                Ministro / Coordinador / Líder
              </option>
              <option value="MIEMBRO GENERAL">Miembro General</option>
            </select>

            <label htmlFor="mdt-baptism-select" className="mdt-secondary-text">
              Bautismo:
            </label>
            <select
              id="mdt-baptism-select"
              className="mdt-filter-select"
              value={bautizadoFilter}
              onChange={(e) => onBautizadoFilterChange(e.target.value)}
            >
              <option value="todos">Todos</option>
              <option value="bautizado">Bautizados</option>
              <option value="no_bautizado">Por Bautizar</option>
            </select>
          </div>
        )}

        {pageMembers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
            <Users size={44} style={{ margin: '0 auto 0.75rem auto', opacity: 0.35 }} />
            <p style={{ fontWeight: 700, margin: 0 }}>No se encontraron miembros</p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Ajusta la búsqueda o cambia la pestaña de filtro para ver otros registros.
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
                      onChange={toggleSelectAllPage}
                      aria-label="Seleccionar todos los miembros de la página"
                    />
                  </th>
                  <th style={{ width: '36px' }} aria-label="Expandir detalle" />
                  <th>Miembro / Feligrés</th>
                  <th>Cargo Eclesiástico</th>
                  <th>Estado Bautismal</th>
                  <th className="mdt-align-right">Cédula / Contacto</th>
                  <th className="mdt-align-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pageMembers.map((member) => {
                  const isSelected = selectedIds.has(member.id);
                  const isExpanded = expandedIds.has(member.id);
                  const isLeader = Boolean(
                    member.cargo_eclesiastico && LEADER_CARGOS.has(member.cargo_eclesiastico),
                  );
                  const areasCount = member.areas_ministeriales?.length || 0;

                  return (
                    <React.Fragment key={member.id}>
                      <tr className={`mdt-row ${isSelected ? 'mdt-row--selected' : ''}`}>
                        <td>
                          <input
                            type="checkbox"
                            className="mdt-checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(member.id)}
                            aria-label={`Seleccionar a ${member.nombre || ''} ${member.apellido || ''}`}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`mdt-expand-btn ${isExpanded ? 'mdt-expand-btn--open' : ''}`}
                            onClick={() => toggleExpandRow(member.id)}
                            aria-expanded={isExpanded}
                            aria-label={`Ver detalle rápido de ${member.nombre || 'miembro'}`}
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        </td>
                        <td>
                          <div className="mdt-member-cell">
                            {member.foto_url ? (
                              <img
                                src={member.foto_url}
                                alt={`${member.nombre || ''} ${member.apellido || ''}`}
                                loading="lazy"
                                decoding="async"
                                className="mdt-avatar"
                              />
                            ) : (
                              <div className="mdt-avatar-fallback" aria-hidden="true">
                                {(member.nombre?.[0] || 'M').toUpperCase()}
                                {(member.apellido?.[0] || '').toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="mdt-primary-text">
                                {member.nombre || 'Sin nombre'} {member.apellido || ''}
                              </div>
                              <div className="mdt-secondary-text">
                                {member.email || 'Sin correo registrado'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`mdt-pill ${isLeader ? 'mdt-pill--role' : 'mdt-pill--general'}`}
                          >
                            <span className="mdt-pill-dot" />
                            {member.cargo_eclesiastico || 'MIEMBRO GENERAL'}
                          </span>
                          <div className="mdt-secondary-text">
                            Membresía: {formatShortDate(member.fecha_membresia)}
                          </div>
                        </td>
                        <td>
                          <span
                            className={`mdt-pill ${
                              member.bautizado ? 'mdt-pill--baptized' : 'mdt-pill--pending'
                            }`}
                          >
                            <span className="mdt-pill-dot" />
                            {member.bautizado ? 'Bautizado' : 'Por Bautizar'}
                          </span>
                          <div className="mdt-secondary-text">
                            {areasCount > 0
                              ? `${areasCount} área(s) ministerial(es)`
                              : 'Sin áreas asignadas'}
                          </div>
                        </td>
                        <td className="mdt-align-right">
                          <div className="mdt-primary-text font-numeric">
                            {member.cedula || 'N/I'}
                          </div>
                          <div className="mdt-secondary-text font-numeric">
                            {member.telefono || 'Sin teléfono'}
                          </div>
                        </td>
                        <td>
                          <div className="mdt-actions-cell">
                            <button
                              type="button"
                              className="mdt-view-more-btn"
                              onClick={() => onViewProfile(member)}
                            >
                              Ver más
                            </button>
                            <button
                              type="button"
                              className="mdt-more-btn"
                              aria-label={`Más acciones para ${member.nombre || 'miembro'}`}
                              onClick={() =>
                                setOpenMenuId((prev) => (prev === member.id ? null : member.id))
                              }
                            >
                              <MoreVertical size={16} />
                            </button>

                            {openMenuId === member.id && (
                              <div className="mdt-dropdown" role="menu">
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="mdt-dropdown-item"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    onViewProfile(member);
                                  }}
                                >
                                  <Eye size={14} /> Ficha 360°
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="mdt-dropdown-item"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    onEditMember(member);
                                  }}
                                >
                                  <Edit3 size={14} /> Editar miembro
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="mdt-expanded-row">
                          <td colSpan={7}>
                            <div className="mdt-expanded-grid">
                              <div>
                                <div className="mdt-expanded-label">Dirección</div>
                                <div className="mdt-expanded-value">
                                  {member.direccion || 'No especificada'}
                                </div>
                              </div>
                              <div>
                                <div className="mdt-expanded-label">Áreas Ministeriales</div>
                                <div className="mdt-expanded-value">
                                  {member.areas_ministeriales &&
                                  member.areas_ministeriales.length > 0
                                    ? member.areas_ministeriales.join(', ')
                                    : 'Ninguna'}
                                </div>
                              </div>
                              <div>
                                <div className="mdt-expanded-label">Grado de Instrucción</div>
                                <div className="mdt-expanded-value">
                                  {member.grado_instruccion || 'No indicado'}
                                </div>
                              </div>
                              <div>
                                <div className="mdt-expanded-label">Fecha de Nacimiento</div>
                                <div className="mdt-expanded-value">
                                  {formatShortDate(member.fecha_nacimiento)}
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

        {/* Footer de paginación */}
        <div className="mdt-footer font-numeric">
          <div className="mdt-rows-per-page">
            <span>Filas por página:</span>
            <select
              aria-label="Filas por página"
              className="mdt-rows-select"
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
            >
              <option value={10}>10</option>
              <option value={12}>12</option>
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
              onClick={() => onPageChange(Math.max(1, safePage - 1))}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className="mdt-page-btn"
              aria-label="Página siguiente"
              disabled={safePage >= totalPages}
              onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
