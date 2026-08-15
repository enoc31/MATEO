import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { Ong } from '../../services/api';
import { Plus, Edit2, Check, X, Image as ImageIcon } from 'lucide-react';

export const SaasOngs: React.FC = () => {
  const [ongs, setOngs] = useState<Ong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form States for creating/editing
  const [isEditingId, setIsEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('');

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLogoUrl, setNewLogoUrl] = useState('');

  // Admin user fields
  const [adminNombre, setAdminNombre] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const fetchOngs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getOngs();
      setOngs(data);
    } catch (err: any) {
      setError(err.message || 'Error al obtener organizaciones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOngs();
  }, []);

  const handleCreateOng = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const createdOng = await api.createOng(newName.trim(), newLogoUrl.trim() || null);

      // Si se ingresaron datos para el Administrador inicial, crearlo de inmediato
      if (adminEmail.trim() && adminPassword.trim()) {
        try {
          await api.adminCreateUser({
            email: adminEmail.trim(),
            password: adminPassword,
            nombre_completo: adminNombre.trim() || 'Administrador Principal',
            rol: 'administrador',
            ong_id: createdOng.id,
          });
          setSuccess(
            `Organización "${newName}" y Administrador "${adminNombre || adminEmail}" creados exitosamente. Credenciales enviadas por correo.`,
          );
        } catch (userErr: any) {
          console.error('Error creating admin user:', userErr);
          setSuccess(
            `Organización "${newName}" creada, pero hubo un detalle al crear el administrador: ${userErr.message}`,
          );
        }
      } else {
        setSuccess(`Organización "${newName}" creada exitosamente.`);
      }

      setNewName('');
      setNewLogoUrl('');
      setAdminNombre('');
      setAdminEmail('');
      setAdminPassword('');
      setShowCreateForm(false);
      await fetchOngs();
    } catch (err: any) {
      setError(err.message || 'Error al crear la organización.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (ong: Ong) => {
    setIsEditingId(ong.id);
    setEditName(ong.nombre);
    setEditLogoUrl(ong.logo_url || '');
  };

  const handleCancelEdit = () => {
    setIsEditingId(null);
    setEditName('');
    setEditLogoUrl('');
  };

  const handleUpdateOng = async (id: string) => {
    if (!editName.trim()) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await api.updateOng(id, {
        nombre: editName.trim(),
        logo_url: editLogoUrl.trim() || null,
      });
      setSuccess('Organización actualizada exitosamente.');
      setIsEditingId(null);
      await fetchOngs();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la organización.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: '#1e293b',
              marginBottom: '0.25rem',
            }}
          >
            Gestión de ONGs e Iglesias
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.8rem' }}>
            Registra y edita la información básica de las ONGs e Iglesias del sistema.
          </p>
        </div>

        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{
            backgroundColor: '#0d9488',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '0.6rem 1.2rem',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          {showCreateForm ? <X size={16} /> : <Plus size={16} />}
          {showCreateForm ? 'Cancelar' : 'Registrar ONG / Iglesia'}
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: '0.8rem 1rem',
            borderRadius: '8px',
            backgroundColor: '#fef2f2',
            color: '#991b1b',
            fontSize: '0.8rem',
            marginBottom: '1.5rem',
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            padding: '0.8rem 1rem',
            borderRadius: '8px',
            backgroundColor: '#ecfdf5',
            color: '#065f46',
            fontSize: '0.8rem',
            marginBottom: '1.5rem',
          }}
        >
          {success}
        </div>
      )}

      {/* Create Form Card */}
      {showCreateForm && (
        <div
          style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            marginBottom: '2rem',
            border: '1px solid #e2e8f0',
          }}
        >
          <h3
            style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem' }}
          >
            Nueva Organización / Iglesia
          </h3>
          <form
            onSubmit={handleCreateOng}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#64748b',
                  marginBottom: '0.4rem',
                }}
              >
                Nombre de la ONG / Iglesia
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej. Fundación Manos Unidas / Iglesia Vida Nueva"
                style={{
                  width: '100%',
                  padding: '0.6rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#64748b',
                  marginBottom: '0.4rem',
                }}
              >
                URL del Logotipo (Imagen Pública)
              </label>
              <input
                type="url"
                value={newLogoUrl}
                onChange={(e) => setNewLogoUrl(e.target.value)}
                placeholder="https://ejemplo.com/logo.png"
                style={{
                  width: '100%',
                  padding: '0.6rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            {/* Sección: Administrador Principal Inicial */}
            <div
              style={{
                gridColumn: 'span 2',
                marginTop: '0.5rem',
                paddingTop: '1rem',
                borderTop: '1px dashed #cbd5e1',
              }}
            >
              <h4
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  color: '#0d9488',
                  marginBottom: '0.8rem',
                }}
              >
                👤 Administrador Inicial (Envío automático de credenciales por correo)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#64748b',
                      marginBottom: '0.4rem',
                    }}
                  >
                    Nombre del Administrador
                  </label>
                  <input
                    type="text"
                    value={adminNombre}
                    onChange={(e) => setAdminNombre(e.target.value)}
                    placeholder="Ej. Carlos Mendoza"
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#64748b',
                      marginBottom: '0.4rem',
                    }}
                  >
                    Correo del Administrador
                  </label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@organizacion.com"
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#64748b',
                      marginBottom: '0.4rem',
                    }}
                  >
                    Contraseña Inicial
                  </label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
              </div>
            </div>

            <div
              style={{
                gridColumn: 'span 2',
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: '0.5rem',
              }}
            >
              <button
                type="submit"
                disabled={submitting}
                style={{
                  backgroundColor: '#0d9488',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.6rem 1.5rem',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                {submitting ? 'Registrando...' : 'Registrar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid of registered ONGs */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          Cargando organizaciones e iglesias...
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {ongs.map((ong) => {
            const isEditing = isEditingId === ong.id;
            return (
              <div
                key={ong.id}
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  padding: '1.25rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                {/* Logo and details */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#f8fafc',
                      overflow: 'hidden',
                    }}
                  >
                    {ong.logo_url ? (
                      <img
                        src={ong.logo_url}
                        alt={`Logo ${ong.nombre}`}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <ImageIcon size={24} color="#94a3b8" />
                    )}
                  </div>

                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.4rem',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                        }}
                      />
                    ) : (
                      <h4
                        style={{
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          color: '#1e293b',
                          margin: 0,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {ong.nombre}
                      </h4>
                    )}
                    <span
                      style={{
                        fontSize: '0.65rem',
                        color: '#94a3b8',
                        display: 'block',
                        marginTop: '4px',
                      }}
                    >
                      ID: {ong.id.substr(0, 8)}...
                    </span>
                  </div>
                </div>

                {/* Edit Fields (expanded when editing) */}
                {isEditing && (
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: '#64748b',
                        marginBottom: '0.2rem',
                      }}
                    >
                      URL del Logo
                    </label>
                    <input
                      type="url"
                      value={editLogoUrl}
                      onChange={(e) => setEditLogoUrl(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.4rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                      }}
                    />
                  </div>
                )}

                {/* Actions */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '0.75rem',
                    marginTop: 'auto',
                  }}
                >
                  {isEditing ? (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={handleCancelEdit}
                        disabled={submitting}
                        style={{
                          background: 'none',
                          border: '1px solid #cbd5e1',
                          color: '#64748b',
                          borderRadius: '4px',
                          padding: '0.3rem 0.6rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.2rem',
                          fontSize: '0.75rem',
                        }}
                      >
                        <X size={12} /> Cancelar
                      </button>
                      <button
                        onClick={() => handleUpdateOng(ong.id)}
                        disabled={submitting}
                        style={{
                          backgroundColor: '#0d9488',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '0.3rem 0.6rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.2rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        <Check size={12} /> Guardar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleStartEdit(ong)}
                      style={{
                        background: 'none',
                        border: '1px solid #e2e8f0',
                        color: '#475569',
                        borderRadius: '4px',
                        padding: '0.3rem 0.6rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8fafc';
                        e.currentTarget.style.borderColor = '#cbd5e1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'none';
                        e.currentTarget.style.borderColor = '#e2e8f0';
                      }}
                    >
                      <Edit2 size={12} /> Editar Entidad
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
