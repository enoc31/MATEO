import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { Jornada, Project } from '../../services/api';
import { CalendarDays, Plus, Activity, Power, Link as LinkIcon } from 'lucide-react';
import { useNotifications } from '../../components/NotificationProvider';
import { useAuth } from '../../context/AuthContext';

export const JornadasManager: React.FC = () => {
  const { profile } = useAuth();
  const [jornadas, setJornadas] = useState<Jornada[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const { addNotification } = useNotifications();

  // Form state
  const [nombre, setNombre] = useState('');
  const [fecha, setFecha] = useState('');
  const [beneficios, setBeneficios] = useState('');
  const [proyectoId, setProyectoId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [jData, pData] = await Promise.all([api.getJornadas(), api.getProjects()]);
      setJornadas(jData);
      setProjects(pData.filter((p: Project) => p.activo));
    } catch (err) {
      console.error(err);
      addNotification('Error al cargar los datos', 'warning');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !fecha || !beneficios || !proyectoId) {
      addNotification('Todos los campos son obligatorios', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await api.createJornada(
        {
          nombre,
          fecha,
          beneficios_entregados: beneficios,
          proyecto_id: proyectoId,
          activa: true,
        },
        profile?.ong_id,
      );
      addNotification('Jornada creada exitosamente', 'success');
      setShowForm(false);
      loadData();

      // Reset form
      setNombre('');
      setFecha('');
      setBeneficios('');
      setProyectoId('');
    } catch (err) {
      console.error(err);
      addNotification('Error al crear la jornada', 'warning');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (jornada: Jornada) => {
    try {
      await api.updateJornadaStatus(jornada.id, !jornada.activa);
      setJornadas((prev) =>
        prev.map((j) => (j.id === jornada.id ? { ...j, activa: !j.activa } : j)),
      );
      addNotification(
        jornada.activa ? 'Jornada desactivada' : 'Jornada habilitada para captura',
        'success',
      );
    } catch (err) {
      console.error(err);
      addNotification('Error al cambiar el estado', 'warning');
    }
  };

  const copyLink = (jornadaId?: string) => {
    const url =
      typeof jornadaId === 'string'
        ? `${window.location.origin}/registro?jornadaId=${jornadaId}`
        : `${window.location.origin}/registro`;
    navigator.clipboard.writeText(url);
    addNotification('Enlace copiado al portapapeles', 'success');
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando jornadas...</div>;
  }

  return (
    <div style={{ padding: '1rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--neutral-dark)' }}>
            Jornadas Sociales
          </h2>
          <p style={{ color: 'var(--neutral-gray)', margin: 0 }}>
            Administra los eventos de ayuda para la captura de firmas
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {showForm ? (
            'Volver a la Lista'
          ) : (
            <>
              <Plus size={18} /> Nueva Jornada
            </>
          )}
        </button>
      </div>

      {showForm ? (
        <div className="card" style={{ padding: '2rem' }}>
          <h3
            style={{
              marginTop: 0,
              marginBottom: '1.5rem',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '1rem',
            }}
          >
            Crear Nueva Jornada
          </h3>
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1rem',
              }}
            >
              <div>
                <label className="form-label">Nombre del Evento</label>
                <input
                  type="text"
                  className="app-input"
                  placeholder="Ej. Gran Jornada Medica Sur"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="form-label">Fecha de Ejecución</label>
                <input
                  type="date"
                  className="app-input"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="form-label">Proyecto Asociado</label>
              <select
                className="app-input"
                value={proyectoId}
                onChange={(e) => setProyectoId(e.target.value)}
                required
              >
                <option value="">-- Selecciona el Proyecto --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Beneficios a Entregar (Descripción)</label>
              <textarea
                className="app-input"
                placeholder="Describe qué se entregará (Ej. 100 Mercados, 50 Kits de Medicina General...)"
                value={beneficios}
                onChange={(e) => setBeneficios(e.target.value)}
                rows={3}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Creando...' : 'Guardar y Habilitar Jornada'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {jornadas.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '3rem',
                backgroundColor: '#fff',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed var(--border-color)',
              }}
            >
              <CalendarDays
                size={48}
                color="var(--neutral-gray)"
                style={{ margin: '0 auto', opacity: 0.5, marginBottom: '1rem' }}
              />
              <h3 style={{ color: 'var(--neutral-dark)', marginBottom: '0.5rem' }}>
                No hay jornadas creadas
              </h3>
              <p style={{ color: 'var(--neutral-gray)' }}>
                Crea tu primera jornada para empezar a capturar beneficiarios.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '1rem',
              }}
            >
              {jornadas.map((j) => (
                <div
                  key={j.id}
                  className="card"
                  style={{
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary)' }}>
                      {j.nombre}
                    </h3>
                    <span
                      style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '1rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: j.activa ? '#e8f5e9' : '#ffebee',
                        color: j.activa ? '#2e7d32' : '#c62828',
                      }}
                    >
                      {j.activa ? 'ACTIVA' : 'CERRADA'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.9rem', color: 'var(--neutral-dark)' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.5rem',
                      }}
                    >
                      <CalendarDays size={16} color="var(--neutral-gray)" />
                      {new Date(j.fecha).toLocaleDateString('es-VE')}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Activity size={16} color="var(--neutral-gray)" />
                      {projects.find((p) => p.id === j.proyecto_id)?.nombre ||
                        'Proyecto Desconocido'}
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: 'var(--neutral-light)',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.85rem',
                    }}
                  >
                    <strong>Beneficios:</strong> {j.beneficios_entregados}
                  </div>

                  <div
                    style={{
                      marginTop: 'auto',
                      paddingTop: '1rem',
                      borderTop: '1px solid var(--border-color)',
                      display: 'flex',
                      gap: '0.5rem',
                    }}
                  >
                    <button
                      onClick={() => copyLink(j.id)}
                      disabled={!j.activa}
                      className="btn btn-secondary"
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        border: '1px solid var(--border-color)',
                        cursor: j.activa ? 'pointer' : 'not-allowed',
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        opacity: j.activa ? 1 : 0.5,
                      }}
                    >
                      <LinkIcon size={16} />
                      Enlace
                    </button>
                    <button
                      onClick={() => toggleStatus(j)}
                      className="btn"
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        backgroundColor: j.activa ? '#ffebee' : '#e8f5e9',
                        color: j.activa ? '#c62828' : '#2e7d32',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <Power size={16} />
                      {j.activa ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
