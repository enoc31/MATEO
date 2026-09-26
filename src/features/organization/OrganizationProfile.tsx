import React, { useState, useEffect } from 'react';
import {
  Building2,
  Phone,
  Globe,
  MapPin,
  Edit3,
  Sparkles,
  Upload,
  Save,
  X,
  AlertCircle,
  Lock,
  Key,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { api, type Ong, type UpdateOngParams } from '../../services/api';
import { uploadToGCS } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../components/NotificationProvider';
import { LocationSelector } from '../../components/LocationSelector';
import { formatFullAddress, parseFullAddress } from '../../data/venezuelaLocations';

export const OrganizationProfile: React.FC = () => {
  const { activeOng, profile, refreshProfile } = useAuth();
  const { addNotification } = useNotifications();

  const [ongData, setOngData] = useState<Ong | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form edit fields
  const [nombre, setNombre] = useState('');
  const [rifIdentificacion, setRifIdentificacion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [sitioWeb, setSitioWeb] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Structured address location fields
  const [estado, setEstado] = useState('Distrito Capital');
  const [municipio, setMunicipio] = useState('Libertador');
  const [parroquia, setParroquia] = useState('Candelaria');
  const [direccionDetalle, setDireccionDetalle] = useState('');

  const targetOngId = activeOng?.id || profile?.ong_id;
  const canEdit =
    profile?.rol === 'administrador' ||
    profile?.rol === 'director' ||
    profile?.rol === 'super_admin';

  const loadOrganization = async () => {
    if (!targetOngId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await api.getOngById(targetOngId);
      if (data) {
        setOngData(data);
        populateFields(data);
      } else {
        setError('No se encontraron los datos de la organización.');
      }
    } catch (err: any) {
      console.error('Error al cargar datos de la organización:', err);
      setError(err.message || 'Error al cargar los datos.');
    } finally {
      setLoading(false);
    }
  };

  const populateFields = (ong: Ong) => {
    setNombre(ong.nombre || '');
    setRifIdentificacion(ong.rif_identificacion || '');
    setTelefono(ong.telefono || '');
    setSitioWeb(ong.sitio_web || '');
    setLogoUrl(ong.logo_url || '');

    const parsedLoc = parseFullAddress(ong.direccion);
    setEstado(parsedLoc.estado);
    setMunicipio(parsedLoc.municipio);
    setParroquia(parsedLoc.parroquia);
    setDireccionDetalle(parsedLoc.direccionDetalle);
  };

  useEffect(() => {
    loadOrganization();
  }, [targetOngId]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const res = await uploadToGCS(file);
      if (res && res.url) {
        setLogoUrl(res.url);
        addNotification('Logo actualizado en almacenamiento seguro', 'success');
      }
    } catch (err) {
      console.warn('Error al subir logo:', err);
      addNotification('No se pudo subir la imagen del logo', 'warning');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetOngId) return;

    if (!nombre.trim()) {
      addNotification('El nombre de la organización es obligatorio', 'warning');
      return;
    }

    setSaving(true);
    try {
      const fullDireccion = formatFullAddress(estado, municipio, parroquia, direccionDetalle);

      const updates: UpdateOngParams = {
        nombre: nombre.trim(),
        rif_identificacion: rifIdentificacion.trim() || null,
        telefono: telefono.trim() || null,
        sitio_web: sitioWeb.trim() || null,
        direccion: fullDireccion,
        logo_url: logoUrl.trim() || null,
      };

      const updated = await api.updateOng(targetOngId, updates);
      setOngData(updated);
      populateFields(updated);
      setIsEditing(false);
      addNotification('Datos de la organización actualizados exitosamente', 'success');
      await refreshProfile();
    } catch (err: any) {
      console.error('Error al actualizar organización:', err);
      addNotification(err.message || 'Error al guardar los cambios', 'warning');
    } finally {
      setSaving(false);
    }
  };

  const calculateDaysRemaining = (trialEndsAt?: string | null) => {
    if (!trialEndsAt) return null;
    const end = new Date(trialEndsAt).getTime();
    const now = new Date().getTime();
    const diffDays = Math.ceil((end - now) / (1000 * 3600 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
        <Building2
          size={40}
          className="animate-spin"
          style={{ margin: '0 auto 1rem auto', color: '#1B5CB6' }}
        />
        <p style={{ fontWeight: 700 }}>Cargando datos de la organización...</p>
      </div>
    );
  }

  if (error || !ongData) {
    return (
      <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '1rem' }}>
        <div
          className="card"
          style={{
            padding: '2rem',
            textAlign: 'center',
            border: '1px solid #FCA5A5',
            backgroundColor: '#FEF2F2',
          }}
        >
          <AlertCircle size={44} color="#DC2626" style={{ margin: '0 auto 1rem auto' }} />
          <h3 style={{ color: '#991B1B', margin: 0 }}>No se pudo cargar el perfil</h3>
          <p style={{ color: '#7F1D1D', marginTop: '0.5rem' }}>
            {error || 'Organización no encontrada.'}
          </p>
          <button
            onClick={loadOrganization}
            className="btn btn-outline"
            style={{ marginTop: '1rem' }}
          >
            Reintentar Carga
          </button>
        </div>
      </div>
    );
  }

  const isEkklesia = ongData.tipo_organizacion === 'ekklesia';
  const daysRemaining = calculateDaysRemaining(ongData.trial_ends_at);
  const parsedLoc = parseFullAddress(ongData.direccion);

  return (
    <div
      className="animate-fade-in-up"
      style={{ maxWidth: '960px', margin: '0 auto', padding: '1rem 0' }}
    >
      {/* Encabezado Principal */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h2 style={{ color: 'var(--primary)', fontSize: '1.85rem', fontWeight: 900, margin: 0 }}>
            {isEkklesia ? '🏛️ Perfil de la Iglesia' : '🏢 Perfil de la Organización'}
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.9rem', marginTop: '0.25rem', margin: 0 }}>
            Consulta y gestiona la información legal, dirección estructurada y datos de contacto de
            tu {isEkklesia ? 'consecución eclesiástica' : 'ONG'}.
          </p>
        </div>

        {canEdit && !isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            style={{
              backgroundColor: '#1B5CB6',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.4rem',
              borderRadius: '12px',
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 12px rgba(27, 92, 182, 0.25)',
            }}
          >
            <Edit3 size={18} /> Editar Datos de la Organización
          </button>
        )}
      </div>

      {/* Tarjeta de Resumen e Identidad Visual */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          border: '1px solid #E2E8F0',
          padding: '1.8rem',
          marginBottom: '1.5rem',
          boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            width: '100px',
            height: '100px',
            borderRadius: '18px',
            border: '2px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0,
            boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
          }}
        >
          {ongData.logo_url ? (
            <img
              src={ongData.logo_url}
              alt={ongData.nombre}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            <Building2 size={48} color="#94A3B8" />
          )}
        </div>

        <div style={{ flex: 1, minWidth: '240px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span
              style={{
                backgroundColor: isEkklesia ? '#EFF6FF' : '#F0FDF4',
                color: isEkklesia ? '#1B5CB6' : '#166534',
                padding: '0.3rem 0.8rem',
                borderRadius: '20px',
                fontWeight: 800,
                fontSize: '0.78rem',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                border: `1px solid ${isEkklesia ? '#BFDBFE' : '#BBF7D0'}`,
              }}
            >
              {isEkklesia ? '⛪ Iglesia / Ekklesia' : '🤝 Organización Humanitaria'}
            </span>

            {ongData.estado === 'trial' && (
              <span
                style={{
                  backgroundColor: '#FEF3C7',
                  color: '#92400E',
                  padding: '0.3rem 0.8rem',
                  borderRadius: '20px',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  border: '1px solid #FDE68A',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <Sparkles size={14} /> Prueba Gratuita 14 Días
              </span>
            )}
          </div>

          <h3
            style={{
              fontSize: '1.6rem',
              fontWeight: 900,
              color: '#0F172A',
              margin: '0.5rem 0 0.3rem 0',
            }}
          >
            {ongData.nombre}
          </h3>

          <p
            style={{
              margin: 0,
              fontSize: '0.88rem',
              color: '#64748B',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Key size={14} color="#1B5CB6" /> <strong>ID de Organización (Clave Primaria):</strong>{' '}
            <code
              style={{
                backgroundColor: '#F1F5F9',
                padding: '0.15rem 0.5rem',
                borderRadius: '6px',
                fontWeight: 800,
                color: '#1E293B',
              }}
            >
              {ongData.id}
            </code>
          </p>
        </div>

        {daysRemaining !== null && ongData.estado === 'trial' && (
          <div
            style={{
              backgroundColor: '#FFFBEB',
              border: '1px solid #FCD34D',
              borderRadius: '16px',
              padding: '1rem 1.2rem',
              textAlign: 'center',
              minWidth: '160px',
            }}
          >
            <span
              style={{ fontSize: '0.75rem', fontWeight: 800, color: '#B45309', display: 'block' }}
            >
              TIEMPO DE PRUEBA
            </span>
            <span
              style={{
                fontSize: '1.8rem',
                fontWeight: 900,
                color: '#D97706',
                display: 'block',
                margin: '0.1rem 0',
              }}
            >
              {daysRemaining} días
            </span>
            <span style={{ fontSize: '0.72rem', color: '#78350F', fontWeight: 600 }}>
              restantes del Trial
            </span>
          </div>
        )}
      </div>

      {/* FORMULARIO DE EDICIÓN O VISTA DE CONSULTA */}
      {isEditing ? (
        <form
          onSubmit={handleSave}
          style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E2E8F0',
              padding: '1.8rem',
              boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
            }}
          >
            <h3
              style={{
                fontSize: '1.1rem',
                fontWeight: 900,
                color: '#1B5CB6',
                margin: '0 0 1.2rem 0',
              }}
            >
              📝 Editar Información General e Identificación
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.2rem',
              }}
            >
              <div>
                <label className="form-label">Nombre Oficial de la Organización / Iglesia *</label>
                <input
                  type="text"
                  className="app-input"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Iglesia Evangélica Bautista Central"
                  required
                />
              </div>

              <div>
                <label
                  className="form-label"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <Lock size={14} color="#64748B" /> RIF / Identificación Legal (Inmutable)
                </label>
                <input
                  type="text"
                  className="app-input"
                  value={rifIdentificacion || 'No registrado'}
                  disabled={true}
                  readOnly
                  style={{
                    backgroundColor: '#F1F5F9',
                    color: '#475569',
                    cursor: 'not-allowed',
                    fontWeight: 700,
                  }}
                />
                <span
                  style={{
                    fontSize: '0.72rem',
                    color: '#B45309',
                    fontWeight: 600,
                    marginTop: '0.3rem',
                    display: 'block',
                  }}
                >
                  🔒 El RIF/Cédula es la identidad primaria. Si fue cargado con error, la
                  organización debe eliminarse y registrarse de nuevo.
                </span>
              </div>

              <div>
                <label className="form-label">Teléfono Oficial de Contacto</label>
                <input
                  type="text"
                  className="app-input"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej. 0212-1234567 / 0414-7654321"
                />
              </div>

              <div>
                <label className="form-label">Sitio Web / Enlace Social</label>
                <input
                  type="text"
                  className="app-input"
                  value={sitioWeb}
                  onChange={(e) => setSitioWeb(e.target.value)}
                  placeholder="Ej. https://miiglesia.org"
                />
              </div>
            </div>

            {/* Carga Interactiva del Logo (Privacidad de Almacenamiento Protegida) */}
            <div
              style={{ marginTop: '1.5rem', paddingTop: '1.2rem', borderTop: '1px dashed #E2E8F0' }}
            >
              <label
                className="form-label"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Building2 size={16} color="#1B5CB6" /> Logo / Insignia de la Organización
                (Almacenamiento Protegido)
              </label>

              <div
                style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', flexWrap: 'wrap' }}
              >
                {logoUrl ? (
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}
                  >
                    <div
                      style={{
                        width: '70px',
                        height: '70px',
                        borderRadius: '12px',
                        border: '2px solid #CBD5E1',
                        backgroundColor: '#F8FAFC',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      <img
                        src={logoUrl}
                        alt="Logo de Organización"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>
                    <div>
                      <span
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 800,
                          color: '#166534',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                        }}
                      >
                        <CheckCircle2 size={16} color="#166534" /> Logotipo Creado y Almacenado
                      </span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: '#64748B',
                          display: 'block',
                          marginTop: '0.2rem',
                        }}
                      >
                        🔒 La ruta interna de almacenamiento está resguardada por privacidad.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
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
                      <Trash2 size={14} /> Eliminar / Cambiar Logo
                    </button>
                  </div>
                ) : (
                  <div>
                    <label
                      style={{
                        backgroundColor: '#1B5CB6',
                        color: 'white',
                        padding: '0.65rem 1.2rem',
                        borderRadius: '10px',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        cursor: uploadingLogo ? 'wait' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        boxShadow: '0 4px 10px rgba(27, 92, 182, 0.2)',
                      }}
                    >
                      <Upload size={16} />{' '}
                      {uploadingLogo ? 'Subiendo e encriptando...' : 'Subir Imagen de Logo'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                        style={{ display: 'none' }}
                      />
                    </label>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: '#64748B',
                        display: 'block',
                        marginTop: '0.4rem',
                      }}
                    >
                      Formatos soportados: PNG, JPG, WEBP (Guardado privado en almacenamiento
                      seguro).
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Selector Estructurado de Ubicación (Venezuela) */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E2E8F0',
              padding: '1.8rem',
              boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
            }}
          >
            <h3
              style={{
                fontSize: '1.1rem',
                fontWeight: 900,
                color: '#1B5CB6',
                margin: '0 0 1.2rem 0',
              }}
            >
              📍 Ubicación Física de la Sede / Templo (Venezuela)
            </h3>

            <LocationSelector
              estado={estado}
              municipio={municipio}
              parroquia={parroquia}
              direccionDetalle={direccionDetalle}
              onChangeEstado={setEstado}
              onChangeMunicipio={setMunicipio}
              onChangeParroquia={setParroquia}
              onChangeDireccionDetalle={setDireccionDetalle}
              labelDireccion="Dirección Detallada (Calle, Res., Casa/Apto, Punto de Referencia)"
              placeholderDireccion="Ej. Av. Universidad, Esquina El Conde, Edif. Sede Central"
            />
          </div>

          {/* Botones de Acción de Guardado */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '1rem',
              marginBottom: '2rem',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                if (ongData) populateFields(ongData);
              }}
              className="btn btn-outline"
              style={{ padding: '0.85rem 1.8rem', borderRadius: '12px', fontWeight: 800 }}
              disabled={saving}
            >
              <X size={18} /> Cancelar
            </button>

            <button
              type="submit"
              disabled={saving}
              style={{
                backgroundColor: '#1B5CB6',
                color: 'white',
                border: 'none',
                padding: '0.85rem 2.2rem',
                borderRadius: '12px',
                fontWeight: 900,
                fontSize: '1rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 6px 18px rgba(27, 92, 182, 0.3)',
              }}
            >
              <Save size={18} />{' '}
              {saving ? 'Guardando Cambios...' : 'Guardar Datos de la Organización'}
            </button>
          </div>
        </form>
      ) : (
        /* VISTA DE CONSULTA (INFORMACIÓN DETALLADA) */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {/* Ficha 1: Identificación y Contacto */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E2E8F0',
              padding: '1.8rem',
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
              📋 Identificación Legal y Contacto
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <span
                  style={{
                    fontSize: '0.78rem',
                    color: '#64748B',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    display: 'block',
                  }}
                >
                  RIF / Identificación Legal
                </span>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                  {ongData.rif_identificacion || 'No registrado'}
                </span>
              </div>

              <div>
                <span
                  style={{
                    fontSize: '0.78rem',
                    color: '#64748B',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    display: 'block',
                  }}
                >
                  Teléfono Oficial de Contacto
                </span>
                <span
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    color: '#0F172A',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <Phone size={16} color="#1B5CB6" /> {ongData.telefono || 'No registrado'}
                </span>
              </div>

              <div>
                <span
                  style={{
                    fontSize: '0.78rem',
                    color: '#64748B',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    display: 'block',
                  }}
                >
                  Sitio Web / Redes Sociales
                </span>
                {ongData.sitio_web ? (
                  <a
                    href={
                      ongData.sitio_web.startsWith('http')
                        ? ongData.sitio_web
                        : `https://${ongData.sitio_web}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: '1rem',
                      fontWeight: 800,
                      color: '#1B5CB6',
                      textDecoration: 'underline',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <Globe size={16} /> {ongData.sitio_web}
                  </a>
                ) : (
                  <span style={{ fontSize: '1rem', color: '#94A3B8', fontWeight: 600 }}>
                    No registrado
                  </span>
                )}
              </div>

              <div>
                <span
                  style={{
                    fontSize: '0.78rem',
                    color: '#64748B',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    display: 'block',
                  }}
                >
                  País de Operación
                </span>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                  🇻🇪 {ongData.pais || 'Venezuela'}
                </span>
              </div>
            </div>
          </div>

          {/* Ficha 2: Ubicación Física Estructurada */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E2E8F0',
              padding: '1.8rem',
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
              📍 Ubicación Física y Dirección de Sede
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div
                style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem' }}
              >
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    padding: '0.8rem',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: '#64748B',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      display: 'block',
                    }}
                  >
                    ESTADO
                  </span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>
                    {parsedLoc.estado}
                  </span>
                </div>

                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    padding: '0.8rem',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: '#64748B',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      display: 'block',
                    }}
                  >
                    MUNICIPIO
                  </span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>
                    {parsedLoc.municipio}
                  </span>
                </div>

                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    padding: '0.8rem',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: '#64748B',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      display: 'block',
                    }}
                  >
                    PARROQUIA
                  </span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>
                    {parsedLoc.parroquia}
                  </span>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  padding: '1rem',
                  borderRadius: '14px',
                  border: '1px solid #E2E8F0',
                  marginTop: '0.4rem',
                }}
              >
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: '#64748B',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: '0.3rem',
                  }}
                >
                  DIRECCIÓN DETALLADA
                </span>
                <div
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: '#334155',
                    display: 'flex',
                    gap: '0.5rem',
                    alignItems: 'flex-start',
                  }}
                >
                  <MapPin size={18} color="#1B5CB6" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{parsedLoc.direccionDetalle || ongData.direccion || 'No registrada'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
