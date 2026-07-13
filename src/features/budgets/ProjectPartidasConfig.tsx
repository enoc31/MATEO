import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Shield,
  Sparkles,
  Check,
  Loader,
  FolderKanban,
  ArrowLeft,
  ListChecks,
  ListX,
  BookOpen,
  Eye,
} from 'lucide-react';
import { api } from '../../services/api';
import type { ExpenseCategory, PartidaGasto, Project } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../components/NotificationProvider';

export const ProjectPartidasConfig: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { addNotification } = useNotifications();

  const [project, setProject] = useState<Project | null>(null);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [partidas, setPartidas] = useState<PartidaGasto[]>([]);
  const [selectedPartidas, setSelectedPartidas] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /** Solo administradores y directores pueden editar; auditores solo leen */
  const canEdit =
    profile?.rol === 'administrador' ||
    profile?.rol === 'director' ||
    profile?.rol === 'super_admin';
  const isReadOnly = profile?.rol === 'auditor';

  // ── Fetch Catalog & Project-Partida Relations ──────────────────────────────

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [catalog, activeRelations, projectsList] = await Promise.all([
        api.getCatalog(),
        api.getProjectPartidas(projectId),
        api.getProjects(),
      ]);

      const currentProj = projectsList.find((p) => p.id === projectId);
      if (currentProj) {
        setProject(currentProj);
      }

      setCategories(catalog.categories);
      setPartidas(catalog.partidas);
      setSelectedPartidas(new Set(activeRelations.map((p) => p.id)));
    } catch (err) {
      console.error('Error loading project partidas:', err);
      addNotification('Error al cargar la configuración de partidas', 'warning');
    } finally {
      setLoading(false);
    }
  }, [projectId, addNotification]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleCheckboxChange = (partidaId: string) => {
    if (!canEdit) return;
    setSelectedPartidas((prev) => {
      const next = new Set(prev);
      if (next.has(partidaId)) {
        next.delete(partidaId);
      } else {
        next.add(partidaId);
      }
      return next;
    });
  };

  const handleSelectAllInCategory = (categoryId: string) => {
    if (!canEdit) return;
    const categoryPartidas = partidas.filter((p) => p.categoria_id === categoryId);
    const categoryPartidaIds = categoryPartidas.map((p) => p.id);
    const allSelected = categoryPartidaIds.every((id) => selectedPartidas.has(id));

    setSelectedPartidas((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        categoryPartidaIds.forEach((id) => next.delete(id));
      } else {
        categoryPartidaIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  /** Selecciona solo las partidas del catálogo estándar UNDG */
  const handleSelectUNDG = () => {
    if (!canEdit) return;
    const undgIds = partidas.filter((p) => p.es_catalogo_undg).map((p) => p.id);
    setSelectedPartidas((prev) => {
      const next = new Set(prev);
      undgIds.forEach((id) => next.add(id));
      return next;
    });
  };

  /** Selecciona absolutamente todas las partidas del catálogo */
  const handleSelectAll = () => {
    if (!canEdit) return;
    setSelectedPartidas(new Set(partidas.map((p) => p.id)));
  };

  /** Limpia toda la selección */
  const handleClearAll = () => {
    if (!canEdit) return;
    setSelectedPartidas(new Set());
  };

  const handleSave = async () => {
    if (!projectId || !canEdit) return;
    setSaving(true);
    try {
      await api.setProjectPartidas(projectId, Array.from(selectedPartidas), profile?.ong_id ?? '');
      addNotification('Configuración de partidas guardada correctamente', 'success');
      navigate('/app/budgets');
    } catch (err) {
      console.error('Error saving project partidas config:', err);
      addNotification('Error al guardar la asignación de partidas', 'warning');
    } finally {
      setSaving(false);
    }
  };

  // ── Derived counts ────────────────────────────────────────────────────────

  const totalPartidas = partidas.length;
  const selectedCount = selectedPartidas.size;
  const undgCount = partidas.filter((p) => p.es_catalogo_undg).length;
  const selectedUNDGCount = partidas.filter(
    (p) => p.es_catalogo_undg && selectedPartidas.has(p.id),
  ).length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '2rem', maxWidth: '960px', margin: '0 auto' }}>
      {/* Volver y Encabezado */}
      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => navigate('/app/budgets')}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.9rem',
            padding: 0,
            marginBottom: '1rem',
          }}
        >
          <ArrowLeft size={16} />
          Volver a Presupuestos
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2
              style={{
                color: 'var(--primary)',
                fontSize: '1.75rem',
                fontWeight: 800,
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <FolderKanban size={28} />
              Configurar Partidas del Proyecto
            </h2>
            <p style={{ margin: '0.35rem 0px 0px', fontSize: '0.95rem', opacity: 0.7 }}>
              Habilita las partidas autorizadas para el proyecto:{' '}
              <strong style={{ color: 'var(--primary)' }}>
                {project ? project.nombre : 'Cargando...'}
              </strong>
            </p>
          </div>

          {/* Contador de selección */}
          {!loading && (
            <div
              style={{
                textAlign: 'center',
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '0.65rem 1.25rem',
                minWidth: '130px',
              }}
            >
              <div
                style={{
                  fontSize: '1.6rem',
                  fontWeight: 800,
                  color: selectedCount > 0 ? 'var(--primary)' : 'var(--neutral-medium)',
                  lineHeight: 1,
                }}
              >
                {selectedCount}
              </div>
              <div
                style={{ fontSize: '0.72rem', color: 'var(--neutral-medium)', marginTop: '2px' }}
              >
                de {totalPartidas} partidas
              </div>
              <div
                style={{
                  fontSize: '0.7rem',
                  color: selectedUNDGCount === undgCount ? '#1a7a4a' : 'var(--neutral-medium)',
                  marginTop: '2px',
                }}
              >
                {selectedUNDGCount}/{undgCount} UNDG
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modo Solo Lectura — aviso para auditor */}
      {isReadOnly && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            background: 'rgba(30,111,168,0.06)',
            border: '1px solid rgba(30,111,168,0.2)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
            color: '#1e6fa8',
          }}
        >
          <Eye size={17} style={{ flexShrink: 0 }} />
          <span>
            Estás viendo esta pantalla en <strong>modo lectura</strong>. Solo Administradores y
            Directores pueden modificar las partidas habilitadas por proyecto.
          </span>
        </div>
      )}

      {/* Barra de acciones globales */}
      {!loading && canEdit && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            marginBottom: '1.25rem',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '0.82rem', color: 'var(--neutral-medium)', fontWeight: 600 }}>
            Selección rápida:
          </span>
          <button
            onClick={handleSelectUNDG}
            className="btn btn-outline"
            title="Añade a la selección todas las partidas del catálogo UNDG"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.8rem',
              padding: '0.4rem 0.85rem',
              borderColor: 'rgba(30,111,168,0.4)',
              color: '#1e6fa8',
            }}
          >
            <Shield size={14} />
            Seleccionar Catálogo UNDG
          </button>
          <button
            onClick={handleSelectAll}
            className="btn btn-outline"
            title="Selecciona absolutamente todas las partidas disponibles"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.8rem',
              padding: '0.4rem 0.85rem',
            }}
          >
            <ListChecks size={14} />
            Seleccionar Todo
          </button>
          <button
            onClick={handleClearAll}
            className="btn btn-outline"
            title="Desmarca todas las partidas"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.8rem',
              padding: '0.4rem 0.85rem',
              borderColor: 'rgba(200,50,50,0.35)',
              color: 'var(--danger)',
            }}
          >
            <ListX size={14} />
            Limpiar selección
          </button>

          {/* Separador */}
          <div style={{ flex: 1 }} />

          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="btn btn-primary"
            style={{
              padding: '0.5rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {saving ? (
              <Loader size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
            ) : (
              <Check size={16} />
            )}
            Guardar Cambios
          </button>
        </div>
      )}

      {/* Contenido / Catálogo */}
      <div className="card" style={{ padding: '2rem' }}>
        {loading ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '5rem',
              gap: '0.75rem',
              color: 'var(--neutral-medium)',
            }}
          >
            <Loader size={28} style={{ animation: 'spin 1s linear infinite' }} />
            <span>Cargando catálogo de partidas...</span>
          </div>
        ) : categories.length === 0 ? (
          <p style={{ textAlign: 'center', fontStyle: 'italic', opacity: 0.6 }}>
            No hay categorías de gasto configuradas.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {categories.map((cat) => {
              const catPartidas = partidas.filter((p) => p.categoria_id === cat.id);
              const isBase = cat.es_catalogo_undg === true;
              const hasAllSelected =
                catPartidas.length > 0 && catPartidas.every((p) => selectedPartidas.has(p.id));

              return (
                <div
                  key={cat.id}
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Category Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: isBase ? 'rgba(30,111,168,0.04)' : 'rgba(26,122,74,0.04)',
                      padding: '0.85rem 1.25rem',
                      borderBottom: '1px solid var(--border-color)',
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        color: 'var(--neutral-dark)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      {isBase ? (
                        <Shield size={16} style={{ color: '#1e6fa8', opacity: 0.7 }} />
                      ) : (
                        <Sparkles size={16} style={{ color: '#1a7a4a', opacity: 0.8 }} />
                      )}
                      {cat.nombre}
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 500,
                          color: 'var(--neutral-medium)',
                          fontStyle: 'italic',
                        }}
                      >
                        {isBase ? '— Estándar UNDG' : '— Personalizada'}
                      </span>
                    </span>
                    {catPartidas.length > 0 && canEdit && (
                      <button
                        onClick={() => handleSelectAllInCategory(cat.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--primary)',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          opacity: 0.8,
                        }}
                      >
                        {hasAllSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
                      </button>
                    )}
                  </div>

                  {/* Partidas list */}
                  <div
                    style={{
                      padding: '0.75rem 1.25rem',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                      gap: '0.75rem',
                      backgroundColor: 'rgba(255,255,255,0.01)',
                    }}
                  >
                    {catPartidas.length === 0 ? (
                      <p
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--neutral-medium)',
                          fontStyle: 'italic',
                          gridColumn: '1 / -1',
                          margin: 0,
                        }}
                      >
                        No hay partidas asociadas.
                      </p>
                    ) : (
                      catPartidas.map((p) => {
                        const isPartidaBase = p.es_catalogo_undg === true;
                        const isChecked = selectedPartidas.has(p.id);

                        return (
                          <label
                            key={p.id}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '0.75rem',
                              padding: '0.6rem 0.75rem',
                              borderRadius: 'var(--radius-sm)',
                              cursor: canEdit ? 'pointer' : 'default',
                              backgroundColor: isChecked ? 'rgba(0,143,166,0.04)' : 'transparent',
                              border: '1px solid',
                              borderColor: isChecked ? 'rgba(0,143,166,0.15)' : 'transparent',
                              transition: 'all 0.15s',
                              opacity: !canEdit && !isChecked ? 0.55 : 1,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleCheckboxChange(p.id)}
                              disabled={!canEdit}
                              style={{ marginTop: '0.2rem' }}
                            />
                            <div style={{ flex: 1 }}>
                              <div
                                style={{
                                  fontSize: '0.88rem',
                                  fontWeight: 600,
                                  color: 'var(--neutral-dark)',
                                }}
                              >
                                <span
                                  style={{
                                    fontFamily: 'monospace',
                                    fontWeight: 700,
                                    marginRight: '0.5rem',
                                    color: isPartidaBase
                                      ? 'var(--neutral-medium)'
                                      : 'var(--primary)',
                                  }}
                                >
                                  {p.codigo}
                                </span>
                                {p.nombre}
                              </div>
                              {p.descripcion && (
                                <span
                                  style={{
                                    display: 'block',
                                    fontSize: '0.75rem',
                                    opacity: 0.6,
                                    marginTop: '0.15rem',
                                  }}
                                >
                                  {p.descripcion}
                                </span>
                              )}
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Leyenda informativa */}
      {!loading && (
        <div
          style={{
            display: 'flex',
            gap: '1.5rem',
            marginTop: '1.25rem',
            padding: '0.65rem 1rem',
            background: 'var(--card-bg)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            flexWrap: 'wrap',
            fontSize: '0.78rem',
            color: 'var(--neutral-medium)',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Shield size={13} color="#1e6fa8" /> Catálogo estándar UNDG
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sparkles size={13} color="#1a7a4a" /> Partidas personalizadas de tu organización
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <BookOpen size={13} /> Solo las partidas habilitadas aquí pueden usarse en presupuestos
            y comprobantes de este proyecto.
          </span>
        </div>
      )}
    </div>
  );
};
