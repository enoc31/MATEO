import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, LayoutList, Kanban, Eye, X, CheckSquare, Square } from 'lucide-react';
import { api, type Beneficiary } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { MemberProfileModal } from './MemberProfileModal';
import { useNotifications } from '../../components/NotificationProvider';

export type EclesiasticalStatus = 'Activo' | 'Bautizado' | 'En Visita' | 'Líder' | 'Inactivo';

export const ChurchMembersManager: React.FC = () => {
  const { activeOng } = useAuth();
  const { addNotification } = useNotifications();

  const [members, setMembers] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Modal 360 profile
  const [selectedMember, setSelectedMember] = useState<Beneficiary | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Modal nuevo miembro
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newNombre, setNewNombre] = useState('');
  const [newApellido, setNewApellido] = useState('');
  const [newCedula, setNewCedula] = useState('');
  const [newSexo, setNewSexo] = useState<'Masculino' | 'Femenino'>('Masculino');
  const [newFechaNacimiento, setNewFechaNacimiento] = useState('');
  const [newDireccion, setNewDireccion] = useState('');
  const [newTelefono, setNewTelefono] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRedesSociales, setNewRedesSociales] = useState('');
  const [newFotoUrl, setNewFotoUrl] = useState('');
  const [newFotoCedulaUrl, setNewFotoCedulaUrl] = useState('');
  const [newBautizado, setNewBautizado] = useState(false);
  const [newGradoInstruccion, setNewGradoInstruccion] = useState('Universitario');
  const [newEnfermedad, setNewEnfermedad] = useState('');
  const [newFechaMembresia, setNewFechaMembresia] = useState('');
  const [newCargo, setNewCargo] = useState<
    | 'PASTOR / OBISPO O SIMILAR'
    | 'DIÁCONO / ANCIANO O SIMILAR'
    | 'MINISTRO / COORDINADOR / LÍDER O SIMILAR'
    | 'MIEMBRO GENERAL'
  >('MIEMBRO GENERAL');
  const [newAreas, setNewAreas] = useState<
    ('PROCLAMACIÓN' | 'ENSEÑANZA' | 'SERVICIO' | 'COMPAÑERISMO' | 'ADORACIÓN')[]
  >([]);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const data = await api.getBeneficiaries();
      setMembers(data);
    } catch (err) {
      console.error('Error al cargar miembros:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const toggleArea = (
    area: 'PROCLAMACIÓN' | 'ENSEÑANZA' | 'SERVICIO' | 'COMPAÑERISMO' | 'ADORACIÓN',
  ) => {
    setNewAreas((prev) => (prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]));
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newNombre.trim() || !newApellido.trim() || !newFechaNacimiento) {
      setFormError(
        'Los campos Nombre (*), Apellido (*) y Fecha de Nacimiento (*) son obligatorios.',
      );
      return;
    }

    setSubmitting(true);
    try {
      const statusFromBautismo: EclesiasticalStatus = newBautizado ? 'Bautizado' : 'Activo';

      const saved = await api.saveBeneficiary(
        {
          nombre: newNombre.trim(),
          apellido: newApellido.trim(),
          cedula: newCedula.trim(),
          sexo: newSexo,
          fecha_nacimiento: newFechaNacimiento,
          direccion: newDireccion.trim(),
          telefono: newTelefono.trim(),
          email: newEmail.trim(),
          redes_sociales: newRedesSociales.trim(),
          foto_url: newFotoUrl.trim() || null,
          foto_cedula_url: newFotoCedulaUrl.trim() || null,
          bautizado: newBautizado,
          grado_instruccion: newGradoInstruccion,
          enfermedad: newEnfermedad.trim(),
          fecha_membresia: newFechaMembresia || new Date().toISOString().split('T')[0],
          cargo_eclesiastico: newCargo,
          areas_ministeriales: newAreas,
          jornada_id: 'general-ekklesia',
          tipo_donacion: [statusFromBautismo, 'Ekklesia', newCargo],
        },
        undefined,
        activeOng?.id,
      );

      addNotification(
        `Miembro ${saved.nombre} ${saved.apellido} registrado exitosamente`,
        'success',
      );
      setIsAddModalOpen(false);

      // Reset form fields
      setNewNombre('');
      setNewApellido('');
      setNewCedula('');
      setNewFechaNacimiento('');
      setNewDireccion('');
      setNewTelefono('');
      setNewEmail('');
      setNewRedesSociales('');
      setNewFotoUrl('');
      setNewFotoCedulaUrl('');
      setNewBautizado(false);
      setNewGradoInstruccion('Universitario');
      setNewEnfermedad('');
      setNewFechaMembresia('');
      setNewCargo('MIEMBRO GENERAL');
      setNewAreas([]);
      await loadMembers();
    } catch (err: any) {
      setFormError(err.message || 'Error al registrar el miembro.');
    } finally {
      setSubmitting(false);
    }
  };

  const getMemberStatus = (member: Beneficiary): EclesiasticalStatus => {
    if (member.bautizado) return 'Bautizado';
    if (member.cargo_eclesiastico && member.cargo_eclesiastico.includes('PASTOR')) return 'Líder';
    if (member.cargo_eclesiastico && member.cargo_eclesiastico.includes('MINISTRO')) return 'Líder';
    if (member.tipo_donacion && member.tipo_donacion.length > 0) {
      const statusCandidate = member.tipo_donacion[0];
      if (['Activo', 'Bautizado', 'En Visita', 'Líder', 'Inactivo'].includes(statusCandidate)) {
        return statusCandidate as EclesiasticalStatus;
      }
    }
    return 'Activo';
  };

  const filteredMembers = members.filter((m) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      m.nombre.toLowerCase().includes(term) ||
      m.apellido.toLowerCase().includes(term) ||
      m.cedula.toLowerCase().includes(term) ||
      (m.email && m.email.toLowerCase().includes(term)) ||
      (m.telefono && m.telefono.includes(term));

    const status = getMemberStatus(m);
    const matchesStatus = statusFilter === 'todos' || status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalCount = members.length;
  const bautizadosCount = members.filter(
    (m) => m.bautizado || getMemberStatus(m) === 'Bautizado',
  ).length;
  const pastoresCount = members.filter(
    (m) => m.cargo_eclesiastico === 'PASTOR / OBISPO O SIMILAR',
  ).length;
  const diaconosCount = members.filter(
    (m) => m.cargo_eclesiastico === 'DIÁCONO / ANCIANO O SIMILAR',
  ).length;

  const KANBAN_COLUMNS: { id: EclesiasticalStatus; label: string; color: string; bg: string }[] = [
    { id: 'Activo', label: '🟢 Activos', color: '#15803D', bg: '#F0FDF4' },
    { id: 'Bautizado', label: '🌊 Bautizados', color: '#1D4ED8', bg: '#EFF6FF' },
    { id: 'En Visita', label: '🚶 En Visita', color: '#D97706', bg: '#FFFBEB' },
    { id: 'Líder', label: '⭐ Líderes / Ministros', color: '#7E22CE', bg: '#FAF5FF' },
    { id: 'Inactivo', label: '⚪ Inactivos', color: '#64748B', bg: '#F8FAFC' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Encabezado del Módulo */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ color: 'var(--primary)', fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
            👤 Padrón de Miembros y Fieles
          </h2>
          <p style={{ opacity: 0.8, fontSize: '0.9rem', marginTop: '0.25rem', color: '#475569' }}>
            Data congregacional completa, cargos eclesiásticos, ministerios y ficha 360°.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          style={{
            backgroundColor: '#1B5CB6',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.4rem',
            borderRadius: '12px',
            fontWeight: 800,
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 12px rgba(27, 92, 182, 0.25)',
          }}
        >
          <Plus size={18} /> Registrar Nuevo Miembro
        </button>
      </div>

      {/* Tarjetas Estadísticas Resumen */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
        }}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            padding: '1.2rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 800 }}>
            TOTAL MIEMBROS
          </span>
          <div
            style={{ fontSize: '1.8rem', fontWeight: 900, color: '#1B5CB6', marginTop: '0.2rem' }}
          >
            {totalCount}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            padding: '1.2rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <span style={{ fontSize: '0.78rem', color: '#15803D', fontWeight: 800 }}>BAUTIZADOS</span>
          <div
            style={{ fontSize: '1.8rem', fontWeight: 900, color: '#166534', marginTop: '0.2rem' }}
          >
            {bautizadosCount}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            padding: '1.2rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <span style={{ fontSize: '0.78rem', color: '#7E22CE', fontWeight: 800 }}>
            PASTORES / OBISPOS
          </span>
          <div
            style={{ fontSize: '1.8rem', fontWeight: 900, color: '#6B21A8', marginTop: '0.2rem' }}
          >
            {pastoresCount}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            padding: '1.2rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <span style={{ fontSize: '0.78rem', color: '#1D4ED8', fontWeight: 800 }}>
            DIÁCONOS / ANCIANOS
          </span>
          <div
            style={{ fontSize: '1.8rem', fontWeight: 900, color: '#1E3A8A', marginTop: '0.2rem' }}
          >
            {diaconosCount}
          </div>
        </div>
      </div>

      {/* Barra de Filtros, Búsqueda y Selector de Formato (Lista vs Kanban) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          backgroundColor: '#FFFFFF',
          padding: '1rem 1.2rem',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
        }}
      >
        <div style={{ flex: '1 1 280px', position: 'relative' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94A3B8',
            }}
          />
          <input
            type="text"
            placeholder="Buscar por Nombre, Apellido, Cédula, Teléfono o Correo..."
            className="app-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.5rem', marginBottom: 0 }}
          />
        </div>

        <div style={{ flex: '0 1 200px' }}>
          <select
            className="app-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ marginBottom: 0 }}
          >
            <option value="todos">Todos los Estados</option>
            <option value="Activo">🟢 Activos</option>
            <option value="Bautizado">🌊 Bautizados</option>
            <option value="En Visita">🚶 En Visita</option>
            <option value="Líder">⭐ Líderes / Pastores</option>
            <option value="Inactivo">⚪ Inactivos</option>
          </select>
        </div>

        <div
          style={{
            display: 'flex',
            backgroundColor: '#F1F5F9',
            padding: '0.25rem',
            borderRadius: '10px',
          }}
        >
          <button
            onClick={() => setViewMode('list')}
            style={{
              padding: '0.5rem 0.9rem',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: viewMode === 'list' ? '#FFFFFF' : 'transparent',
              color: viewMode === 'list' ? '#1B5CB6' : '#64748B',
              boxShadow: viewMode === 'list' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            <LayoutList size={16} /> Vista Lista
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            style={{
              padding: '0.5rem 0.9rem',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: viewMode === 'kanban' ? '#FFFFFF' : 'transparent',
              color: viewMode === 'kanban' ? '#1B5CB6' : '#64748B',
              boxShadow: viewMode === 'kanban' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            <Kanban size={16} /> Vista Kanban
          </button>
        </div>
      </div>

      {/* VISTA 1: LISTA TABULAR */}
      {viewMode === 'list' && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            overflow: 'hidden',
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
              Cargando miembros congregacionales...
            </div>
          ) : filteredMembers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
              <Users size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.3 }} />
              <p style={{ fontWeight: 700, margin: 0 }}>No se encontraron miembros</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.9rem',
                  textAlign: 'left',
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: '2px solid #E2E8F0',
                      backgroundColor: '#F8FAFC',
                      color: '#475569',
                      fontSize: '0.8rem',
                      textTransform: 'uppercase',
                    }}
                  >
                    <th style={{ padding: '1rem 1.2rem' }}>Miembro / Feligrés</th>
                    <th style={{ padding: '1rem 1.2rem' }}>Cédula</th>
                    <th style={{ padding: '1rem 1.2rem' }}>Cargo Eclesiástico</th>
                    <th style={{ padding: '1rem 1.2rem' }}>Bautizado</th>
                    <th style={{ padding: '1rem 1.2rem' }}>Teléfono / Correo</th>
                    <th style={{ padding: '1rem 1.2rem', textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member) => (
                    <tr key={member.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '1rem 1.2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                          {member.foto_url ? (
                            <img
                              src={member.foto_url}
                              alt="Foto"
                              style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                flexShrink: 0,
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                backgroundColor: '#1B5CB6',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '0.95rem',
                                flexShrink: 0,
                              }}
                            >
                              {member.nombre?.[0]?.toUpperCase()}
                              {member.apellido?.[0]?.toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 800, color: '#0F172A' }}>
                              {member.nombre} {member.apellido}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                              F. Nac:{' '}
                              {member.fecha_nacimiento
                                ? new Date(member.fecha_nacimiento).toLocaleDateString('es-VE')
                                : 'N/I'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.2rem', fontWeight: 700, color: '#334155' }}>
                        {member.cedula || 'N/I'}
                      </td>
                      <td style={{ padding: '1rem 1.2rem' }}>
                        <span
                          style={{
                            padding: '0.25rem 0.6rem',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            backgroundColor: '#EFF6FF',
                            color: '#1E40AF',
                            border: '1px solid #BFDBFE',
                          }}
                        >
                          {member.cargo_eclesiastico || 'MIEMBRO GENERAL'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.2rem' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            backgroundColor: member.bautizado ? '#DCFCE7' : '#FEF3C7',
                            color: member.bautizado ? '#15803D' : '#D97706',
                          }}
                        >
                          {member.bautizado ? 'SÍ' : 'NO'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.2rem', color: '#475569', fontSize: '0.85rem' }}>
                        <div>{member.telefono || 'Sin Teléfono'}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748B' }}>{member.email}</div>
                      </td>
                      <td style={{ padding: '1rem 1.2rem', textAlign: 'center' }}>
                        <button
                          onClick={() => {
                            setSelectedMember(member);
                            setIsProfileModalOpen(true);
                          }}
                          style={{
                            padding: '0.45rem 0.9rem',
                            backgroundColor: '#1B5CB6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                          }}
                        >
                          <Eye size={14} /> Ficha 360°
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VISTA 2: KANBAN POR ESTADO ECLESIÁSTICO */}
      {viewMode === 'kanban' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.2rem',
            alignItems: 'start',
          }}
        >
          {KANBAN_COLUMNS.map((col) => {
            const columnMembers = filteredMembers.filter((m) => getMemberStatus(m) === col.id);
            return (
              <div
                key={col.id}
                style={{
                  backgroundColor: col.bg,
                  border: `1px solid ${col.color}30`,
                  borderRadius: '16px',
                  padding: '1rem',
                  minHeight: '380px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem',
                    paddingBottom: '0.5rem',
                    borderBottom: `2px solid ${col.color}40`,
                  }}
                >
                  <h4 style={{ margin: 0, fontWeight: 900, color: col.color, fontSize: '0.95rem' }}>
                    {col.label}
                  </h4>
                  <span
                    style={{
                      backgroundColor: 'white',
                      color: col.color,
                      fontWeight: 900,
                      fontSize: '0.78rem',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '999px',
                    }}
                  >
                    {columnMembers.length}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {columnMembers.length === 0 ? (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '2rem 0.5rem',
                        fontSize: '0.8rem',
                        color: '#94A3B8',
                        fontStyle: 'italic',
                      }}
                    >
                      Sin miembros
                    </div>
                  ) : (
                    columnMembers.map((m) => (
                      <div
                        key={m.id}
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: '12px',
                          padding: '1rem',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                          border: '1px solid #E2E8F0',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.6rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                          {m.foto_url ? (
                            <img
                              src={m.foto_url}
                              alt="Foto"
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                backgroundColor: col.color,
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '0.85rem',
                              }}
                            >
                              {m.nombre?.[0]?.toUpperCase()}
                              {m.apellido?.[0]?.toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F172A' }}>
                              {m.nombre} {m.apellido}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                              C.I.: {m.cedula || 'N/I'}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedMember(m);
                            setIsProfileModalOpen(true);
                          }}
                          style={{
                            width: '100%',
                            padding: '0.45rem',
                            backgroundColor: '#F1F5F9',
                            color: '#1B5CB6',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 800,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.3rem',
                            marginTop: '0.2rem',
                          }}
                        >
                          <Eye size={14} /> Ficha 360°
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: REGISTRAR NUEVO MIEMBRO (CON TODOS LOS CAMPOS SOLICITADOS) */}
      {isAddModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="animate-fade-in-up"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsAddModalOpen(false)}
              style={{
                position: 'absolute',
                top: '1.2rem',
                right: '1.2rem',
                background: '#F1F5F9',
                border: 'none',
                color: '#64748B',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} />
            </button>

            <h3
              style={{
                fontSize: '1.5rem',
                fontWeight: 900,
                color: '#1B5CB6',
                marginBottom: '0.2rem',
              }}
            >
              Registrar Nuevo Miembro
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '1.5rem' }}>
              Completa la ficha eclesiástica del miembro para incorporarlo al padrón.
            </p>

            {formError && (
              <div
                style={{
                  backgroundColor: '#FEE2E2',
                  color: '#991B1B',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                }}
              >
                {formError}
              </div>
            )}

            <form
              onSubmit={handleCreateMember}
              style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}
            >
              {/* SECCIÓN 1: DATOS PERSONALES BÁSICOS */}
              <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem' }}>
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    color: '#1B5CB6',
                    textTransform: 'uppercase',
                  }}
                >
                  1. Datos Personales Básicos
                </span>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1rem',
                    marginTop: '0.8rem',
                  }}
                >
                  <div>
                    <label className="form-label">Nombre *</label>
                    <input
                      type="text"
                      className="app-input"
                      placeholder="Ej: Pedro"
                      value={newNombre}
                      onChange={(e) => setNewNombre(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Apellido *</label>
                    <input
                      type="text"
                      className="app-input"
                      placeholder="Ej: Pérez"
                      value={newApellido}
                      onChange={(e) => setNewApellido(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '1rem',
                    marginTop: '0.8rem',
                  }}
                >
                  <div>
                    <label className="form-label">Cédula</label>
                    <input
                      type="text"
                      className="app-input"
                      placeholder="Ej: V-12345678"
                      value={newCedula}
                      onChange={(e) => setNewCedula(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Fecha de Nacimiento *</label>
                    <input
                      type="date"
                      className="app-input"
                      value={newFechaNacimiento}
                      onChange={(e) => setNewFechaNacimiento(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Sexo</label>
                    <select
                      className="app-input"
                      value={newSexo}
                      onChange={(e) => setNewSexo(e.target.value as any)}
                    >
                      <option value="Masculino">Masculino</option>
                      <option value="Femenino">Femenino</option>
                    </select>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1rem',
                    marginTop: '0.8rem',
                  }}
                >
                  <div>
                    <label className="form-label">Teléfono</label>
                    <input
                      type="text"
                      className="app-input"
                      placeholder="Ej: 0414-1234567"
                      value={newTelefono}
                      onChange={(e) => setNewTelefono(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Correo Electrónico</label>
                    <input
                      type="email"
                      className="app-input"
                      placeholder="miembro@correo.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '0.8rem' }}>
                  <label className="form-label">Dirección de Habitación</label>
                  <input
                    type="text"
                    className="app-input"
                    placeholder="Ej: Av. Principal, Urb. Central, Casa 45"
                    value={newDireccion}
                    onChange={(e) => setNewDireccion(e.target.value)}
                  />
                </div>

                <div style={{ marginTop: '0.8rem' }}>
                  <label className="form-label">Redes Sociales</label>
                  <input
                    type="text"
                    className="app-input"
                    placeholder="Ej: @pedroperez (Instagram / Facebook)"
                    value={newRedesSociales}
                    onChange={(e) => setNewRedesSociales(e.target.value)}
                  />
                </div>
              </div>

              {/* SECCIÓN 2: CARGO ECLESIÁSTICO Y BAUTISMO */}
              <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem' }}>
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    color: '#1B5CB6',
                    textTransform: 'uppercase',
                  }}
                >
                  2. Cargo Eclesiástico & Membresía
                </span>

                <div style={{ marginTop: '0.8rem' }}>
                  <label className="form-label">Cargo Eclesiástico</label>
                  <select
                    className="app-input"
                    value={newCargo}
                    onChange={(e) => setNewCargo(e.target.value as any)}
                  >
                    <option value="PASTOR / OBISPO O SIMILAR">👑 PASTOR / OBISPO O SIMILAR</option>
                    <option value="DIÁCONO / ANCIANO O SIMILAR">
                      🛡️ DIÁCONO / ANCIANO O SIMILAR
                    </option>
                    <option value="MINISTRO / COORDINADOR / LÍDER O SIMILAR">
                      ⭐ MINISTRO / COORDINADOR / LÍDER O SIMILAR
                    </option>
                    <option value="MIEMBRO GENERAL">👤 MIEMBRO GENERAL</option>
                  </select>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1rem',
                    marginTop: '0.8rem',
                  }}
                >
                  <div>
                    <label className="form-label">¿Está Bautizado?</label>
                    <select
                      className="app-input"
                      value={newBautizado ? 'si' : 'no'}
                      onChange={(e) => setNewBautizado(e.target.value === 'si')}
                    >
                      <option value="si">SÍ - Bautizado</option>
                      <option value="no">NO Bautizado</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Fecha de Membresía</label>
                    <input
                      type="date"
                      className="app-input"
                      value={newFechaMembresia}
                      onChange={(e) => setNewFechaMembresia(e.target.value)}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1rem',
                    marginTop: '0.8rem',
                  }}
                >
                  <div>
                    <label className="form-label">Grado de Instrucción</label>
                    <select
                      className="app-input"
                      value={newGradoInstruccion}
                      onChange={(e) => setNewGradoInstruccion(e.target.value)}
                    >
                      <option value="Primaria">Primaria</option>
                      <option value="Bachillerato">Bachillerato</option>
                      <option value="Técnico">Técnico Medio / TSU</option>
                      <option value="Universitario">Universitario</option>
                      <option value="Posgrado">Posgrado / Maestría</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Enfermedades / Condición Médica</label>
                    <input
                      type="text"
                      className="app-input"
                      placeholder="Ej: Alergia a la penicilina / Hipertensión"
                      value={newEnfermedad}
                      onChange={(e) => setNewEnfermedad(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN 3: ÁREAS MINISTERIALES / PILARES */}
              <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem' }}>
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    color: '#1B5CB6',
                    textTransform: 'uppercase',
                  }}
                >
                  3. Áreas Ministeriales Asignadas
                </span>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.6rem',
                    marginTop: '0.8rem',
                  }}
                >
                  {[
                    { id: 'PROCLAMACIÓN', label: '📢 PROCLAMACIÓN' },
                    { id: 'ENSEÑANZA', label: '📖 ENSEÑANZA' },
                    { id: 'SERVICIO', label: '🤝 SERVICIO' },
                    { id: 'COMPAÑERISMO', label: '👥 COMPAÑERISMO' },
                    { id: 'ADORACIÓN', label: '🎵 ADORACIÓN' },
                  ].map((area) => {
                    const isChecked = newAreas.includes(area.id as any);
                    return (
                      <button
                        key={area.id}
                        type="button"
                        onClick={() => toggleArea(area.id as any)}
                        style={{
                          padding: '0.6rem 0.8rem',
                          border: isChecked ? '2px solid #1B5CB6' : '1px solid #CBD5E1',
                          borderRadius: '10px',
                          backgroundColor: isChecked ? '#EFF6FF' : '#F8FAFC',
                          color: isChecked ? '#1B5CB6' : '#475569',
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          textAlign: 'left',
                        }}
                      >
                        {isChecked ? <CheckSquare size={16} /> : <Square size={16} />}
                        {area.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECCIÓN 4: FOTOS Y MULTIMEDIA */}
              <div>
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    color: '#1B5CB6',
                    textTransform: 'uppercase',
                  }}
                >
                  4. Fotos & Documentos
                </span>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1rem',
                    marginTop: '0.8rem',
                  }}
                >
                  <div>
                    <label className="form-label">URL Foto del Miembro (*Foto)</label>
                    <input
                      type="text"
                      className="app-input"
                      placeholder="https://..."
                      value={newFotoUrl}
                      onChange={(e) => setNewFotoUrl(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">URL Foto de la Cédula</label>
                    <input
                      type="text"
                      className="app-input"
                      placeholder="https://..."
                      value={newFotoCedulaUrl}
                      onChange={(e) => setNewFotoCedulaUrl(e.target.value)}
                    />
                  </div>
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
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn btn-outline"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    backgroundColor: '#1B5CB6',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.8rem',
                    borderRadius: '12px',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                  }}
                >
                  {submitting ? 'Guardando...' : 'Guardar Miembro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ficha 360° del Miembro */}
      <MemberProfileModal
        member={selectedMember}
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          setSelectedMember(null);
        }}
      />
    </div>
  );
};
