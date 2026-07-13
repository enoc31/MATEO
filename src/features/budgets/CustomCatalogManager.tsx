import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderOpen,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Tag,
  Shield,
  Sparkles,
  AlertCircle,
  X,
  Check,
  Loader,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../components/NotificationProvider';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Category {
  id: string;
  nombre: string;
  descripcion?: string;
  ong_id?: string;
}

interface Partida {
  id: string;
  categoria_id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  ong_id?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const BASE_ONG_ID = '11111111-1111-1111-1111-111111111111';

// ─── Sub-components ──────────────────────────────────────────────────────────

interface InlineFormProps {
  placeholder: string;
  onSave: (values: { nombre: string; codigo?: string; descripcion?: string }) => Promise<void>;
  onCancel: () => void;
  showCodigo?: boolean;
  codigoPlaceholder?: string;
}

const InlineForm: React.FC<InlineFormProps> = ({
  placeholder,
  onSave,
  onCancel,
  showCodigo = false,
  codigoPlaceholder = 'Ej: 1.P1',
}) => {
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    if (showCodigo && !codigo.trim()) {
      setError('El código es obligatorio');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        nombre: nombre.trim(),
        codigo: codigo.trim(),
        descripcion: descripcion.trim(),
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al guardar';
      // Friendly error for unique constraint
      if (msg.includes('unique') || msg.includes('duplicate')) {
        setError('Ya existe un elemento con ese nombre o código en tu organización.');
      } else {
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        background: 'rgba(0,143,166,0.04)',
        border: '1px dashed var(--primary)',
        borderRadius: 'var(--radius-md)',
        padding: '1rem',
        marginTop: '0.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
      }}
    >
      {showCodigo && (
        <input
          className="form-input"
          style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
          placeholder={codigoPlaceholder}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          maxLength={20}
        />
      )}
      <input
        className="form-input"
        style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
        placeholder={placeholder}
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        autoFocus
      />
      <input
        className="form-input"
        style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem', opacity: 0.8 }}
        placeholder="Descripción (opcional)"
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
      />
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--danger)',
            fontSize: '0.8rem',
          }}
        >
          <AlertCircle size={14} />
          {error}
        </div>
      )}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary"
          style={{
            fontSize: '0.8rem',
            padding: '0.4rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          {saving ? (
            <Loader size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
          ) : (
            <Check size={13} />
          )}
          Guardar
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="btn btn-outline"
          style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
};

interface PartidaBadgeProps {
  isBase: boolean;
}

const PartidaBadge: React.FC<PartidaBadgeProps> = ({ isBase }) =>
  isBase ? (
    <span
      style={{
        fontSize: '0.65rem',
        fontWeight: 700,
        letterSpacing: '0.06em',
        color: '#1e6fa8',
        background: 'rgba(30,111,168,0.1)',
        border: '1px solid rgba(30,111,168,0.25)',
        borderRadius: '20px',
        padding: '2px 8px',
        textTransform: 'uppercase',
      }}
    >
      UNDG
    </span>
  ) : (
    <span
      style={{
        fontSize: '0.65rem',
        fontWeight: 700,
        letterSpacing: '0.06em',
        color: '#1a7a4a',
        background: 'rgba(26,122,74,0.1)',
        border: '1px solid rgba(26,122,74,0.25)',
        borderRadius: '20px',
        padding: '2px 8px',
        textTransform: 'uppercase',
        display: 'flex',
        alignItems: 'center',
        gap: '3px',
      }}
    >
      <Sparkles size={9} />
      Custom
    </span>
  );

// ─── Main Component ───────────────────────────────────────────────────────────

export const CustomCatalogManager: React.FC = () => {
  const { profile } = useAuth();
  const { addNotification } = useNotifications();

  const [categories, setCategories] = useState<Category[]>([]);
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  const [addingCat, setAddingCat] = useState(false);
  const [addingPartidaFor, setAddingPartidaFor] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const ongId = profile?.ong_id ?? '';
  const canEdit = ['administrador', 'director'].includes(profile?.rol ?? '');

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { categories: cats, partidas: parts } = await api.getCatalog();
      setCategories(cats);
      setPartidas(parts);
      // Expand all categories by default
      setExpandedCats(new Set(cats.map((c: Category) => c.id)));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al cargar el catálogo';
      addNotification(msg, 'warning');
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const toggleCat = (id: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddCategory = async (values: { nombre: string; descripcion?: string }) => {
    await api.createCategoria({ nombre: values.nombre, descripcion: values.descripcion }, ongId);
    addNotification('Categoría creada exitosamente', 'success');
    setAddingCat(false);
    await fetchData();
  };

  const handleDeleteCategory = async (cat: Category) => {
    const partidasInCat = partidas.filter((p) => p.categoria_id === cat.id && p.ong_id === ongId);
    if (partidasInCat.length > 0) {
      addNotification(
        `No se puede eliminar la categoría "${cat.nombre}" porque tiene ${partidasInCat.length} partida(s) asociada(s). Elimina primero las partidas.`,
        'warning',
      );
      return;
    }
    if (
      !window.confirm(`¿Eliminar la categoría "${cat.nombre}"? Esta acción no se puede deshacer.`)
    )
      return;
    setDeletingId(cat.id);
    try {
      await api.deleteCategoria(cat.id);
      addNotification('Categoría eliminada', 'success');
      await fetchData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al eliminar';
      addNotification(msg, 'warning');
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddPartida = async (
    categoriaId: string,
    values: { nombre: string; codigo?: string; descripcion?: string },
  ) => {
    if (!values.codigo) throw new Error('El código es requerido');
    await api.createPartida(
      {
        categoria_id: categoriaId,
        codigo: values.codigo,
        nombre: values.nombre,
        descripcion: values.descripcion,
      },
      ongId,
    );
    addNotification('Partida creada exitosamente', 'success');
    setAddingPartidaFor(null);
    await fetchData();
  };

  const handleDeletePartida = async (partida: Partida) => {
    if (
      !window.confirm(
        `¿Eliminar la partida "${partida.nombre}"?\n\nSi tiene presupuestos o comprobantes asociados, la eliminación fallará.`,
      )
    )
      return;
    setDeletingId(partida.id);
    try {
      await api.deletePartida(partida.id);
      addNotification('Partida eliminada', 'success');
      await fetchData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al eliminar';
      if (msg.includes('foreign key') || msg.includes('violates')) {
        addNotification(
          'No se puede eliminar: esta partida tiene presupuestos o comprobantes activos.',
          'warning',
        );
      } else {
        addNotification(msg, 'warning');
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleRestoreCatalog = async () => {
    if (
      !window.confirm(
        '¿Deseas restaurar las categorías y partidas base del catálogo estándar UNDG por defecto? Esto recuperará cualquier elemento base que se haya eliminado.',
      )
    )
      return;
    setRestoring(true);
    try {
      await api.restoreDefaultCatalog();
      addNotification('Catálogo base UNDG restaurado correctamente', 'success');
      await fetchData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al restaurar el catálogo';
      addNotification(msg, 'warning');
    } finally {
      setRestoring(false);
    }
  };

  // ── Group data ────────────────────────────────────────────────────────────

  // Separate base categories from custom ones
  const baseCategories = categories.filter((c) => c.ong_id === BASE_ONG_ID);
  const customCategories = categories.filter((c) => c.ong_id === ongId);

  const getPartidasForCategory = (catId: string) =>
    partidas.filter((p) => p.categoria_id === catId);

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
          gap: '1rem',
          color: 'var(--neutral-medium)',
        }}
      >
        <Loader size={28} style={{ animation: 'spin 1s linear infinite' }} />
        <span>Cargando catálogo...</span>
      </div>
    );
  }

  const renderPartidaRow = (partida: Partida) => {
    const isBase = partida.ong_id === BASE_ONG_ID;
    const isOwn = partida.ong_id === ongId;
    const isDeleting = deletingId === partida.id;

    return (
      <div
        key={partida.id}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.55rem 0.75rem',
          borderRadius: 'var(--radius-sm)',
          background: isBase ? 'transparent' : 'rgba(26,122,74,0.03)',
          border: isBase ? 'none' : '1px solid rgba(26,122,74,0.1)',
          marginBottom: '0.3rem',
          transition: 'background 0.15s',
        }}
      >
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: isBase ? 'var(--neutral-medium)' : 'var(--primary)',
            minWidth: '38px',
          }}
        >
          {partida.codigo}
        </span>
        <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--neutral-dark)' }}>
          {partida.nombre}
          {partida.descripcion && (
            <span
              style={{ display: 'block', fontSize: '0.75rem', opacity: 0.55, marginTop: '1px' }}
            >
              {partida.descripcion}
            </span>
          )}
        </span>
        <PartidaBadge isBase={isBase} />
        {canEdit && isOwn && (
          <button
            onClick={() => handleDeletePartida(partida)}
            disabled={isDeleting}
            title="Eliminar partida"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              color: 'var(--danger)',
              opacity: isDeleting ? 0.4 : 0.6,
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              transition: 'opacity 0.15s',
            }}
          >
            {isDeleting ? (
              <Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
            ) : (
              <Trash2 size={14} />
            )}
          </button>
        )}
      </div>
    );
  };

  const renderCategoryBlock = (cat: Category, isBase: boolean) => {
    const isExpanded = expandedCats.has(cat.id);
    const catPartidas = getPartidasForCategory(cat.id);
    const isDeleting = deletingId === cat.id;
    const isAddingHere = addingPartidaFor === cat.id;
    const isOwn = cat.ong_id === ongId;

    return (
      <div
        key={cat.id}
        className="card"
        style={{
          padding: 0,
          overflow: 'hidden',
          border: isBase ? '1px solid var(--border-color)' : '1px solid rgba(26,122,74,0.25)',
          marginBottom: '0.75rem',
        }}
      >
        {/* Category Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.85rem 1rem',
            cursor: 'pointer',
            userSelect: 'none',
            background: isBase ? 'rgba(30,111,168,0.04)' : 'rgba(26,122,74,0.05)',
            borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none',
          }}
          onClick={() => toggleCat(cat.id)}
        >
          {isExpanded ? (
            <ChevronDown size={16} style={{ color: 'var(--neutral-medium)', flexShrink: 0 }} />
          ) : (
            <ChevronRight size={16} style={{ color: 'var(--neutral-medium)', flexShrink: 0 }} />
          )}
          <FolderOpen size={17} style={{ color: isBase ? '#1e6fa8' : '#1a7a4a', flexShrink: 0 }} />
          <span
            style={{ flex: 1, fontWeight: 700, fontSize: '0.9rem', color: 'var(--neutral-dark)' }}
          >
            {cat.nombre}
          </span>
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--neutral-medium)',
              marginRight: '0.5rem',
            }}
          >
            {catPartidas.length} partida{catPartidas.length !== 1 ? 's' : ''}
          </span>
          {isBase ? (
            <span title="Categoría base UNDG — no editable">
              <Shield size={14} style={{ color: '#1e6fa8', opacity: 0.6 }} />
            </span>
          ) : (
            <Sparkles size={14} style={{ color: '#1a7a4a', opacity: 0.7 }} />
          )}
          {canEdit && isOwn && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteCategory(cat);
              }}
              disabled={isDeleting}
              title="Eliminar categoría"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: isDeleting ? 'not-allowed' : 'pointer',
                color: 'var(--danger)',
                opacity: isDeleting ? 0.4 : 0.55,
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                marginLeft: '0.25rem',
              }}
            >
              {isDeleting ? (
                <Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
              ) : (
                <Trash2 size={14} />
              )}
            </button>
          )}
        </div>

        {/* Partidas List */}
        {isExpanded && (
          <div style={{ padding: '0.75rem 1rem' }}>
            {catPartidas.length === 0 && !isAddingHere && (
              <p
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--neutral-medium)',
                  fontStyle: 'italic',
                  margin: '0.25rem 0 0.5rem',
                }}
              >
                No hay partidas en esta categoría.
              </p>
            )}
            {catPartidas.map(renderPartidaRow)}

            {/* Inline add partida form */}
            {isAddingHere && (
              <InlineForm
                placeholder="Nombre de la partida"
                showCodigo
                codigoPlaceholder={`Ej: ${cat.nombre.charAt(0)}.P${catPartidas.filter((p) => p.ong_id === ongId).length + 1}`}
                onSave={(values) => handleAddPartida(cat.id, values)}
                onCancel={() => setAddingPartidaFor(null)}
              />
            )}

            {/* Add Partida Button */}
            {canEdit && !isAddingHere && (
              <button
                onClick={() => setAddingPartidaFor(cat.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  marginTop: catPartidas.length > 0 ? '0.5rem' : '0',
                  fontSize: '0.8rem',
                  color: 'var(--primary)',
                  background: 'transparent',
                  border: '1px dashed rgba(0,143,166,0.4)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.35rem 0.75rem',
                  cursor: 'pointer',
                  opacity: 0.8,
                  transition: 'opacity 0.15s, border-color 0.15s',
                }}
              >
                <Plus size={13} />
                Agregar partida
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 1rem 2rem' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.6rem',
              fontWeight: 800,
              color: 'var(--primary)',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
            }}
          >
            <Tag size={26} />
            Catálogo de Partidas
          </h1>
          <p style={{ margin: '0.4rem 0 0', fontSize: '0.9rem', color: 'var(--neutral-medium)' }}>
            Partidas estándar UNDG + categorías y partidas personalizadas de tu organización
          </p>
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={handleRestoreCatalog}
              disabled={restoring}
              className="btn btn-outline"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.88rem',
                borderColor: 'rgba(30,111,168,0.4)',
                color: '#1e6fa8',
              }}
            >
              <RefreshCw
                size={15}
                style={{ animation: restoring ? 'spin 1.2s linear infinite' : 'none' }}
              />
              {restoring ? 'Restaurando...' : 'Restaurar Catálogo UNDG'}
            </button>
            {!addingCat && (
              <button
                onClick={() => setAddingCat(true)}
                className="btn btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.88rem',
                }}
              >
                <Plus size={16} />
                Nueva Categoría
              </button>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          gap: '1.5rem',
          marginBottom: '1.5rem',
          padding: '0.75rem 1rem',
          background: 'var(--card-bg)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
          <Shield size={14} color="#1e6fa8" />
          <PartidaBadge isBase={true} />
          <span style={{ color: 'var(--neutral-medium)' }}>
            Catálogo UNDG — visible pero no editable
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
          <Sparkles size={14} color="#1a7a4a" />
          <PartidaBadge isBase={false} />
          <span style={{ color: 'var(--neutral-medium)' }}>Personalizadas por tu organización</span>
        </div>
      </div>

      {/* Add Category Form */}
      {addingCat && (
        <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
          <p style={{ margin: '0 0 0.75rem', fontWeight: 600, fontSize: '0.9rem' }}>
            Nueva categoría personalizada
          </p>
          <InlineForm
            placeholder="Nombre de la categoría (ej: Movilización Comunitaria)"
            onSave={handleAddCategory}
            onCancel={() => setAddingCat(false)}
          />
        </div>
      )}

      {/* Custom Categories Section */}
      {customCategories.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#1a7a4a',
              margin: '0 0 0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Sparkles size={13} />
            Categorías de tu organización
          </h3>
          {customCategories.map((cat) => renderCategoryBlock(cat, false))}
        </div>
      )}

      {/* Base UNDG Catalog */}
      <div>
        <h3
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#1e6fa8',
            margin: '0 0 0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <Shield size={13} />
          Catálogo estándar UNDG
        </h3>
        {baseCategories.map((cat) => renderCategoryBlock(cat, true))}
      </div>

      {!canEdit && (
        <div
          style={{
            marginTop: '1.5rem',
            padding: '0.75rem 1rem',
            background: 'rgba(255,165,0,0.08)',
            border: '1px solid rgba(255,165,0,0.3)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.83rem',
            color: '#805500',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertCircle size={15} />
          Solo los roles <strong>Administrador</strong> y <strong>Director</strong> pueden modificar
          el catálogo.
        </div>
      )}
    </div>
  );
};
