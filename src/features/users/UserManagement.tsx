import React, { useState, useEffect } from 'react';
import { Plus, X, Eye, EyeOff } from 'lucide-react';
import { api } from '../../services/api';
import type { UserRole } from '../../context/AuthContext';

interface UserItem {
  id: string;
  email: string;
  nombre_completo: string;
  rol: UserRole;
  aprobado: boolean;
  created_at: string;
}

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filtros y búsquedas
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendientes' | 'aprobados'>('todos');

  // Roles modificados localmente antes de guardar
  const [tempRoles, setTempRoles] = useState<{ [userId: string]: UserRole }>({});

  // New User Modal State
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newUserData, setNewUserData] = useState({
    nombre_completo: '',
    email: '',
    password: '',
    rol: 'coordinador' as UserRole,
  });

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getUsers();
      setUsers(data as UserItem[]);

      // Inicializar roles temporales con los roles actuales
      const roles: { [userId: string]: UserRole } = {};
      data.forEach((user: any) => {
        roles[user.id] = user.rol;
      });
      setTempRoles(roles);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los usuarios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

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
    } catch (err: any) {
      setError(err.message || 'Error al aprobar el usuario.');
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
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el rol del usuario.');
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
    } catch (err: any) {
      setError(err.message || 'Error al suspender el usuario.');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingUser(true);
    setError(null);
    setSuccess(null);
    try {
      await api.adminCreateUser(newUserData);
      setSuccess('Usuario creado y aprobado exitosamente.');
      setShowNewUserModal(false);
      setNewUserData({
        nombre_completo: '',
        email: '',
        password: '',
        rol: 'coordinador' as UserRole,
      });
      await loadUsers();
    } catch (err: any) {
      setError(
        err.message || 'Error al crear el usuario. Asegúrate de configurar la Edge Function.',
      );
    } finally {
      setCreatingUser(false);
    }
  };

  // Filtrado de usuarios
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'todos' ||
      (statusFilter === 'pendientes' && !user.aprobado) ||
      (statusFilter === 'aprobados' && user.aprobado);

    return matchesSearch && matchesStatus;
  });

  const pendingCount = users.filter((u) => !u.aprobado).length;

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
          onClick={() => setShowNewUserModal(true)}
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
              onChange={(e) => setStatusFilter(e.target.value as any)}
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
                          <option value="coordinador">Coordinador de Campo</option>
                          <option value="auxiliar_campo">Auxiliar de Campo</option>
                          <option value="auditor">Auditor (Finanzas)</option>
                          <option value="director">Director</option>
                          <option value="donante">Donante</option>
                          <option value="administrador">Administrador</option>
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

      {/* Modal Crear Usuario */}
      {showNewUserModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div
            className="card animate-fade-in"
            style={{
              width: '100%',
              maxWidth: '450px',
              padding: '2rem',
              margin: '1rem',
              maxHeight: '90vh',
              overflowY: 'auto',
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
              <h3 style={{ margin: 0, color: 'var(--primary)', fontWeight: 700 }}>
                Crear Nuevo Usuario
              </h3>
              <button
                onClick={() => setShowNewUserModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--neutral)',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleCreateUser}
              style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
            >
              <div>
                <label className="app-label">Nombre Completo *</label>
                <input
                  type="text"
                  className="app-input"
                  required
                  value={newUserData.nombre_completo}
                  onChange={(e) =>
                    setNewUserData({ ...newUserData, nombre_completo: e.target.value })
                  }
                  placeholder="Ej. Juan Pérez"
                />
              </div>

              <div>
                <label className="app-label">Correo Electrónico *</label>
                <input
                  type="email"
                  className="app-input"
                  required
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  placeholder="usuario@organizacion.org"
                />
              </div>

              <div>
                <label className="app-label">Contraseña Provisional *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="app-input"
                    required
                    value={newUserData.password}
                    onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--neutral)',
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="app-label">Rol Asignado *</label>
                <select
                  className="app-input"
                  required
                  value={newUserData.rol}
                  onChange={(e) =>
                    setNewUserData({ ...newUserData, rol: e.target.value as UserRole })
                  }
                >
                  <option value="coordinador">Coordinador de Terreno</option>
                  <option value="director">Director (Doble Firma)</option>
                  <option value="auditor">Auditor (Lectura global)</option>
                  <option value="administrador">Administrador del Sistema</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  onClick={() => setShowNewUserModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={creatingUser}
                >
                  {creatingUser ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
