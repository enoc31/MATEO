import React, { useState } from 'react';
import { Check, Pencil, Plus, Power, Tag, Trash2, X } from 'lucide-react';
import { financeApi, type CategoriaIngreso } from '../../services/financeApi';

export interface IncomeCategoriesTabProps {
  ongId: string;
  categories: CategoriaIngreso[];
  onRefresh: () => Promise<void>;
  onFeedback: (msg: string, type?: 'success' | 'error') => void;
}

export const IncomeCategoriesTab: React.FC<IncomeCategoriesTabProps> = ({
  ongId,
  categories,
  onRefresh,
  onFeedback,
}) => {
  const [newNombre, setNewNombre] = useState('');
  const [newDescripcion, setNewDescripcion] = useState('');
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const activeCount = categories.filter((c) => c.activa).length;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newNombre.trim();
    if (!cleanName) {
      onFeedback('Ingresa un nombre para la nueva categoría de ingreso.', 'error');
      return;
    }

    setCreating(true);
    try {
      await financeApi.saveCategoriaIngreso({
        ong_id: ongId,
        nombre: cleanName,
        descripcion: newDescripcion.trim() || null,
        activa: true,
        orden: categories.length + 1,
      });
      setNewNombre('');
      setNewDescripcion('');
      await onRefresh();
      onFeedback(`Categoría "${cleanName}" creada correctamente.`, 'success');
    } catch (err) {
      console.error('Error creando categoría de ingreso:', err);
      const msg = err instanceof Error ? err.message : 'No se pudo crear la categoría.';
      onFeedback(msg, 'error');
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (cat: CategoriaIngreso) => {
    setEditingId(cat.id);
    setEditNombre(cat.nombre);
    setEditDescripcion(cat.descripcion || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditNombre('');
    setEditDescripcion('');
  };

  const handleSaveEdit = async (cat: CategoriaIngreso) => {
    const cleanName = editNombre.trim();
    if (!cleanName) {
      onFeedback('El nombre de la categoría no puede estar vacío.', 'error');
      return;
    }

    setBusyId(cat.id);
    try {
      await financeApi.saveCategoriaIngreso({
        id: cat.id,
        ong_id: ongId,
        slug: cat.slug,
        nombre: cleanName,
        descripcion: editDescripcion.trim() || null,
        activa: cat.activa,
        orden: cat.orden,
      });
      cancelEdit();
      await onRefresh();
      onFeedback(`Categoría actualizada a "${cleanName}".`, 'success');
    } catch (err) {
      console.error('Error actualizando categoría de ingreso:', err);
      const msg = err instanceof Error ? err.message : 'No se pudo actualizar la categoría.';
      onFeedback(msg, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleActive = async (cat: CategoriaIngreso) => {
    if (cat.activa && activeCount <= 1) {
      onFeedback('Debe permanecer al menos una categoría de ingreso activa.', 'error');
      return;
    }

    setBusyId(cat.id);
    try {
      await financeApi.saveCategoriaIngreso({
        id: cat.id,
        ong_id: ongId,
        slug: cat.slug,
        nombre: cat.nombre,
        descripcion: cat.descripcion,
        activa: !cat.activa,
        orden: cat.orden,
      });
      await onRefresh();
      onFeedback(
        !cat.activa
          ? `Categoría "${cat.nombre}" activada.`
          : `Categoría "${cat.nombre}" desactivada.`,
        'success',
      );
    } catch (err) {
      console.error('Error cambiando estado de categoría:', err);
      const msg = err instanceof Error ? err.message : 'No se pudo cambiar el estado.';
      onFeedback(msg, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (cat: CategoriaIngreso) => {
    if (cat.isDefault) {
      onFeedback(
        'Las categorías base no se eliminan; puedes desactivarlas o renombrarlas.',
        'error',
      );
      return;
    }

    setBusyId(cat.id);
    try {
      await financeApi.deleteCategoriaIngreso(cat.id);
      await onRefresh();
      onFeedback(`Categoría "${cat.nombre}" eliminada.`, 'success');
    } catch (err) {
      console.error('Error eliminando categoría:', err);
      const msg = err instanceof Error ? err.message : 'No se pudo eliminar la categoría.';
      onFeedback(msg, 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }} data-testid="income-categories-tab">
      <div className="card" style={{ padding: '1.35rem', display: 'grid', gap: '1rem' }}>
        <div>
          <h3
            style={{
              margin: 0,
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
            }}
          >
            <Tag size={18} /> Nueva Categoría de Ingreso
          </h3>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
            Crea categorías propias para clasificar los aportes de tu organización. Las categorías
            activas estarán disponibles en el registro interno, arqueo de efectivo, formulario
            público, tabla de ingresos y Actas PDF.
          </p>
        </div>

        <form
          onSubmit={handleCreate}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '0.75rem',
            alignItems: 'end',
          }}
        >
          <div>
            <label htmlFor="new-cat-nombre" className="form-field-label">
              Nombre de la categoría *
            </label>
            <input
              id="new-cat-nombre"
              type="text"
              className="form-input"
              placeholder="Ej: Fondo Juvenil, Construcción, Campamento"
              value={newNombre}
              onChange={(e) => setNewNombre(e.target.value)}
              maxLength={80}
              required
              disabled={creating}
            />
          </div>

          <div>
            <label htmlFor="new-cat-desc" className="form-field-label">
              Descripción (opcional)
            </label>
            <input
              id="new-cat-desc"
              type="text"
              className="form-input"
              placeholder="Ej: Aportes destinados a actividades de jóvenes"
              value={newDescripcion}
              onChange={(e) => setNewDescripcion(e.target.value)}
              maxLength={160}
              disabled={creating}
            />
          </div>

          <div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={creating}
              style={{
                width: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
              }}
            >
              <Plus size={16} /> {creating ? 'Creando...' : 'Agregar Categoría'}
            </button>
          </div>
        </form>
      </div>

      <div className="card" style={{ padding: '1.35rem', display: 'grid', gap: '0.85rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.05rem' }}>
            Categorías Configuradas ({categories.length})
          </h3>
          <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
            Activas: <strong>{activeCount}</strong>
          </span>
        </div>

        <div style={{ display: 'grid', gap: '0.6rem' }}>
          {categories.map((cat) => {
            const isEditing = editingId === cat.id;
            const isBusy = busyId === cat.id;

            return (
              <div
                key={cat.id}
                data-testid={`income-category-row-${cat.slug}`}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  backgroundColor: cat.activa ? '#ffffff' : '#f8fafc',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                {isEditing ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: '0.6rem',
                      flex: 1,
                      minWidth: '240px',
                    }}
                  >
                    <input
                      type="text"
                      aria-label={`Editar nombre de ${cat.nombre}`}
                      className="form-input"
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                      maxLength={80}
                      disabled={isBusy}
                    />
                    <input
                      type="text"
                      aria-label={`Editar descripción de ${cat.nombre}`}
                      className="form-input"
                      placeholder="Descripción (opcional)"
                      value={editDescripcion}
                      onChange={(e) => setEditDescripcion(e.target.value)}
                      maxLength={160}
                      disabled={isBusy}
                    />
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '0.2rem', flex: 1, minWidth: '200px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <strong style={{ color: '#0f172a', fontSize: '0.94rem' }}>
                        {cat.nombre}
                      </strong>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.12rem 0.5rem',
                          borderRadius: '999px',
                          backgroundColor: cat.activa ? '#dcfce7' : '#e2e8f0',
                          color: cat.activa ? '#166534' : '#475569',
                        }}
                      >
                        {cat.activa ? 'Activa' : 'Inactiva'}
                      </span>
                      {cat.isDefault && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            padding: '0.1rem 0.45rem',
                            borderRadius: '999px',
                            backgroundColor: '#eff6ff',
                            color: '#1d4ed8',
                          }}
                        >
                          Base
                        </span>
                      )}
                    </div>
                    {cat.descripcion && (
                      <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                        {cat.descripcion}
                      </span>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => void handleSaveEdit(cat)}
                        disabled={isBusy}
                        aria-label={`Guardar cambios de ${cat.nombre}`}
                        style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem' }}
                      >
                        <Check size={14} /> Guardar
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={cancelEdit}
                        disabled={isBusy}
                        aria-label="Cancelar edición"
                        style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem' }}
                      >
                        <X size={14} /> Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => startEdit(cat)}
                        disabled={isBusy}
                        aria-label={`Editar categoría ${cat.nombre}`}
                        style={{
                          padding: '0.38rem 0.65rem',
                          fontSize: '0.8rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                        }}
                      >
                        <Pencil size={13} /> Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => void handleToggleActive(cat)}
                        disabled={isBusy}
                        aria-label={
                          cat.activa
                            ? `Desactivar categoría ${cat.nombre}`
                            : `Activar categoría ${cat.nombre}`
                        }
                        style={{
                          padding: '0.38rem 0.65rem',
                          fontSize: '0.8rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                        }}
                      >
                        <Power size={13} /> {cat.activa ? 'Desactivar' : 'Activar'}
                      </button>
                      {!cat.isDefault && (
                        <button
                          type="button"
                          onClick={() => void handleDelete(cat)}
                          disabled={isBusy}
                          aria-label={`Eliminar categoría ${cat.nombre}`}
                          style={{
                            padding: '0.42rem 0.55rem',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: '#fee2e2',
                            color: '#b91c1c',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
