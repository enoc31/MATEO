import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, Sparkles, Check, Loader, FolderKanban, ArrowLeft } from 'lucide-react';
import { api } from '../../services/api';
import type { ExpenseCategory, PartidaGasto, Project } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../components/NotificationProvider';

const BASE_ONG_ID = '11111111-1111-1111-1111-111111111111';

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
    const categoryPartidas = partidas.filter((p) => p.categoria_id === categoryId);
    const categoryPartidaIds = categoryPartidas.map((p) => p.id);
    const allSelected = categoryPartidaIds.every((id) => selectedPartidas.has(id));

    setSelectedPartidas((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        // Deseleccionar todas las de esta categoría
        categoryPartidaIds.forEach((id) => next.delete(id));
      } else {
        // Seleccionar todas las de esta categoría
        categoryPartidaIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!projectId) return;
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
              Habilita las partidas que están autorizadas para el proyecto:{' '}
              <strong style={{ color: 'var(--primary)' }}>
                {project ? project.nombre : 'Cargando...'}
              </strong>
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="btn btn-primary"
            style={{
              padding: '0.75rem 2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {saving ? (
              <Loader size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
            ) : (
              <Check size={18} />
            )}
            Guardar Cambios
          </button>
        </div>
      </div>

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
              const isBase = cat.ong_id === BASE_ONG_ID;
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
                    </span>
                    {catPartidas.length > 0 && (
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
                        const isPartidaBase = p.ong_id === BASE_ONG_ID;
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
                              cursor: 'pointer',
                              backgroundColor: isChecked ? 'rgba(0,143,166,0.04)' : 'transparent',
                              border: '1px solid',
                              borderColor: isChecked ? 'rgba(0,143,166,0.15)' : 'transparent',
                              transition: 'all 0.15s',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleCheckboxChange(p.id)}
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
    </div>
  );
};
