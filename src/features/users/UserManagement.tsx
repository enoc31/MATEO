import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Mail, Copy, Check, RefreshCw, Trash2, Clock } from 'lucide-react';
import { api, requisitionsApi, type Invitation } from '../../services/api';
import { useAuth, type UserRole } from '../../context/AuthContext';
import { supabase } from '../../supabaseClient';
import { UserInviteModal } from './UserInviteModal';
import { EKKLESIA_ROLE_OPTIONS, ONG_ROLE_OPTIONS } from '../../utils/rolePermissions';

interface UserItem {
  id: string;
  email: string;
  nombre_completo: string;
  rol: UserRole;
  aprobado: boolean;
  ong_id?: string;
  created_at: string;
}

export const UserManagement: React.FC = () => {
  const { activeOng, profile } = useAuth();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  // Filtros y búsquedas
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendientes' | 'aprobados'>('todos');

  // Roles modificados localmente antes de guardar
  const [tempRoles, setTempRoles] = useState<{ [userId: string]: UserRole }>({});

  // Invite Modal
  const [showInviteModal, setShowInviteModal] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const targetOngId = activeOng?.id || profile?.ong_id;
      const [data, invitesData] = await Promise.all([
        api.getUsers(targetOngId),
        requisitionsApi.getInvitationsByOng
          ? requisitionsApi.getInvitationsByOng(targetOngId)
          : Promise.resolve([]),
      ]);
      const typedUsers = data as UserItem[];
      setUsers(typedUsers);
      setInvitations(invitesData || []);

      // Inicializar roles temporales con los roles actuales
      const roles: { [userId: string]: UserRole } = {};
      typedUsers.forEach((user) => {
        roles[user.id] = user.rol;
      });
      setTempRoles(roles);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar los usuarios.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [activeOng, profile]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    setTempRoles((prev) => ({
      ...prev,
      [userId]: newRole,
    }));
  };

  const handleApprove = async (userId: string) => {
    setError(null);
    setSuccess(null);
    const selectedRole = tempRoles[userId];
    try {
      await api.updateUserProfile(userId, { aprobado: true, rol: selectedRole });
      setSuccess('Usuario aprobado correctamente.');
      await loadUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al aprobar el usuario.';
      setError(msg);
    }
  };

  const handleUpdateRole = async (userId: string) => {
    setError(null);
    setSuccess(null);
    const selectedRole = tempRoles[userId];
    try {
      await api.updateUserProfile(userId, { rol: selectedRole });
      setSuccess('Rol de usuario actualizado correctamente.');
      await loadUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar el rol del usuario.';
      setError(msg);
    }
  };

  const handleSuspend = async (userId: string) => {
    if (
      !window.confirm(
        '¿Está seguro de suspender a este usuario? Perderá acceso inmediato al sistema.',
      )
    ) {
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      await api.updateUserProfile(userId, { aprobado: false });
      setSuccess('Usuario suspendido correctamente.');
      await loadUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al suspender el usuario.';
      setError(msg);
    }
  };

  const handleCopyInviteLink = (inv: Invitation) => {
    const inviteUrl = `${window.location.origin}/aceptar-invitacion?token=${inv.token}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedTokenId(inv.id);
    setTimeout(() => setCopiedTokenId(null), 2500);
  };

  const handleResendInvitation = async (inv: Invitation) => {
    setError(null);
    setSuccess(null);
    setResendingId(inv.id);
    try {
      const inviteUrl = `${window.location.origin}/aceptar-invitacion?token=${inv.token}`;
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'notify-invitation',
        {
          body: {
            email: inv.email,
            rol: inv.rol,
            ongNombre: activeOng?.nombre || 'la Iglesia',
            inviteUrl,
            invitadoPorNombre: profile?.nombre_completo || 'Un Administrador',
          },
        },
      );
      if (fnError) throw new Error(fnError.message || 'No se pudo reenviar el correo.');
      if (fnData?.error) throw new Error(fnData.error);
      setSuccess(`📨 Correo de invitación reenviado exitosamente a ${inv.email}.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al reenviar la invitación.';
      setError(msg);
    } finally {
      setResendingId(null);
    }
  };

  const handleCancelInvitation = async (inv: Invitation) => {
    if (!window.confirm(`¿Deseas revocar la invitación enviada a ${inv.email}?`)) {
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      await requisitionsApi.cancelInvitation(inv.id);
      setSuccess(`Invitación para ${inv.email} revocada correctamente.`);
      await loadUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cancelar la invitación.';
      setError(msg);
    }
  };

  // Filtrado de usuarios: aislados estrictamente por la Iglesia/ONG activa del usuario
  const targetOngId = activeOng?.id || profile?.ong_id;

  const filteredUsers = users.filter((user) => {
    if (user.rol === 'super_admin') return false;
    if (targetOngId && user.ong_id && user.ong_id !== targetOngId) return false;

    const matchesSearch =
      user.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'todos' ||
      (statusFilter === 'pendientes' && !user.aprobado) ||
      (statusFilter === 'aprobados' && user.aprobado);

    return matchesSearch && matchesStatus;
  });

  const filteredInvitations = invitations.filter((inv) => {
    if (statusFilter === 'aprobados') return false;
    if (!searchTerm.trim()) return true;
    return (
      inv.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.rol.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const roleLabelsMap: Record<string, string> = {};
  [...EKKLESIA_ROLE_OPTIONS, ...ONG_ROLE_OPTIONS].forEach((opt) => {
    roleLabelsMap[opt.value] = opt.label;
  });

  const pendingCount = users.filter((u) => !u.aprobado).length + invitations.length;

  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem 0' }}>
      {/* Encabezado */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2
            style={{ color: 'var(--primary)', fontFamily: 'var(--font-headings)', fontWeight: 800 }}
          >
            Consola de Gestión de Usuarios
          </h2>
          <p style={{ opacity: 0.7, fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Aprueba registros de personal, asigna roles de acceso y suspende cuentas activas.
          </p>
        </div>

        {pendingCount > 0 && (
          <div
            className="badge badge-warning"
            style={{
              fontSize: '0.85rem',
              padding: '0.6rem 1rem',
              borderRadius: '20px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span>⏳</span> {pendingCount} Registro{pendingCount > 1 ? 's' : ''} Pendiente
            {pendingCount > 1 ? 's' : ''}
          </div>
        )}

        <button
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
          onClick={() => setShowInviteModal(true)}
        >
          <Plus size={18} /> Nuevo Usuario
        </button>
      </div>

      {/* Alertas */}
      {error && (
        <div
          className="badge badge-danger"
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1.5rem',
            textAlign: 'center',
            display: 'block',
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="badge"
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1.5rem',
            textAlign: 'center',
            backgroundColor: 'rgba(0, 143, 166, 0.1)',
            color: 'var(--accent)',
            border: '1px solid var(--accent)',
            display: 'block',
          }}
        >
          {success}
        </div>
      )}

      {/* Controles de Búsqueda y Filtro */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <div
            style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
          >
            <label className="form-label" style={{ margin: 0 }}>
              Buscar usuario
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="Buscar por nombre o correo electrónico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div
            style={{ flex: '0 1 200px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
          >
            <label className="form-label" style={{ margin: 0 }}>
              Estado
            </label>
            <select
              className="form-input"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'todos' | 'pendientes' | 'aprobados')
              }
            >
              <option value="todos">Todos los usuarios</option>
              <option value="pendientes">Pendientes de aprobación</option>
              <option value="aprobados">Aprobados / Activos</option>
            </select>
          </div>

          <button
            onClick={loadUsers}
            className="btn btn-outline"
            style={{
              alignSelf: 'flex-end',
              padding: '0.6rem 1.2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
            disabled={loading}
          >
            🔄 Recargar
          </button>
        </div>
      </div>

      {/* Invitaciones Enviadas (En espera de respuesta) */}
      {!loading && filteredInvitations.length > 0 && (
        <div
          className="card"
          style={{
            padding: 0,
            overflowX: 'auto',
            marginBottom: '2rem',
            border: '1px solid rgba(245, 158, 11, 0.35)',
          }}
        >
          <div
            style={{
              padding: '1rem 1.5rem',
              backgroundColor: 'rgba(245, 158, 11, 0.08)',
              borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Clock size={18} style={{ color: '#b45309' }} />
              <strong style={{ color: '#92400e', fontSize: '0.95rem' }}>
                Invitaciones Enviadas en Espera de Respuesta ({filteredInvitations.length})
              </strong>
            </div>
            <span style={{ fontSize: '0.8rem', color: '#92400e' }}>
              El usuario aparecerá activo en la lista principal en cuanto abra su enlace y cree su
              contraseña.
            </span>
          </div>

          <table
            className="table"
            style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '0.85rem 1.5rem', fontWeight: 600, fontSize: '0.82rem' }}>
                  Correo Invitado
                </th>
                <th style={{ padding: '0.85rem 1.5rem', fontWeight: 600, fontSize: '0.82rem' }}>
                  Rol Pre-Asignado
                </th>
                <th style={{ padding: '0.85rem 1.5rem', fontWeight: 600, fontSize: '0.82rem' }}>
                  Enviada / Vence
                </th>
                <th style={{ padding: '0.85rem 1.5rem', fontWeight: 600, fontSize: '0.82rem' }}>
                  Estado
                </th>
                <th
                  style={{
                    padding: '0.85rem 1.5rem',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    textAlign: 'center',
                  }}
                >
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredInvitations.map((inv) => {
                const isExpired = inv.estado === 'expirada';
                const isCopied = copiedTokenId === inv.id;
                const isResending = resendingId === inv.id;

                return (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontWeight: 600,
                          color: 'var(--neutral-dark)',
                        }}
                      >
                        <Mail size={15} style={{ color: 'var(--primary)' }} />
                        {inv.email}
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.85rem' }}>
                      <span
                        style={{
                          backgroundColor: '#f1f5f9',
                          color: '#334155',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '6px',
                          fontWeight: 600,
                          fontSize: '0.78rem',
                        }}
                      >
                        {roleLabelsMap[inv.rol] || inv.rol.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.82rem', color: '#475569' }}>
                      <div>
                        Enviada:{' '}
                        {new Date(inv.created_at).toLocaleDateString('es-VE', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      {inv.expires_at && (
                        <div style={{ fontSize: '0.75rem', opacity: 0.75 }}>
                          Vence:{' '}
                          {new Date(inv.expires_at).toLocaleDateString('es-VE', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span
                        className={`badge ${isExpired ? 'badge-danger' : 'badge-warning'}`}
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '4px',
                          fontWeight: 600,
                        }}
                      >
                        {isExpired ? 'Expirada' : '⏳ Esperando respuesta'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                      <div
                        style={{
                          display: 'flex',
                          gap: '0.5rem',
                          justifyContent: 'center',
                          flexWrap: 'wrap',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => handleCopyInviteLink(inv)}
                          className="btn btn-outline"
                          style={{
                            padding: '0.35rem 0.7rem',
                            fontSize: '0.78rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                          }}
                          title="Copiar enlace directo de activación"
                        >
                          {isCopied ? <Check size={14} /> : <Copy size={14} />}
                          {isCopied ? '¡Copiado!' : 'Copiar enlace'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleResendInvitation(inv)}
                          disabled={isResending}
                          className="btn btn-outline"
                          style={{
                            padding: '0.35rem 0.7rem',
                            fontSize: '0.78rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            color: 'var(--primary)',
                            borderColor: 'var(--primary)',
                          }}
                          title="Reenviar correo de invitación"
                        >
                          <RefreshCw size={14} />
                          {isResending ? 'Enviando...' : 'Reenviar correo'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCancelInvitation(inv)}
                          className="btn btn-outline"
                          style={{
                            padding: '0.35rem 0.7rem',
                            fontSize: '0.78rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            color: 'var(--danger)',
                            borderColor: 'var(--danger)',
                          }}
                          title="Revocar invitación"
                        >
                          <Trash2 size={14} />
                          Revocar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tabla de Usuarios */}
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', opacity: 0.7 }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>Cargando usuarios...</div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', opacity: 0.7 }}>
            <span style={{ fontSize: '2.5rem' }}>👥</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, marginTop: '1rem' }}>
              No se encontraron usuarios
            </div>
            <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Prueba cambiando los filtros de búsqueda o recargando la página.
            </p>
          </div>
        ) : (
          <table
            className="table"
            style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                <th
                  style={{
                    padding: '1rem 1.5rem',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    opacity: 0.8,
                  }}
                >
                  Nombre / Correo
                </th>
                <th
                  style={{
                    padding: '1rem 1.5rem',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    opacity: 0.8,
                  }}
                >
                  Fecha Registro
                </th>
                <th
                  style={{
                    padding: '1rem 1.5rem',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    opacity: 0.8,
                  }}
                >
                  Estado
                </th>
                <th
                  style={{
                    padding: '1rem 1.5rem',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    opacity: 0.8,
                  }}
                >
                  Rol Asignado
                </th>
                <th
                  style={{
                    padding: '1rem 1.5rem',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    opacity: 0.8,
                    textAlign: 'center',
                  }}
                >
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const currentTempRole = tempRoles[user.id] || user.rol;
                const isRoleChanged = currentTempRole !== user.rol;

                return (
                  <tr
                    key={user.id}
                    style={{ borderBottom: '1px solid #e2e8f0', transition: 'background 0.2s' }}
                  >
                    {/* Nombre y correo */}
                    <td style={{ padding: '1.2rem 1.5rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--neutral-dark)' }}>
                        {user.nombre_completo}
                      </div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.1rem' }}>
                        {user.email}
                      </div>
                    </td>

                    {/* Fecha de Registro */}
                    <td style={{ padding: '1.2rem 1.5rem', fontSize: '0.85rem', opacity: 0.8 }}>
                      {new Date(user.created_at).toLocaleDateString('es-VE', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>

                    {/* Estado de Aprobación */}
                    <td style={{ padding: '1.2rem 1.5rem' }}>
                      <span
                        className={`badge ${user.aprobado ? 'badge-success' : 'badge-warning'}`}
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '4px',
                          fontWeight: 600,
                        }}
                      >
                        {user.aprobado ? 'Aprobado / Activo' : 'Pendiente'}
                      </span>
                    </td>

                    {/* Rol sugerido/modificable */}
                    <td style={{ padding: '1.2rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <select
                          className="form-input"
                          style={{
                            padding: '0.35rem 0.5rem',
                            fontSize: '0.85rem',
                            width: 'auto',
                            minWidth: '150px',
                            borderColor: isRoleChanged ? 'var(--accent)' : '#cbd5e1',
                          }}
                          value={currentTempRole}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                        >
                          {(activeOng?.tipo_organizacion === 'ekklesia'
                            ? EKKLESIA_ROLE_OPTIONS
                            : ONG_ROLE_OPTIONS
                          ).map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                          {activeOng?.tipo_organizacion === 'ekklesia' &&
                            currentTempRole === 'administrador' && (
                              <option value="administrador">Administrador General (Legacy)</option>
                            )}
                        </select>
                      </div>
                    </td>

                    {/* Acciones */}
                    <td style={{ padding: '1.2rem 1.5rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        {!user.aprobado ? (
                          // Usuario Pendiente
                          <button
                            onClick={() => handleApprove(user.id)}
                            className="btn btn-primary"
                            style={{
                              padding: '0.4rem 0.8rem',
                              fontSize: '0.8rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                            }}
                          >
                            ✔️ Aprobar Acceso
                          </button>
                        ) : (
                          // Usuario Aprobado/Activo
                          <>
                            {isRoleChanged && (
                              <button
                                onClick={() => handleUpdateRole(user.id)}
                                className="btn btn-secondary"
                                style={{
                                  padding: '0.4rem 0.8rem',
                                  fontSize: '0.8rem',
                                  backgroundColor: 'var(--accent)',
                                  color: '#ffffff',
                                }}
                              >
                                Guardar Rol
                              </button>
                            )}
                            <button
                              onClick={() => handleSuspend(user.id)}
                              className="btn btn-outline"
                              style={{
                                padding: '0.4rem 0.8rem',
                                fontSize: '0.8rem',
                                color: 'var(--danger)',
                                borderColor: 'var(--danger)',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--danger)';
                                e.currentTarget.style.color = '#ffffff';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = 'var(--danger)';
                              }}
                            >
                              🚫 Suspender
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de Invitación — el nuevo usuario crea su propia contraseña */}
      <UserInviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={() => {
          setSuccess(
            '✅ Invitación generada. Puedes copiar el enlace directo o verificar el estado del correo en el modal.',
          );
          loadUsers();
        }}
      />
    </div>
  );
};
