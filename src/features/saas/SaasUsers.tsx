import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { UserRole } from '../../context/AuthContext';
import { Search, Filter, UserCheck, ShieldAlert, Check, X, UserPlus } from 'lucide-react';
import { SkeletonTable } from '../../components/SkeletonTable';

interface UserItem {
  id: string;
  email: string;
  nombre_completo: string;
  rol: UserRole;
  aprobado: boolean;
  ong_id: string;
  created_at: string;
  ongs?: {
    nombre: string;
  } | null;
}

interface OngItem {
  id: string;
  nombre: string;
}

export const SaasUsers: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [ongs, setOngs] = useState<OngItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [ongFilter, setOngFilter] = useState('todas');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendientes' | 'aprobados'>('todos');

  // Edit States
  const [isEditingId, setIsEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('coordinador');
  const [editOngId, setEditOngId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Create User Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newNombre, setNewNombre] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('administrador');
  const [newOngId, setNewOngId] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersData, ongsData] = await Promise.all([api.getUsers(), api.getOngs()]);
      setUsers(usersData);
      setOngs(ongsData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido.';
      setError(message || 'Error al cargar usuarios o ONGs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleApproval = async (user: UserItem) => {
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const nextApprovalState = !user.aprobado;
      await api.updateUserProfile(user.id, { aprobado: nextApprovalState });
      setSuccess(`Usuario ${nextApprovalState ? 'aprobado' : 'suspendido'} correctamente.`);
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido.';
      setError(message || 'Error al cambiar estado de aprobación.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (user: UserItem) => {
    setIsEditingId(user.id);
    setEditRole(user.rol);
    setEditOngId(user.ong_id || (ongs.length > 0 ? ongs[0].id : ''));
  };

  const handleCancelEdit = () => {
    setIsEditingId(null);
  };

  const handleSaveUserChanges = async (userId: string) => {
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      await api.updateUserProfile(userId, {
        rol: editRole,
        ong_id: editOngId,
      });
      setSuccess('Usuario actualizado correctamente.');
      setIsEditingId(null);
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido.';
      setError(message || 'Error al actualizar usuario.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (user: UserItem) => {
    if (user.rol === 'super_admin') {
      setError('No puedes eliminar al Super Administrador principal.');
      return;
    }

    const confirmDelete = window.confirm(
      `¿Estás seguro de que deseas eliminar permanentemente a ${user.nombre_completo} (${user.email})? \n\nEsta acción borrará por completo sus credenciales de acceso de Supabase y todo su historial de la plataforma de forma irreversible.`,
    );
    if (!confirmDelete) return;

    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      await api.adminDeleteUser(user.id);
      setSuccess(`Usuario ${user.nombre_completo} eliminado correctamente.`);
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido.';
      setError(message || 'Error al eliminar usuario.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtering Logic
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesOng = ongFilter === 'todas' || u.ong_id === ongFilter;

    const matchesStatus =
      statusFilter === 'todos' ||
      (statusFilter === 'aprobados' && u.aprobado) ||
      (statusFilter === 'pendientes' && !u.aprobado);

    return matchesSearch && matchesOng && matchesStatus;
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!newEmail.trim() || !newPassword.trim() || !newNombre.trim()) {
      setError('Por favor completa todos los campos requeridos.');
      return;
    }
    const targetOng = newOngId || (ongs.length > 0 ? ongs[0].id : '');
    if (!targetOng && newRole !== 'super_admin') {
      setError('Debes seleccionar una Organización/ONG válida.');
      return;
    }

    setSubmitting(true);
    try {
      await api.adminCreateUser({
        email: newEmail.trim(),
        password: newPassword,
        nombre_completo: newNombre.trim(),
        rol: newRole,
        ong_id: targetOng,
      });

      setSuccess(`Usuario ${newNombre} creado correctamente.`);
      setShowCreateModal(false);
      setNewNombre('');
      setNewEmail('');
      setNewPassword('');
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido.';
      setError(message || 'Error al crear usuario.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div
        style={{
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
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
            Usuarios del SaaS
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.8rem' }}>
            Autoriza nuevos accesos, asigna roles de sistema y gestiona la ONG de cada usuario de
            forma global.
          </p>
        </div>

        <button
          onClick={() => {
            setShowCreateModal(true);
            if (ongs.length > 0 && !newOngId) {
              setNewOngId(ongs[0].id);
            }
          }}
          style={{
            backgroundColor: '#0d9488',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '0.6rem 1.2rem',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 2px 4px rgba(13, 148, 136, 0.2)',
          }}
        >
          <UserPlus size={16} /> + Nuevo Usuario
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

      {/* Filter Toolbar Card */}
      <div
        style={{
          background: 'white',
          padding: '1.25rem 1.5rem',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          border: '1px solid #e2e8f0',
          marginBottom: '2.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1.5rem',
          alignItems: 'center',
        }}
      >
        {/* Search */}
        <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
          <Search
            size={16}
            color="#94a3b8"
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          />
          <input
            type="text"
            placeholder="Buscar por nombre o correo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 1rem 0.55rem 2.5rem',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.8rem',
              outline: 'none',
            }}
          />
        </div>

        {/* Filter ONG */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={14} color="#64748b" />
          <select
            value={ongFilter}
            onChange={(e) => setOngFilter(e.target.value)}
            style={{
              padding: '0.55rem',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.8rem',
              outline: 'none',
              backgroundColor: 'white',
            }}
          >
            <option value="todas">Todas las ONGs</option>
            {ongs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Status */}
        <div
          style={{
            display: 'flex',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          {(['todos', 'pendientes', 'aprobados'] as const).map((status) => {
            const isActive = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                style={{
                  padding: '0.55rem 1rem',
                  backgroundColor: isActive ? '#0d9488' : 'white',
                  color: isActive ? 'white' : '#475569',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {status}
              </button>
            );
          })}
        </div>
      </div>

      {/* Users table */}
      {loading ? (
        <SkeletonTable rows={7} cols={5} showAvatar />
      ) : (
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.8rem',
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  color: '#64748b',
                  fontWeight: 700,
                }}
              >
                <th style={{ padding: '1rem 1.5rem' }}>Usuario</th>
                <th style={{ padding: '1rem 1.5rem' }}>Organización (ONG)</th>
                <th style={{ padding: '1rem 1.5rem' }}>Rol</th>
                <th style={{ padding: '1rem 1.5rem' }}>Estado</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}
                  >
                    No se encontraron usuarios con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isEditing = isEditingId === user.id;
                  const matchedOng = ongs.find((o) => o.id === user.ong_id);
                  const displayOng =
                    user.rol === 'super_admin'
                      ? 'No aplica (Super Admin SaaS)'
                      : user.ongs?.nombre ||
                        matchedOng?.nombre ||
                        (user.ong_id ? `ONG (${user.ong_id.slice(0, 8)}...)` : 'Sin ONG asignada');
                  return (
                    <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      {/* Name / Email */}
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ fontWeight: 700, color: '#1e293b' }}>
                          {user.nombre_completo}
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px' }}>
                          {user.email}
                        </div>
                      </td>

                      {/* ONG Assignment */}
                      <td style={{ padding: '1rem 1.5rem' }}>
                        {isEditing && user.rol !== 'super_admin' ? (
                          <select
                            value={editOngId}
                            onChange={(e) => setEditOngId(e.target.value)}
                            style={{
                              padding: '0.4rem',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.8rem',
                            }}
                          >
                            {ongs.map((o) => (
                              <option key={o.id} value={o.id}>
                                {o.nombre}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span style={{ fontWeight: 600, color: '#475569' }}>{displayOng}</span>
                        )}
                      </td>

                      {/* System Role */}
                      <td style={{ padding: '1rem 1.5rem' }}>
                        {isEditing ? (
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value as UserRole)}
                            style={{
                              padding: '0.4rem',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.8rem',
                            }}
                          >
                            <option value="coordinador">Coordinador de Campo</option>
                            <option value="auxiliar_campo">Auxiliar de Campo</option>
                            <option value="auditor">Auditor de Finanzas</option>
                            <option value="director">Director de Proyecto</option>
                            <option value="donante">Donante</option>
                            <option value="administrador">Administrador de ONG</option>
                            <option value="super_admin">Super Administrador SaaS</option>
                          </select>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              color: user.rol === 'super_admin' ? '#0d9488' : '#475569',
                              backgroundColor: user.rol === 'super_admin' ? '#f0fdfa' : '#f1f5f9',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '4px',
                            }}
                          >
                            {user.rol.replace('_', ' ')}
                          </span>
                        )}
                      </td>

                      {/* Approval Status */}
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: user.aprobado ? '#059669' : '#d97706',
                          }}
                        >
                          {user.aprobado ? <UserCheck size={14} /> : <ShieldAlert size={14} />}
                          {user.aprobado ? 'Aprobado' : 'Pendiente'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          {isEditing ? (
                            <>
                              <button
                                onClick={handleCancelEdit}
                                disabled={submitting}
                                style={{
                                  background: 'none',
                                  border: '1px solid #cbd5e1',
                                  color: '#64748b',
                                  borderRadius: '6px',
                                  padding: '0.35rem 0.6rem',
                                  cursor: 'pointer',
                                  fontSize: '0.75rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.2rem',
                                }}
                              >
                                <X size={12} /> Cancelar
                              </button>
                              <button
                                onClick={() => handleSaveUserChanges(user.id)}
                                disabled={submitting}
                                style={{
                                  backgroundColor: '#0d9488',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '0.35rem 0.6rem',
                                  cursor: 'pointer',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.2rem',
                                }}
                              >
                                <Check size={12} /> Guardar
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleStartEdit(user)}
                                disabled={submitting}
                                style={{
                                  background: 'none',
                                  border: '1px solid #cbd5e1',
                                  color: '#475569',
                                  borderRadius: '6px',
                                  padding: '0.35rem 0.75rem',
                                  cursor: 'pointer',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                }}
                              >
                                Configurar
                              </button>

                              <button
                                onClick={() => handleToggleApproval(user)}
                                disabled={submitting}
                                style={{
                                  backgroundColor: user.aprobado
                                    ? 'rgba(239, 68, 68, 0.1)'
                                    : 'rgba(5, 150, 105, 0.1)',
                                  color: user.aprobado ? '#ef4444' : '#059669',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '0.35rem 0.75rem',
                                  cursor: 'pointer',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                }}
                              >
                                {user.aprobado ? 'Suspender' : 'Aprobar'}
                              </button>

                              {user.rol !== 'super_admin' && (
                                <button
                                  onClick={() => handleDeleteUser(user)}
                                  disabled={submitting}
                                  style={{
                                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                    color: '#ef4444',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '0.35rem 0.75rem',
                                    cursor: 'pointer',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                  }}
                                >
                                  Eliminar
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Creación de Usuario */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '520px',
              padding: '2rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
              }}
            >
              <h3
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  margin: 0,
                }}
              >
                <UserPlus size={20} color="#0d9488" /> Crear Nuevo Usuario de Sistema
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '0.2rem',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleCreateUser}
              style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: '0.4rem',
                  }}
                >
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Carlos Mendoza"
                  value={newNombre}
                  onChange={(e) => setNewNombre(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: '0.4rem',
                  }}
                >
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  required
                  placeholder="ejemplo@organizacion.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: '0.4rem',
                  }}
                >
                  Contraseña Inicial *
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: '#334155',
                      marginBottom: '0.4rem',
                    }}
                  >
                    Rol de Sistema *
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.8rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      outline: 'none',
                      backgroundColor: 'white',
                    }}
                  >
                    <option value="administrador">Administrador de ONG</option>
                    <option value="coordinador">Coordinador de Campo</option>
                    <option value="auditor">Auditor de Finanzas</option>
                    <option value="director">Director de Proyecto</option>
                    <option value="auxiliar_campo">Auxiliar de Campo</option>
                    <option value="donante">Donante</option>
                    <option value="super_admin">Super Admin SaaS</option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: '#334155',
                      marginBottom: '0.4rem',
                    }}
                  >
                    Organización (ONG) *
                  </label>
                  <select
                    value={newOngId}
                    onChange={(e) => setNewOngId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.8rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      outline: 'none',
                      backgroundColor: 'white',
                    }}
                  >
                    {ongs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.8rem',
                  marginTop: '1rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '0.6rem 1.2rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    color: '#475569',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '0.6rem 1.4rem',
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: '#0d9488',
                    color: 'white',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  {submitting ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
