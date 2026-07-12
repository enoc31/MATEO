import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  AlertTriangle,
  Folder,
  Handshake,
  CheckCircle,
  ArrowLeft,
  Loader,
} from 'lucide-react';
import { api } from '../../services/api';
import type { Donante } from '../../services/api';
import { isSimulationMode } from '../../services/api';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../components/NotificationProvider';

const FLAG_MAP: Record<string, string> = {
  Venezuela: '🇻🇪',
  'Reino Unido': '🇬🇧',
  'Estados Unidos': '🇺🇸',
  Europa: '🇪🇺',
  Internacional: '🌐',
};

export const CreateProjectPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { addNotification } = useNotifications();

  // Form states
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0]);
  const [fechaFin, setFechaFin] = useState(
    new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
  );
  const [overheadPct, setOverheadPct] = useState<number>(7.0);
  const [donanteId, setDonanteId] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | 'nacional' | 'extranjero'>('todos');

  const [donantes, setDonantes] = useState<Donante[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // States for donor creation form
  const [showAddDonor, setShowAddDonor] = useState(false);
  const [newDonorNombre, setNewDonorNombre] = useState('');
  const [newDonorTipo, setNewDonorTipo] = useState<'nacional' | 'extranjero'>('nacional');
  const [newDonorPais, setNewDonorPais] = useState('Venezuela');
  const [newDonorContacto, setNewDonorContacto] = useState('');
  const [newDonorEmail, setNewDonorEmail] = useState('');
  const [isSavingDonor, setIsSavingDonor] = useState(false);
  const [donorError, setDonorError] = useState<string | null>(null);

  // Load donors
  useEffect(() => {
    api.getDonantes().then(setDonantes).catch(console.error);
  }, []);

  const handleSaveDonor = async () => {
    if (!newDonorNombre.trim()) {
      setDonorError('El nombre del donante es obligatorio.');
      return;
    }

    setIsSavingDonor(true);
    setDonorError(null);

    const newDonorPayload = {
      nombre: newDonorNombre.trim(),
      tipo: newDonorTipo,
      pais: newDonorTipo === 'nacional' ? 'Venezuela' : newDonorPais,
      contacto: newDonorContacto.trim() || undefined,
      email: newDonorEmail.trim() || undefined,
      activo: true,
    };

    try {
      const createdDonor = await api.createDonante(newDonorPayload, profile?.ong_id);
      setDonantes((prev) => [...prev, createdDonor]);
      setDonanteId(createdDonor.id);

      // Reset donor form
      setNewDonorNombre('');
      setNewDonorTipo('nacional');
      setNewDonorPais('Venezuela');
      setNewDonorContacto('');
      setNewDonorEmail('');
      setShowAddDonor(false);
      addNotification('Donante creado y seleccionado exitosamente', 'success');
    } catch (err: unknown) {
      console.error('Error creating donor:', err);
      const errMsg = err instanceof Error ? err.message : 'Error al registrar el donante.';
      setDonorError(errMsg);
    } finally {
      setIsSavingDonor(false);
    }
  };

  const donantesFiltrados = donantes.filter((d) =>
    tipoFiltro === 'todos' ? true : d.tipo === tipoFiltro,
  );

  const donanteSeleccionado = donantes.find((d) => d.id === donanteId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !descripcion.trim()) {
      setError('Por favor complete todos los campos obligatorios.');
      return;
    }
    if (!donanteId) {
      setError('Debe seleccionar un donante financiador para el proyecto.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const projectPayload = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      activo: true,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      overhead_porcentaje: overheadPct,
      donante_id: donanteId,
      ong_id: profile?.ong_id,
    };

    try {
      let createdId = '';
      if (!isSimulationMode) {
        const { data, error: dbError } = await supabase
          .from('proyectos')
          .insert([projectPayload])
          .select()
          .single();
        if (dbError) throw dbError;
        createdId = data.id;
      } else {
        const localProjects = JSON.parse(localStorage.getItem('cnbv_projects') || '[]');
        const newProj = { ...projectPayload, id: `proj-${Date.now()}` };
        localProjects.push(newProj);
        localStorage.setItem('cnbv_projects', JSON.stringify(localProjects));
        createdId = newProj.id;
      }

      addNotification('Proyecto registrado con éxito', 'success');
      // Redirect to budget wizard for configuring budgets on this project
      navigate(`/app/budget-wizard?projectId=${createdId}`);
    } catch (err: unknown) {
      console.error('Error creating project:', err);
      const errMsg =
        err instanceof Error ? err.message : 'Error al registrar el proyecto en el sistema.';
      setError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1080px', margin: '0 auto' }}>
      {/* Volver */}
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
          marginBottom: '1.5rem',
        }}
      >
        <ArrowLeft size={16} />
        Volver a Presupuestos
      </button>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
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
          <Folder size={28} />
          Registrar Nuevo Proyecto
        </h2>
        <p style={{ margin: '0.35rem 0px 0px', fontSize: '0.95rem', opacity: 0.7 }}>
          Configure la información general del proyecto y asocie su fuente de financiamiento.
        </p>
      </div>

      {error && (
        <div
          style={{
            background: 'var(--danger)',
            color: '#fff',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            fontSize: '0.9rem',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={18} /> {error}
          </span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
            gap: '2rem',
            alignItems: 'start',
          }}
        >
          {/* COLUMNA IZQUIERDA: DATOS GENERALES */}
          <div
            className="card"
            style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
          >
            <h3
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: 'var(--primary)',
                textTransform: 'uppercase',
                margin: '0px 0px 0.5rem',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Folder size={18} /> Datos del Proyecto
            </h3>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>
                Nombre del Proyecto *
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: Operación Frontera Zulia 2026"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>
                Descripción del Alcance *
              </label>
              <textarea
                className="form-input"
                rows={4}
                placeholder="Describa el objetivo de la intervención y la población beneficiaria..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                required
                disabled={isSubmitting}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Fecha Fin
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 600 }}>
                % Gastos Indirectos (Overhead)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="25"
                  className="form-input"
                  value={overheadPct}
                  onChange={(e) => setOverheadPct(Math.max(0, parseFloat(e.target.value) || 0))}
                  disabled={isSubmitting}
                  style={{ width: '100px' }}
                />
                <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                  % sobre costos directos (UNDG base)
                </span>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: FINANCIAMIENTO / DONANTE */}
          <div
            className="card"
            style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                margin: '0px 0px 0.5rem',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '0.5rem',
              }}
            >
              <h3
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  color: 'var(--primary)',
                  textTransform: 'uppercase',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Handshake size={18} /> Fuente de Financiamiento
              </h3>

              {!showAddDonor && (
                <button
                  type="button"
                  onClick={() => setShowAddDonor(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--primary)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <Plus size={14} /> + Nuevo Donante
                </button>
              )}
            </div>

            {/* DONOR CREATION INLINE FORM */}
            {showAddDonor ? (
              <div
                style={{
                  backgroundColor: 'rgba(var(--primary-rgb), 0.02)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                <h4
                  style={{
                    margin: 0,
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: 'var(--primary)',
                  }}
                >
                  Registrar Donante / Financiador
                </h4>

                {donorError && (
                  <div style={{ color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 600 }}>
                    ⚠️ {donorError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>
                    Nombre del Donante *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej: ACNUR, USAID, Donante Privado"
                    value={newDonorNombre}
                    onChange={(e) => setNewDonorNombre(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>
                      Tipo
                    </label>
                    <select
                      className="form-input form-select"
                      value={newDonorTipo}
                      onChange={(e) => setNewDonorTipo(e.target.value as 'nacional' | 'extranjero')}
                    >
                      <option value="nacional">Nacional</option>
                      <option value="extranjero">Extranjero</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>
                      País de Origen
                    </label>
                    {newDonorTipo === 'nacional' ? (
                      <input
                        type="text"
                        className="form-input"
                        value="Venezuela"
                        readOnly
                        disabled
                      />
                    ) : (
                      <select
                        className="form-input form-select"
                        value={newDonorPais}
                        onChange={(e) => setNewDonorPais(e.target.value)}
                      >
                        <option value="Estados Unidos">Estados Unidos</option>
                        <option value="Reino Unido">Reino Unido</option>
                        <option value="Europa">Europa / Unión Europea</option>
                        <option value="Internacional">Multilateral / Internacional</option>
                      </select>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>
                      Persona de Contacto
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej: Lic. María Pérez"
                      value={newDonorContacto}
                      onChange={(e) => setNewDonorContacto(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>
                      Correo electrónico
                    </label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="donante@example.org"
                      value={newDonorEmail}
                      onChange={(e) => setNewDonorEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '0.5rem',
                    marginTop: '0.25rem',
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                    onClick={() => setShowAddDonor(false)}
                    disabled={isSavingDonor}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                    onClick={handleSaveDonor}
                    disabled={isSavingDonor}
                  >
                    {isSavingDonor ? 'Guardando...' : 'Guardar Donante'}
                  </button>
                </div>
              </div>
            ) : (
              /* SELECTOR DE DONANTES */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Filtrar:</span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {(['todos', 'nacional', 'extranjero'] as const).map((filtro) => (
                      <button
                        key={filtro}
                        type="button"
                        className={`btn ${tipoFiltro === filtro ? 'btn-primary' : 'btn-outline'}`}
                        style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem' }}
                        onClick={() => setTipoFiltro(filtro)}
                      >
                        {filtro.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Seleccione Donante / Financiador *
                  </label>
                  <select
                    className="form-input form-select"
                    value={donanteId}
                    onChange={(e) => setDonanteId(e.target.value)}
                    required
                    disabled={isSubmitting}
                  >
                    <option value="">-- Seleccionar Financiador --</option>
                    {donantesFiltrados.map((d) => {
                      const flag = (FLAG_MAP as Record<string, string>)[d.pais || ''] || '🏳️';
                      return (
                        <option key={d.id} value={d.id}>
                          {flag} {d.nombre} ({d.tipo === 'nacional' ? 'Nac' : 'Ext'})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {donanteSeleccionado && (
                  <div
                    style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '1rem',
                      backgroundColor: 'rgba(0,0,0,0.01)',
                      fontSize: '0.82rem',
                    }}
                  >
                    <h4
                      style={{ margin: '0 0 0.5rem 0', fontWeight: 700, color: 'var(--primary)' }}
                    >
                      Detalles de la Fuente:
                    </h4>
                    <div>
                      <strong>País:</strong> {donanteSeleccionado.pais}{' '}
                      {(FLAG_MAP as Record<string, string>)[donanteSeleccionado.pais || '']}
                    </div>
                    {donanteSeleccionado.contacto && (
                      <div style={{ marginTop: '0.25rem' }}>
                        <strong>Contacto:</strong> {donanteSeleccionado.contacto}
                      </div>
                    )}
                    {donanteSeleccionado.email && (
                      <div style={{ marginTop: '0.25rem' }}>
                        <strong>Email:</strong> {donanteSeleccionado.email}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '1rem',
            borderTop: '1px solid var(--border-color)',
            paddingTop: '1.5rem',
            marginTop: '1rem',
          }}
        >
          <button
            type="button"
            className="btn btn-outline"
            style={{ padding: '0.75rem 2rem' }}
            onClick={() => navigate('/app/budgets')}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            style={{
              padding: '0.75rem 2.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                Registrando...
              </>
            ) : (
              <>
                <CheckCircle size={18} />
                Registrar Proyecto
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
