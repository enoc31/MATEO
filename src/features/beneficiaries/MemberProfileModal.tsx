import React, { useState, useEffect } from 'react';
import { X, User, HeartHandshake, Printer, ShieldCheck, Image as ImageIcon } from 'lucide-react';
import { api, type Beneficiary, type Donation } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface MemberProfileModalProps {
  member: Beneficiary | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export const MemberProfileModal: React.FC<MemberProfileModalProps> = ({
  member,
  isOpen,
  onClose,
}) => {
  const { activeOng } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'info' | 'ecclesiastical' | 'docs' | 'donations' | 'carnet'
  >('info');
  const [memberDonations, setMemberDonations] = useState<Donation[]>([]);
  const [loadingDonations, setLoadingDonations] = useState(false);

  const isEkklesia = activeOng?.tipo_organizacion === 'ekklesia';

  useEffect(() => {
    const fetchMemberDonations = async () => {
      if (!member) return;
      setLoadingDonations(true);
      try {
        const allIncomes = await api.getDonations();
        const fullName = `${member.nombre} ${member.apellido}`.toLowerCase().trim();
        const memberCedula = member.cedula?.toLowerCase().trim();

        const matched = allIncomes.filter((inc: Donation) => {
          const donName = (inc.donante || '').toLowerCase().trim();
          return (
            donName.includes(fullName) ||
            fullName.includes(donName) ||
            (memberCedula && donName.includes(memberCedula))
          );
        });

        setMemberDonations(matched);
      } catch (err) {
        console.error('Error al cargar historial de ingresos:', err);
      } finally {
        setLoadingDonations(false);
      }
    };

    if (member && isOpen) {
      fetchMemberDonations();
    }
  }, [member, isOpen]);

  if (!isOpen || !member) return null;

  // Calculate financial metrics for this member
  const totalUSD = memberDonations
    .filter((d) => d.moneda === 'USD')
    .reduce((sum, d) => sum + (Number(d.monto) || 0), 0);

  const totalVES = memberDonations
    .filter((d) => d.moneda === 'VES')
    .reduce((sum, d) => sum + (Number(d.monto_ves || d.monto_original) || 0), 0);

  const handlePrintCarnet = () => {
    window.print();
  };

  const cargoDisplay = member.cargo_eclesiastico || 'MIEMBRO GENERAL';
  const bautizadoText = member.bautizado ? 'SÍ' : 'NO';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="animate-fade-in-up"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          maxWidth: '820px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado del Perfil */}
        <div
          style={{
            backgroundColor: '#1B5CB6',
            color: 'white',
            padding: '1.8rem 2rem',
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            position: 'relative',
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1.2rem',
              right: '1.2rem',
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              color: 'white',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.4rem' }}>
            {/* Foto del Miembro o Avatar */}
            {member.foto_url ? (
              <img
                src={member.foto_url}
                alt={`${member.nombre} ${member.apellido}`}
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid white',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  backgroundColor: 'white',
                  color: '#1B5CB6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  fontWeight: 900,
                  boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                  flexShrink: 0,
                }}
              >
                {member.nombre?.[0]?.toUpperCase()}
                {member.apellido?.[0]?.toUpperCase()}
              </div>
            )}

            <div>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}
              >
                <span
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.25)',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '999px',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                  }}
                >
                  {cargoDisplay}
                </span>
                <span
                  style={{
                    backgroundColor: member.bautizado ? '#22C55E' : '#F59E0B',
                    color: 'white',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '999px',
                  }}
                >
                  Bautizado: {bautizadoText}
                </span>
              </div>

              <h2 style={{ fontSize: '1.7rem', fontWeight: 900, margin: '0.3rem 0 0.1rem 0' }}>
                {member.nombre} {member.apellido}
              </h2>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>
                C.I.: <strong>{member.cedula || 'No indicada'}</strong> · ID:{' '}
                <strong>{member.id.substring(0, 8)}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Pestañas de Navegación de la Ficha */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            borderBottom: '2px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            padding: '0.5rem 1rem 0 1rem',
            overflowX: 'auto',
            overflowY: 'hidden',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            flexShrink: 0,
          }}
        >
          {[
            { id: 'info', label: 'Datos Personales', icon: <User size={16} /> },
            {
              id: 'ecclesiastical',
              label: 'Eclesiástico & Ministerios',
              icon: <ShieldCheck size={16} />,
            },
            { id: 'docs', label: 'Fotos & Documentos', icon: <ImageIcon size={16} /> },
            {
              id: 'donations',
              label: isEkklesia ? 'Diezmos y Ofrendas' : 'Aportes',
              icon: <HeartHandshake size={16} />,
            },
            { id: 'carnet', label: 'Carnet Digital', icon: <Printer size={16} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '0.75rem 1.1rem',
                border: 'none',
                backgroundColor: activeTab === tab.id ? '#FFFFFF' : 'transparent',
                fontWeight: activeTab === tab.id ? 800 : 600,
                color: activeTab === tab.id ? '#1B5CB6' : '#64748B',
                borderTopLeftRadius: '12px',
                borderTopRightRadius: '12px',
                borderBottom: activeTab === tab.id ? '3px solid #1B5CB6' : '3px solid transparent',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.88rem',
                lineHeight: 1.4,
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                boxShadow: activeTab === tab.id ? '0 -2px 10px rgba(0,0,0,0.03)' : 'none',
                marginBottom: '-2px',
                flexShrink: 0,
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Contenido de las Pestañas */}
        <div style={{ padding: '1.8rem 2rem', flex: 1 }}>
          {/* TAB 1: DATOS PERSONALES */}
          {activeTab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '1rem',
                }}
              >
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 800 }}>
                    CÉDULA DE IDENTIDAD
                  </span>
                  <div
                    style={{
                      fontSize: '1rem',
                      fontWeight: 800,
                      color: '#0F172A',
                      marginTop: '0.2rem',
                    }}
                  >
                    {member.cedula || 'No registrada'}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 800 }}>
                    FECHA DE NACIMIENTO
                  </span>
                  <div
                    style={{
                      fontSize: '1rem',
                      fontWeight: 800,
                      color: '#0F172A',
                      marginTop: '0.2rem',
                    }}
                  >
                    {member.fecha_nacimiento
                      ? new Date(member.fecha_nacimiento).toLocaleDateString('es-VE')
                      : 'No registrada'}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 800 }}>
                    SEXO
                  </span>
                  <div
                    style={{
                      fontSize: '1rem',
                      fontWeight: 800,
                      color: '#0F172A',
                      marginTop: '0.2rem',
                    }}
                  >
                    {member.sexo || 'No indicado'}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 800 }}>
                    TELÉFONO DE CONTACTO
                  </span>
                  <div
                    style={{
                      fontSize: '1rem',
                      fontWeight: 800,
                      color: '#0F172A',
                      marginTop: '0.2rem',
                    }}
                  >
                    {member.telefono || 'No registrado'}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 800 }}>
                    CORREO ELECTRÓNICO
                  </span>
                  <div
                    style={{
                      fontSize: '1rem',
                      fontWeight: 800,
                      color: '#0F172A',
                      marginTop: '0.2rem',
                    }}
                  >
                    {member.email || 'No registrado'}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 800 }}>
                    REDES SOCIALES
                  </span>
                  <div
                    style={{
                      fontSize: '1rem',
                      fontWeight: 800,
                      color: '#0F172A',
                      marginTop: '0.2rem',
                    }}
                  >
                    {member.redes_sociales || 'No registradas'}
                  </div>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                }}
              >
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 800 }}>
                  DIRECCIÓN DE HABITACIÓN
                </span>
                <div
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: '#0F172A',
                    marginTop: '0.2rem',
                  }}
                >
                  {member.direccion || 'No registrada'}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 800 }}>
                    GRADO DE INSTRUCCIÓN
                  </span>
                  <div
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      color: '#0F172A',
                      marginTop: '0.2rem',
                    }}
                  >
                    {member.grado_instruccion || 'No indicado'}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#FEF2F2',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '1px solid #FCA5A5',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', color: '#991B1B', fontWeight: 800 }}>
                    ENFERMEDADES / CONDICIONES MÉDICAS
                  </span>
                  <div
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      color: '#7F1D1D',
                      marginTop: '0.2rem',
                    }}
                  >
                    {member.enfermedad || 'Ninguna registrada'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INFORMACIÓN ECLESIÁSTICA & MINISTERIOS */}
          {activeTab === 'ecclesiastical' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '1rem',
                }}
              >
                <div
                  style={{
                    backgroundColor: '#EFF6FF',
                    padding: '1.2rem',
                    borderRadius: '14px',
                    border: '1px solid #BFDBFE',
                  }}
                >
                  <span style={{ fontSize: '0.78rem', color: '#1E40AF', fontWeight: 800 }}>
                    CARGO ECLESIÁSTICO
                  </span>
                  <div
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: 900,
                      color: '#1E3A8A',
                      marginTop: '0.3rem',
                    }}
                  >
                    {cargoDisplay}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#F0FDF4',
                    padding: '1.2rem',
                    borderRadius: '14px',
                    border: '1px solid #A7F3D0',
                  }}
                >
                  <span style={{ fontSize: '0.78rem', color: '#15803D', fontWeight: 800 }}>
                    ESTADO DE BAUTISMO
                  </span>
                  <div
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: 900,
                      color: '#166534',
                      marginTop: '0.3rem',
                    }}
                  >
                    {member.bautizado ? 'SÍ - BAUTIZADO' : 'NO BAUTIZADO'}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#FAF5FF',
                    padding: '1.2rem',
                    borderRadius: '14px',
                    border: '1px solid #E9D5FF',
                  }}
                >
                  <span style={{ fontSize: '0.78rem', color: '#7E22CE', fontWeight: 800 }}>
                    FECHA DE MEMBRESÍA
                  </span>
                  <div
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: 900,
                      color: '#6B21A8',
                      marginTop: '0.3rem',
                    }}
                  >
                    {member.fecha_membresia
                      ? new Date(member.fecha_membresia).toLocaleDateString('es-VE')
                      : 'Fecha de alta inicial'}
                  </div>
                </div>
              </div>

              {/* ÁREAS MINISTERIALES / PILARES */}
              <div>
                <h4
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    color: '#0F172A',
                    marginBottom: '0.8rem',
                  }}
                >
                  🏛️ Áreas Ministeriales asignadas:
                </h4>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  {[
                    {
                      id: 'PROCLAMACIÓN',
                      label: '📢 PROCLAMACIÓN (Evangelismo)',
                      bg: '#FEF3C7',
                      color: '#92400E',
                    },
                    {
                      id: 'ENSEÑANZA',
                      label: '📖 ENSEÑANZA (Discipulado)',
                      bg: '#DBEAFE',
                      color: '#1E40AF',
                    },
                    {
                      id: 'SERVICIO',
                      label: '🤝 SERVICIO (Diaconía)',
                      bg: '#DCFCE7',
                      color: '#166534',
                    },
                    {
                      id: 'COMPAÑERISMO',
                      label: '👥 COMPAÑERISMO (Grupos Pequeños)',
                      bg: '#F3E8FF',
                      color: '#6B21A8',
                    },
                    {
                      id: 'ADORACIÓN',
                      label: '🎵 ADORACIÓN (Alabanza)',
                      bg: '#FCE7F3',
                      color: '#9D174D',
                    },
                  ].map((area) => {
                    const isAssigned = member.areas_ministeriales?.includes(area.id as any);
                    return (
                      <span
                        key={area.id}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '12px',
                          fontSize: '0.85rem',
                          fontWeight: 800,
                          backgroundColor: isAssigned ? area.bg : '#F1F5F9',
                          color: isAssigned ? area.color : '#94A3B8',
                          border: isAssigned ? `2px solid ${area.color}40` : '1px solid #CBD5E1',
                          opacity: isAssigned ? 1 : 0.6,
                        }}
                      >
                        {area.label} {isAssigned ? '✓' : ''}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FOTOS & DOCUMENTOS */}
          {activeTab === 'docs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '1.4rem',
                }}
              >
                {/* Foto del Miembro */}
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                    padding: '1.2rem',
                    textAlign: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      color: '#475569',
                      display: 'block',
                      marginBottom: '0.8rem',
                    }}
                  >
                    FOTO DEL MIEMBRO
                  </span>
                  {member.foto_url ? (
                    <img
                      src={member.foto_url}
                      alt="Foto Miembro"
                      style={{ maxHeight: '160px', borderRadius: '12px', objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      style={{
                        padding: '2rem',
                        backgroundColor: '#E2E8F0',
                        borderRadius: '12px',
                        color: '#64748B',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                      }}
                    >
                      Sin Foto Subida
                    </div>
                  )}
                </div>

                {/* Foto de la Cédula */}
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                    padding: '1.2rem',
                    textAlign: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      color: '#475569',
                      display: 'block',
                      marginBottom: '0.8rem',
                    }}
                  >
                    FOTO DE CÉDULA DE IDENTIDAD
                  </span>
                  {member.foto_cedula_url ? (
                    <img
                      src={member.foto_cedula_url}
                      alt="Foto Cédula"
                      style={{ maxHeight: '160px', borderRadius: '12px', objectFit: 'contain' }}
                    />
                  ) : (
                    <div
                      style={{
                        padding: '2rem',
                        backgroundColor: '#E2E8F0',
                        borderRadius: '12px',
                        color: '#64748B',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                      }}
                    >
                      Sin Foto de Cédula
                    </div>
                  )}
                </div>

                {/* Firma Autógrafa */}
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                    padding: '1.2rem',
                    textAlign: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      color: '#475569',
                      display: 'block',
                      marginBottom: '0.8rem',
                    }}
                  >
                    FIRMA REGISTRADA
                  </span>
                  {member.url_firma ? (
                    <img
                      src={member.url_firma}
                      alt="Firma Miembro"
                      style={{
                        maxHeight: '100px',
                        backgroundColor: 'white',
                        padding: '0.5rem',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        padding: '2rem',
                        backgroundColor: '#E2E8F0',
                        borderRadius: '12px',
                        color: '#64748B',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                      }}
                    >
                      Sin Firma Registrada
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: HISTORIAL DE DIEZMOS */}
          {activeTab === 'donations' && (
            <div>
              {/* Tarjetas Resumen Financiero */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1.5rem',
                }}
              >
                <div
                  style={{
                    backgroundColor: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    borderRadius: '14px',
                    padding: '1.2rem',
                  }}
                >
                  <span style={{ fontSize: '0.78rem', color: '#047857', fontWeight: 800 }}>
                    TOTAL APORTADO (USD)
                  </span>
                  <div
                    style={{
                      fontSize: '1.8rem',
                      fontWeight: 900,
                      color: '#065F46',
                      marginTop: '0.2rem',
                    }}
                  >
                    ${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    borderRadius: '14px',
                    padding: '1.2rem',
                  }}
                >
                  <span style={{ fontSize: '0.78rem', color: '#1E40AF', fontWeight: 800 }}>
                    TOTAL APORTADO (VES)
                  </span>
                  <div
                    style={{
                      fontSize: '1.8rem',
                      fontWeight: 900,
                      color: '#1E3A8A',
                      marginTop: '0.2rem',
                    }}
                  >
                    Bs. {totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {loadingDonations ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>
                  Cargando historial de diezmos...
                </div>
              ) : memberDonations.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '2.5rem 1rem',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '14px',
                    border: '1px dashed #CBD5E1',
                  }}
                >
                  <HeartHandshake
                    size={36}
                    color="#94A3B8"
                    style={{ margin: '0 auto 0.8rem auto' }}
                  />
                  <p style={{ margin: 0, fontWeight: 700, color: '#475569' }}>
                    No se han encontrado diezmos u ofrendas vinculados a este miembro.
                  </p>
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
                          color: '#475569',
                          fontSize: '0.8rem',
                          textTransform: 'uppercase',
                        }}
                      >
                        <th style={{ padding: '0.75rem' }}>Fecha</th>
                        <th style={{ padding: '0.75rem' }}>Concepto</th>
                        <th style={{ padding: '0.75rem' }}>Método</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {memberDonations.map((d) => (
                        <tr key={d.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '0.85rem 0.75rem', fontWeight: 600 }}>
                            {new Date(d.fecha).toLocaleDateString('es-VE')}
                          </td>
                          <td style={{ padding: '0.85rem 0.75rem' }}>
                            {d.descripcion || 'Diezmo / Ofrenda'}
                          </td>
                          <td style={{ padding: '0.85rem 0.75rem' }}>
                            <span
                              style={{
                                backgroundColor: '#F1F5F9',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                              }}
                            >
                              {d.medio_pago}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: '0.85rem 0.75rem',
                              textAlign: 'right',
                              fontWeight: 800,
                              color: '#10B981',
                            }}
                          >
                            {d.moneda === 'VES' ? 'Bs. ' : '$ '}
                            {Number(d.monto).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: CARNET DIGITAL */}
          {activeTab === 'carnet' && (
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  maxWidth: '380px',
                  margin: '0 auto 1.5rem auto',
                  backgroundColor: '#1B5CB6',
                  color: 'white',
                  borderRadius: '16px',
                  padding: '1.8rem 1.5rem',
                  boxShadow: '0 12px 30px rgba(27, 92, 182, 0.25)',
                  textAlign: 'left',
                  position: 'relative',
                  border: '2px solid #FFFFFF',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(255,255,255,0.2)',
                    paddingBottom: '0.8rem',
                    marginBottom: '1rem',
                  }}
                >
                  <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                    {activeOng?.nombre || 'MATEO ekklesia'}
                  </div>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      backgroundColor: 'white',
                      color: '#1B5CB6',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                    }}
                  >
                    CARNET DE MIEMBRO
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
                  {member.foto_url ? (
                    <img
                      src={member.foto_url}
                      alt="Foto"
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid white',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        backgroundColor: 'white',
                        color: '#1B5CB6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                        fontWeight: 900,
                        flexShrink: 0,
                      }}
                    >
                      {member.nombre?.[0]?.toUpperCase()}
                      {member.apellido?.[0]?.toUpperCase()}
                    </div>
                  )}

                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
                      {member.nombre} {member.apellido}
                    </h3>
                    <p style={{ margin: '0.3rem 0 0 0', opacity: 0.9, fontSize: '0.82rem' }}>
                      C.I.: <strong>{member.cedula}</strong>
                    </p>
                    <p style={{ margin: '0.1rem 0 0 0', opacity: 0.8, fontSize: '0.78rem' }}>
                      Rol: {cargoDisplay}
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: '1.2rem',
                    paddingTop: '0.8rem',
                    borderTop: '1px solid rgba(255,255,255,0.2)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                    ID: {member.id.substring(0, 8)}
                  </span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>
                    MATEO EKKLESIA VERIFIED
                  </span>
                </div>
              </div>

              <button
                onClick={handlePrintCarnet}
                style={{
                  padding: '0.85rem 1.8rem',
                  backgroundColor: '#1B5CB6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 14px rgba(27, 92, 182, 0.25)',
                }}
              >
                <Printer size={18} /> Imprimir Carnet del Miembro
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
