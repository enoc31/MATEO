import React, { useState, useEffect, useCallback } from 'react';
import { Building2, Upload, Save, X, AlertCircle, Lock, Trash2, CheckCircle2 } from 'lucide-react';
import { api, type Ong, type UpdateOngParams } from '../../services/api';
import { uploadToGCS } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../components/NotificationProvider';
import { LocationSelector } from '../../components/LocationSelector';
import { formatFullAddress, parseFullAddress } from '../../data/venezuelaLocations';
import './OrganizationProfile.css';

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
    profile?.rol === 'admin_iglesia' ||
    profile?.rol === 'director' ||
    profile?.rol === 'super_admin';

  const populateFields = useCallback((ong: Ong) => {
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
  }, []);

  const loadOrganization = useCallback(async () => {
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
    } catch (err: unknown) {
      console.error('Error al cargar datos de la organización:', err);
      const msg = err instanceof Error ? err.message : 'Error al cargar los datos.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [targetOngId, populateFields]);

  useEffect(() => {
    loadOrganization();
  }, [loadOrganization]);

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
    } catch (err: unknown) {
      console.error('Error al actualizar organización:', err);
      const msg = err instanceof Error ? err.message : 'Error al guardar los cambios';
      addNotification(msg, 'warning');
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
          style={{ margin: '0 auto 1rem auto', color: 'var(--primary, #1B5CB6)' }}
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
            type="button"
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
    <div className="op-container animate-fade-in-up">
      {/* Encabezado del perfil (Figma node 233:6) */}
      <div className="op-header">
        <div className="op-header-copy">
          <h1 className="op-title">
            {isEkklesia ? 'Perfil de la iglesia' : 'Perfil de la organización'}
          </h1>
          <p className="op-subtitle">
            Consulta y gestiona la información legal, la ubicación y los datos de contacto de tu{' '}
            {isEkklesia ? 'iglesia' : 'organización'}.
          </p>
        </div>

        {canEdit && !isEditing && (
          <button type="button" onClick={() => setIsEditing(true)} className="op-edit-btn">
            Editar datos de la organización
          </button>
        )}
      </div>

      {/* Identidad de la iglesia (Figma node 233:7) */}
      <section className="op-identity-card" aria-label="Identidad de la organización">
        <div className="op-logo-box">
          {ongData.logo_url ? (
            <img src={ongData.logo_url} alt={ongData.nombre} className="op-logo-img" />
          ) : (
            <Building2 size={44} color="#94A3B8" />
          )}
        </div>

        <div className="op-identity-main">
          <div className="op-badges-row">
            <span className="op-org-type-badge">
              {isEkklesia ? 'IGLESIA / EKKLESIA' : 'ORGANIZACIÓN HUMANITARIA'}
            </span>
            {ongData.estado === 'trial' && (
              <span className="op-trial-inline">Prueba gratuita · 14 días</span>
            )}
          </div>

          <h2 className="op-org-name">{ongData.nombre}</h2>

          <div className="op-org-id-block">
            <span className="op-org-id-label">ID de organización (clave primaria)</span>
            <span className="op-org-id-value">{ongData.id}</span>
          </div>
        </div>

        {daysRemaining !== null && ongData.estado === 'trial' && (
          <div className="op-trial-card">
            <span className="op-trial-label">TIEMPO DE PRUEBA</span>
            <span className="op-trial-days">{daysRemaining} días</span>
            <span className="op-trial-sub">restantes del Trial</span>
          </div>
        )}
      </section>

      {/* FORMULARIO DE EDICIÓN O VISTA DE CONSULTA */}
      {isEditing ? (
        <form onSubmit={handleSave} className="op-edit-form">
          <div className="op-section-card">
            <h3 className="op-section-title">Editar información general e identificación</h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.2rem',
              }}
            >
              <div>
                <label className="form-label">Nombre oficial de la organización / iglesia *</label>
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
                  <Lock size={14} color="#64748B" /> RIF / Identificación legal (Inmutable)
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
                  El RIF/Cédula es la identidad primaria. Si fue cargado con error, la organización
                  debe eliminarse y registrarse de nuevo.
                </span>
              </div>

              <div>
                <label className="form-label">Teléfono oficial de contacto</label>
                <input
                  type="text"
                  className="app-input"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej. 0212-1234567 / 0414-7654321"
                />
              </div>

              <div>
                <label className="form-label">Sitio web / Redes sociales</label>
                <input
                  type="text"
                  className="app-input"
                  value={sitioWeb}
                  onChange={(e) => setSitioWeb(e.target.value)}
                  placeholder="Ej. https://miiglesia.org"
                />
              </div>
            </div>

            {/* Carga Interactiva del Logo */}
            <div style={{ paddingTop: '1rem', borderTop: '1px dashed var(--border-color)' }}>
              <label
                className="form-label"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Building2 size={16} color="var(--primary, #1B5CB6)" /> Logo / Insignia de la
                organización
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
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: '#FFFFFF',
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
                    <span
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: 'var(--secondary, #2D6A4F)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      <CheckCircle2 size={16} /> Logotipo cargado y almacenado
                    </span>
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      style={{
                        backgroundColor: '#FEE2E2',
                        color: '#991B1B',
                        border: 'none',
                        padding: '0.45rem 0.85rem',
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: '0.82rem',
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
                        backgroundColor: 'var(--primary, #1B5CB6)',
                        color: 'white',
                        padding: '0.65rem 1.2rem',
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: uploadingLogo ? 'wait' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <Upload size={16} />{' '}
                      {uploadingLogo ? 'Subiendo imagen...' : 'Subir imagen de logo'}
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
                      Formatos soportados: PNG, JPG, WEBP.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Selector Estructurado de Ubicación (Venezuela) */}
          <div className="op-section-card">
            <h3 className="op-section-title">Ubicación física de la sede / templo (Venezuela)</h3>

            <LocationSelector
              estado={estado}
              municipio={municipio}
              parroquia={parroquia}
              direccionDetalle={direccionDetalle}
              onChangeEstado={setEstado}
              onChangeMunicipio={setMunicipio}
              onChangeParroquia={setParroquia}
              onChangeDireccionDetalle={setDireccionDetalle}
              labelDireccion="Dirección detallada (Calle, Res., Casa/Apto, Punto de referencia)"
              placeholderDireccion="Ej. Av. Universidad, Esquina El Conde, Edif. Sede Central"
            />
          </div>

          {/* Botones de Acción de Guardado */}
          <div className="op-edit-actions">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                if (ongData) populateFields(ongData);
              }}
              className="btn btn-outline"
              style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 600 }}
              disabled={saving}
            >
              <X size={18} /> Cancelar
            </button>

            <button type="submit" disabled={saving} className="op-edit-btn">
              <Save size={18} />{' '}
              {saving ? 'Guardando cambios...' : 'Guardar datos de la organización'}
            </button>
          </div>
        </form>
      ) : (
        /* VISTA DE CONSULTA (Figma node 233:8) */
        <div className="op-info-grid">
          {/* Ficha 1: Identificación legal y contacto */}
          <div className="op-section-card">
            <h3 className="op-section-title">Identificación legal y contacto</h3>

            <div className="op-field-group">
              <span className="op-field-label">RIF / IDENTIFICACIÓN LEGAL</span>
              <span className="op-field-value">
                {ongData.rif_identificacion || 'No registrado'}
              </span>
            </div>

            <div className="op-field-group">
              <span className="op-field-label">TELÉFONO OFICIAL DE CONTACTO</span>
              <span className="op-field-value">{ongData.telefono || 'No registrado'}</span>
            </div>

            <div className="op-field-group">
              <span className="op-field-label">SITIO WEB / REDES SOCIALES</span>
              {ongData.sitio_web ? (
                <a
                  href={
                    ongData.sitio_web.startsWith('http')
                      ? ongData.sitio_web
                      : `https://${ongData.sitio_web}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="op-field-link"
                >
                  {ongData.sitio_web}
                </a>
              ) : (
                <span className="op-field-value" style={{ color: '#94A3B8', fontWeight: 500 }}>
                  No registrado
                </span>
              )}
            </div>

            <div className="op-field-group">
              <span className="op-field-label">PAÍS DE OPERACIÓN</span>
              <span className="op-field-value">{ongData.pais || 'Venezuela'}</span>
            </div>
          </div>

          {/* Ficha 2: Ubicación física y dirección de sede */}
          <div className="op-section-card">
            <h3 className="op-section-title">Ubicación física y dirección de sede</h3>

            <div className="op-loc-row">
              <div className="op-field-group">
                <span className="op-field-label">ESTADO</span>
                <span className="op-field-value">{parsedLoc.estado}</span>
              </div>

              <div className="op-field-group">
                <span className="op-field-label">MUNICIPIO</span>
                <span className="op-field-value">{parsedLoc.municipio}</span>
              </div>

              <div className="op-field-group">
                <span className="op-field-label">PARROQUIA</span>
                <span className="op-field-value">{parsedLoc.parroquia}</span>
              </div>
            </div>

            <div className="op-detail-address-box">
              <span className="op-field-label">DIRECCIÓN DETALLADA</span>
              <span className="op-detail-address-text">
                {parsedLoc.direccionDetalle || ongData.direccion || 'No registrada'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
