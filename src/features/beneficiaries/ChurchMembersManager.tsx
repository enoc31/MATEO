import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  LayoutList,
  Kanban,
  Eye,
  ArrowLeft,
  Upload,
  Camera,
  FileText,
  CheckSquare,
  Square,
  Trash2,
  Sparkles,
} from 'lucide-react';
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
  const [screenMode, setScreenMode] = useState<'directory' | 'form'>('directory');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Modal 360 profile
  const [selectedMember, setSelectedMember] = useState<Beneficiary | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Form state para la Pantalla Dedicada de Registro de Miembro
  const [newNombre, setNewNombre] = useState('');
  const [newApellido, setNewApellido] = useState('');
  const [newCedula, setNewCedula] = useState('');
  const [newSexo, setNewSexo] = useState<'Masculino' | 'Femenino'>('Masculino');
  const [newFechaNacimiento, setNewFechaNacimiento] = useState('');
  const [newDireccion, setNewDireccion] = useState('');
  const [newTelefono, setNewTelefono] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRedesSociales, setNewRedesSociales] = useState('');

  // Carga de Fotos (Previsualizaciones e imágenes en base64)
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
      const data = await api.getBeneficiaries(activeOng?.id);
      setMembers(data);
    } catch (err) {
      console.error('Error al cargar miembros:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeOng?.id) {
      loadMembers();
    }
  }, [activeOng?.id]);

  const toggleArea = (
    area: 'PROCLAMACIÓN' | 'ENSEÑANZA' | 'SERVICIO' | 'COMPAÑERISMO' | 'ADORACIÓN',
  ) => {
    setNewAreas((prev) => (prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]));
  };

  // Carga e previsualización directa de la Foto del Miembro
  const handleMemberPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      addNotification('La foto no debe pesar más de 5MB', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setNewFotoUrl(reader.result as string);
      addNotification('Foto del miembro cargada correctamente', 'info');
    };
    reader.readAsDataURL(file);
  };

  // Carga e previsualización directa de la Foto de Cédula
  const handleCedulaPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      addNotification('La imagen de la cédula no debe pesar más de 5MB', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setNewFotoCedulaUrl(reader.result as string);
      addNotification('Foto de la cédula cargada correctamente', 'info');
    };
    reader.readAsDataURL(file);
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
      setMembers((prev) => [saved, ...prev]);
      setScreenMode('directory');

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

  const [generatingSeeds, setGeneratingSeeds] = useState(false);

  const handleGenerate100Members = async () => {
    if (
      !window.confirm(
        '¿Deseas generar e insertar 100 miembros ficticios de prueba para medir la velocidad de carga de datos?',
      )
    ) {
      return;
    }
    setGeneratingSeeds(true);
    try {
      const nombres = [
        'Carlos',
        'Ana',
        'María',
        'José',
        'Luis',
        'Carmen',
        'Jesús',
        'Sofía',
        'Gabriel',
        'Elena',
        'Pedro',
        'Alejandro',
        'Andrea',
        'Diego',
        'Daniela',
        'Juan',
        'Manuel',
        'Patricia',
        'Ricardo',
        'Valentina',
      ];
      const apellidos = [
        'Rodríguez',
        'González',
        'Hernández',
        'Pérez',
        'Martínez',
        'Sánchez',
        'Díaz',
        'López',
        'Gómez',
        'Flores',
        'Morales',
        'Romero',
        'Mendoza',
        'Castillo',
        'Silva',
      ];
      const cargos = [
        'PASTOR / OBISPO O SIMILAR',
        'DIÁCONO / ANCIANO O SIMILAR',
        'MINISTRO / COORDINADOR / LÍDER O SIMILAR',
        'MIEMBRO GENERAL',
        'MIEMBRO GENERAL',
        'MIEMBRO GENERAL',
      ];
      const instruccion = ['Bachillerato', 'Técnico', 'Universitario', 'Posgrado'];

      const generated: Beneficiary[] = [];

      for (let i = 1; i <= 100; i++) {
        const nom = nombres[Math.floor(Math.random() * nombres.length)];
        const ape = apellidos[Math.floor(Math.random() * apellidos.length)];
        const cargo = cargos[Math.floor(Math.random() * cargos.length)];
        const bautizado = Math.random() > 0.25;

        const newBen: Beneficiary = {
          id: `ben-seed-${i}-${Date.now()}`,
          jornada_id: 'general-ekklesia',
          nombre: nom,
          apellido: ape,
          cedula: `V-${10000000 + Math.floor(Math.random() * 20000000)}`,
          sexo: i % 2 === 0 ? 'Femenino' : 'Masculino',
          fecha_nacimiento: '1988-05-14',
          direccion: 'Av. Bolívar, Caracas',
          telefono: `0414-${1000000 + Math.floor(Math.random() * 9000000)}`,
          email: `${nom.toLowerCase()}.${ape.toLowerCase()}${i}@gmail.com`,
          redes_sociales: `@${nom.toLowerCase()}${ape.toLowerCase()}`,
          bautizado,
          grado_instruccion: instruccion[Math.floor(Math.random() * instruccion.length)],
          enfermedad: 'Ninguna',
          fecha_membresia: '2021-01-15',
          cargo_eclesiastico: cargo as any,
          areas_ministeriales: ['PROCLAMACIÓN', 'ADORACIÓN', 'SERVICIO'],
          tipo_donacion: [bautizado ? 'Bautizado' : 'Activo', 'Ekklesia', cargo],
          url_firma: null,
          created_at: new Date(Date.now() - i * 3600000).toISOString(),
          ong_id: activeOng?.id,
        };

        await api.saveBeneficiary(newBen, undefined, activeOng?.id);
        generated.push(newBen);
      }

      setMembers((prev) => [...generated, ...prev]);
      addNotification('¡100 Miembros ficticios cargados exitosamente!', 'success');
    } catch (err) {
      console.error('Error generando miembros:', err);
      addNotification('Error al generar miembros ficticios', 'warning');
    } finally {
      setGeneratingSeeds(false);
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

  // --- PANTALLA 2: FORMULARIO DEDICADO DE REGISTRO DE MIEMBRO (NUEVA PANTALLA COMPLETA) ---
  if (screenMode === 'form') {
    return (
      <div
        className="animate-fade-in-up"
        style={{ maxWidth: '1000px', margin: '0 auto', padding: '1rem' }}
      >
        {/* Encabezado con Botón de Regreso */}
        <div
          style={{
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <button
              type="button"
              onClick={() => setScreenMode('directory')}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#1B5CB6',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.5rem',
              }}
            >
              <ArrowLeft size={18} /> Volver al Padrón de Miembros
            </button>
            <h2
              style={{ color: 'var(--primary)', fontSize: '1.85rem', fontWeight: 900, margin: 0 }}
            >
              📝 Ficha de Registro de Miembro
            </h2>
            <p style={{ color: '#64748B', fontSize: '0.9rem', marginTop: '0.2rem', margin: 0 }}>
              Ingresa de forma cómoda y detallada la información personal, eclesiástica y multimedia
              del feligrés.
            </p>
          </div>
        </div>

        {formError && (
          <div
            style={{
              backgroundColor: '#FEE2E2',
              color: '#991B1B',
              padding: '1rem',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '0.9rem',
              marginBottom: '1.5rem',
              border: '1px solid #FCA5A5',
            }}
          >
            {formError}
          </div>
        )}

        <form
          onSubmit={handleCreateMember}
          style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem' }}
        >
          {/* SECCIÓN 1: FOTO DEL MIEMBRO Y FOTO DE CÉDULA (SUBIDA INTERACTIVA) */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              padding: '1.8rem',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
            }}
          >
            <h3
              style={{
                fontSize: '1.1rem',
                fontWeight: 900,
                color: '#1B5CB6',
                marginTop: 0,
                marginBottom: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Camera size={20} /> 1. Fotografías e Identificación Digital
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1.8rem',
              }}
            >
              {/* Carga de Foto del Miembro */}
              <div
                style={{
                  border: '2px dashed #CBD5E1',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  textAlign: 'center',
                  backgroundColor: '#F8FAFC',
                  position: 'relative',
                }}
              >
                <span
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    color: '#0F172A',
                    display: 'block',
                    marginBottom: '0.8rem',
                  }}
                >
                  FOTO DEL MIEMBRO (*Foto)
                </span>

                {newFotoUrl ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.8rem',
                    }}
                  >
                    <img
                      src={newFotoUrl}
                      alt="Previsualización Miembro"
                      style={{
                        width: '130px',
                        height: '130px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '3px solid #1B5CB6',
                        boxShadow: '0 6px 16px rgba(0,0,0,0.1)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setNewFotoUrl('')}
                      style={{
                        backgroundColor: '#FEE2E2',
                        color: '#991B1B',
                        border: 'none',
                        padding: '0.4rem 0.8rem',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      <Trash2 size={14} /> Eliminar / Cambiar Foto
                    </button>
                  </div>
                ) : (
                  <div>
                    <Camera size={36} color="#94A3B8" style={{ margin: '0 auto 0.6rem auto' }} />
                    <p
                      style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}
                    >
                      Arrastra o haz clic para subir la foto del feligrés
                    </p>
                    <p style={{ margin: '0.3rem 0 1rem 0', fontSize: '0.75rem', color: '#94A3B8' }}>
                      Formatos JPG, PNG (Máx 5MB)
                    </p>
                    <label
                      style={{
                        backgroundColor: '#1B5CB6',
                        color: 'white',
                        padding: '0.6rem 1.2rem',
                        borderRadius: '10px',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <Upload size={16} /> Buscar Archivo de Foto
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleMemberPhotoUpload}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Carga de Foto de la Cédula */}
              <div
                style={{
                  border: '2px dashed #CBD5E1',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  textAlign: 'center',
                  backgroundColor: '#F8FAFC',
                  position: 'relative',
                }}
              >
                <span
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    color: '#0F172A',
                    display: 'block',
                    marginBottom: '0.8rem',
                  }}
                >
                  FOTO DE CÉDULA DE IDENTIDAD
                </span>

                {newFotoCedulaUrl ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.8rem',
                    }}
                  >
                    <img
                      src={newFotoCedulaUrl}
                      alt="Previsualización Cédula"
                      style={{
                        maxHeight: '130px',
                        maxWidth: '100%',
                        borderRadius: '12px',
                        objectFit: 'contain',
                        border: '2px solid #CBD5E1',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setNewFotoCedulaUrl('')}
                      style={{
                        backgroundColor: '#FEE2E2',
                        color: '#991B1B',
                        border: 'none',
                        padding: '0.4rem 0.8rem',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      <Trash2 size={14} /> Eliminar / Cambiar Cédula
                    </button>
                  </div>
                ) : (
                  <div>
                    <FileText size={36} color="#94A3B8" style={{ margin: '0 auto 0.6rem auto' }} />
                    <p
                      style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}
                    >
                      Arrastra o haz clic para subir imagen de la Cédula
                    </p>
                    <p style={{ margin: '0.3rem 0 1rem 0', fontSize: '0.75rem', color: '#94A3B8' }}>
                      Fotografía del documento legible (Máx 5MB)
                    </p>
                    <label
                      style={{
                        backgroundColor: '#334155',
                        color: 'white',
                        padding: '0.6rem 1.2rem',
                        borderRadius: '10px',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <Upload size={16} /> Subir Imagen de Cédula
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCedulaPhotoUpload}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: DATOS PERSONALES DE IDENTIFICACIÓN Y CONTACTO */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              padding: '1.8rem',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
            }}
          >
            <h3
              style={{
                fontSize: '1.1rem',
                fontWeight: 900,
                color: '#1B5CB6',
                marginTop: 0,
                marginBottom: '1.2rem',
              }}
            >
              👤 2. Información Personal y de Contacto
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.2rem',
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
              <div>
                <label className="form-label">Cédula de Identidad</label>
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
              <div>
                <label className="form-label">Teléfono de Contacto</label>
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
                  placeholder="miembro@iglesia.org"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
              <div>
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

            <div style={{ marginTop: '1.2rem' }}>
              <label className="form-label">Dirección de Habitación</label>
              <input
                type="text"
                className="app-input"
                placeholder="Ej: Av. Bolivar, Res. Las Palmeras, Apto 4-B, Caracas"
                value={newDireccion}
                onChange={(e) => setNewDireccion(e.target.value)}
              />
            </div>
          </div>

          {/* SECCIÓN 3: CARGO ECLESIÁSTICO, BAUTISMO Y SALUD */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              padding: '1.8rem',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
            }}
          >
            <h3
              style={{
                fontSize: '1.1rem',
                fontWeight: 900,
                color: '#1B5CB6',
                marginTop: 0,
                marginBottom: '1.2rem',
              }}
            >
              🛡️ 3. Cargo Eclesiástico, Membresía & Salud
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.2rem',
              }}
            >
              <div>
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

              <div>
                <label className="form-label">¿Está Bautizado?</label>
                <select
                  className="app-input"
                  value={newBautizado ? 'si' : 'no'}
                  onChange={(e) => setNewBautizado(e.target.value === 'si')}
                >
                  <option value="si">SÍ - Bautizado en Aguas</option>
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
            </div>

            <div style={{ marginTop: '1.2rem' }}>
              <label className="form-label">Enfermedades / Condiciones Médicas</label>
              <input
                type="text"
                className="app-input"
                placeholder="Ej: Alergia a medicamentos / Hipertensión / Diabetes"
                value={newEnfermedad}
                onChange={(e) => setNewEnfermedad(e.target.value)}
              />
            </div>
          </div>

          {/* SECCIÓN 4: ÁREAS MINISTERIALES ASIGNADAS */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              padding: '1.8rem',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
            }}
          >
            <h3
              style={{
                fontSize: '1.1rem',
                fontWeight: 900,
                color: '#1B5CB6',
                marginTop: 0,
                marginBottom: '0.4rem',
              }}
            >
              🏛️ 4. Áreas Ministeriales Asignadas (5 Pilares)
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '1.2rem' }}>
              Selecciona las áreas de ministerio en las que sirve o apoya activamente el miembro en
              la iglesia.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.8rem',
              }}
            >
              {[
                { id: 'PROCLAMACIÓN', label: '📢 PROCLAMACIÓN', sub: 'Evangelismo & Misiones' },
                { id: 'ENSEÑANZA', label: '📖 ENSEÑANZA', sub: 'Discipulado & Educación' },
                { id: 'SERVICIO', label: '🤝 SERVICIO', sub: 'Diaconía & Logística' },
                {
                  id: 'COMPAÑERISMO',
                  label: '👥 COMPAÑERISMO',
                  sub: 'Grupos Pequeños & Integración',
                },
                { id: 'ADORACIÓN', label: '🎵 ADORACIÓN', sub: 'Alabanza & Música' },
              ].map((area) => {
                const isChecked = newAreas.includes(area.id as any);
                return (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => toggleArea(area.id as any)}
                    style={{
                      padding: '1rem',
                      border: isChecked ? '2px solid #1B5CB6' : '1px solid #CBD5E1',
                      borderRadius: '14px',
                      backgroundColor: isChecked ? '#EFF6FF' : '#F8FAFC',
                      color: isChecked ? '#1B5CB6' : '#475569',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.3rem',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      boxShadow: isChecked ? '0 4px 12px rgba(27, 92, 182, 0.12)' : 'none',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontWeight: 900,
                        fontSize: '0.9rem',
                      }}
                    >
                      <span>{area.label}</span>
                      {isChecked ? (
                        <CheckSquare size={18} color="#1B5CB6" />
                      ) : (
                        <Square size={18} color="#94A3B8" />
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: isChecked ? '#1E40AF' : '#94A3B8',
                      }}
                    >
                      {area.sub}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* BARRA INFERIOR DE ACCIONES */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '1rem',
              marginTop: '1rem',
              paddingBottom: '2rem',
            }}
          >
            <button
              type="button"
              onClick={() => setScreenMode('directory')}
              className="btn btn-outline"
              style={{ padding: '0.85rem 1.8rem', borderRadius: '12px', fontWeight: 800 }}
            >
              Cancelar / Volver
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                backgroundColor: '#1B5CB6',
                color: 'white',
                border: 'none',
                padding: '0.85rem 2.2rem',
                borderRadius: '12px',
                fontWeight: 900,
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(27, 92, 182, 0.3)',
              }}
            >
              {submitting ? 'Guardando Registro...' : '💾 Guardar Miembro en Padrón'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // --- PANTALLA 1: DIRECTORIO DE MIEMBROS (LISTA Y KANBAN) ---
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

        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleGenerate100Members}
            disabled={generatingSeeds}
            style={{
              backgroundColor: '#F1F5F9',
              color: '#1E293B',
              border: '1px solid #CBD5E1',
              padding: '0.75rem 1.2rem',
              borderRadius: '12px',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Sparkles size={18} color="#D97706" />
            {generatingSeeds ? 'Generando 100 Miembros...' : '⚡ Cargar 100 Miembros Ficticios'}
          </button>

          <button
            onClick={() => setScreenMode('form')}
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
