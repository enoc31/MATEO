import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, Check, Loader, FolderKanban } from 'lucide-react';
import { api } from '../../services/api';
import type { ExpenseCategory, PartidaGasto } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../components/NotificationProvider';

interface ProjectPartidasModalProps {
  isOpen: boolean;
  onClose: () => void;
  proyectoId: string;
  proyectoNombre: string;
}

const BASE_ONG_ID = '11111111-1111-1111-1111-111111111111';

export const ProjectPartidasModal: React.FC<ProjectPartidasModalProps> = ({
  isOpen,
  onClose,
  proyectoId,
  proyectoNombre,
}) => {
  const { profile } = useAuth();
  const { addNotification } = useNotifications();

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [partidas, setPartidas] = useState<PartidaGasto[]>([]);
  const [selectedPartidas, setSelectedPartidas] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Fetch Catalog & Project-Partida Relations ──────────────────────────────

  useEffect(() => {
    if (!isOpen || !proyectoId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [catalog, activeRelations] = await Promise.all([
          api.getCatalog(),
          api.getProjectPartidas(proyectoId),
        ]);

        setCategories(catalog.categories);
        setPartidas(catalog.partidas);
        setSelectedPartidas(new Set(activeRelations.map((p) => p.id)));
      } catch (err) {
        console.error('Error loading project partidas:', err);
        addNotification('Error al cargar la configuración de partidas', 'warning');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, proyectoId, addNotification]);

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
    setSaving(true);
    try {
      await api.setProjectPartidas(proyectoId, Array.from(selectedPartidas), profile?.ong_id ?? '');
      addNotification('Configuración de partidas guardada correctamente', 'success');
      onClose();
    } catch (err) {
      console.error('Error saving project partidas config:', err);
      addNotification('Error al guardar la asignación de partidas', 'warning');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(15, 23, 42, 0.78)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1200,
        padding: '1.5rem',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '640px',
          padding: '2rem',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'var(--card-bg, #ffffff)',
          color: 'var(--neutral-dark, #1e293b)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '1.5rem',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '1rem',
          }}
        >
          <div>
            <h3
              style={{
                color: 'var(--primary)',
                fontSize: '1.25rem',
                fontWeight: 800,
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <FolderKanban size={20} />
              Configurar Partidas del Proyecto
            </h3>
            <p style={{ margin: '0.25rem 0px 0px', fontSize: '0.8rem', opacity: 0.7 }}>
              Habilita las partidas que están autorizadas para el proyecto:{' '}
              <strong style={{ color: 'var(--primary)' }}>{proyectoNombre}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              opacity: 0.5,
              padding: '0 0.5rem',
            }}
          >
            ×
          </button>
        </div>

        {/* Modal Body / Selection catalog */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            paddingRight: '0.5rem',
            marginBottom: '1.5rem',
          }}
        >
          {loading ? (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '3rem',
                gap: '0.75rem',
                color: 'var(--neutral-medium)',
              }}
            >
              <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
              <span>Cargando catálogo de partidas...</span>
            </div>
          ) : categories.length === 0 ? (
            <p style={{ textAlign: 'center', fontStyle: 'italic', opacity: 0.6 }}>
              No hay categorías de gasto configuradas.
            </p>
          ) : (
            categories.map((cat) => {
              const catPartidas = partidas.filter((p) => p.categoria_id === cat.id);
              const isBase = cat.ong_id === BASE_ONG_ID;
              const hasAllSelected =
                catPartidas.length > 0 && catPartidas.every((p) => selectedPartidas.has(p.id));

              return (
                <div
                  key={cat.id}
                  style={{
                    marginBottom: '1.25rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Category Row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: isBase ? 'rgba(30,111,168,0.04)' : 'rgba(26,122,74,0.04)',
                      padding: '0.65rem 1rem',
                      borderBottom: '1px solid var(--border-color)',
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        color: 'var(--neutral-dark)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      {isBase ? (
                        <Shield size={14} style={{ color: '#1e6fa8', opacity: 0.6 }} />
                      ) : (
                        <Sparkles size={14} style={{ color: '#1a7a4a', opacity: 0.7 }} />
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
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          opacity: 0.8,
                        }}
                      >
                        {hasAllSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
                      </button>
                    )}
                  </div>

                  {/* Partidas List */}
                  <div style={{ padding: '0.5rem 1rem' }}>
                    {catPartidas.length === 0 ? (
                      <p
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--neutral-medium)',
                          fontStyle: 'italic',
                          margin: '0.25rem 0',
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
                              padding: '0.45rem 0.5rem',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              backgroundColor: isChecked ? 'rgba(0,143,166,0.03)' : 'transparent',
                              transition: 'background 0.15s',
                              margin: '0.2rem 0',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleCheckboxChange(p.id)}
                              style={{ marginTop: '0.15rem' }}
                            />
                            <div style={{ flex: 1 }}>
                              <div
                                style={{
                                  fontSize: '0.82rem',
                                  fontWeight: 500,
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
                                    fontSize: '0.72rem',
                                    opacity: 0.6,
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
            })
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            borderTop: '1px solid var(--border-color)',
            paddingTop: '1rem',
          }}
        >
          <button
            onClick={onClose}
            disabled={saving}
            className="btn btn-outline"
            style={{ fontSize: '0.88rem' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="btn btn-primary"
            style={{
              fontSize: '0.88rem',
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
            Guardar Configuración
          </button>
        </div>
      </div>
    </div>
  );
};
