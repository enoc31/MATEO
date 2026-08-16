import React, { useState, useEffect } from 'react';
import { X, User, HeartHandshake, Printer } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'info' | 'donations' | 'carnet'>('info');
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
          maxWidth: '750px',
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
            {/* Avatar / Iniciales */}
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                backgroundColor: 'white',
                color: '#1B5CB6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem',
                fontWeight: 900,
                boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                flexShrink: 0,
              }}
            >
              {member.nombre?.[0]?.toUpperCase()}
              {member.apellido?.[0]?.toUpperCase()}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '999px',
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                  }}
                >
                  {isEkklesia ? 'Feligrés / Miembro' : 'Beneficiario'}
                </span>
                <span
                  style={{
                    backgroundColor: '#22C55E',
                    color: 'white',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '999px',
                  }}
                >
                  Activo
                </span>
              </div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.3rem 0 0.1rem 0' }}>
                {member.nombre} {member.apellido}
              </h2>
              <p style={{ margin: 0, opacity: 0.88, fontSize: '0.9rem' }}>
                C.I.: <strong>{member.cedula}</strong> · Registrado el{' '}
                {new Date(member.created_at).toLocaleDateString('es-VE')}
              </p>
            </div>
          </div>
        </div>

        {/* Pestañas de Navegación de la Ficha */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            padding: '0 1rem',
          }}
        >
          {[
            { id: 'info', label: 'Datos Personales', icon: <User size={16} /> },
            {
              id: 'donations',
              label: isEkklesia ? 'Historial de Diezmos' : 'Aportes y Donaciones',
              icon: <HeartHandshake size={16} />,
            },
            { id: 'carnet', label: 'Carnet Digital', icon: <Printer size={16} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'info' | 'donations' | 'carnet')}
              style={{
                padding: '0.95rem 1.2rem',
                border: 'none',
                background: 'none',
                fontWeight: activeTab === tab.id ? 800 : 600,
                color: activeTab === tab.id ? '#1B5CB6' : '#64748B',
                borderBottom: activeTab === tab.id ? '3px solid #1B5CB6' : '3px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.9rem',
                transition: 'all 0.2s ease',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Contenido de las Pestañas */}
        <div style={{ padding: '1.8rem 2rem', flex: 1 }}>
          {/* TAB 1: Información General */}
          {activeTab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '1.2rem',
                }}
              >
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    padding: '1rem 1.2rem',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700 }}>
                    CÉDULA DE IDENTIDAD
                  </span>
                  <div
                    style={{
                      fontSize: '1.05rem',
                      fontWeight: 800,
                      color: '#0F172A',
                      marginTop: '0.2rem',
                    }}
                  >
                    {member.cedula}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    padding: '1rem 1.2rem',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700 }}>
                    SEXO / GÉNERO
                  </span>
                  <div
                    style={{
                      fontSize: '1.05rem',
                      fontWeight: 800,
                      color: '#0F172A',
                      marginTop: '0.2rem',
                    }}
                  >
                    {member.sexo}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    padding: '1rem 1.2rem',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700 }}>
                    FECHA DE NACIMIENTO
                  </span>
                  <div
                    style={{
                      fontSize: '1.05rem',
                      fontWeight: 800,
                      color: '#0F172A',
                      marginTop: '0.2rem',
                    }}
                  >
                    {member.fecha_nacimiento
                      ? new Date(member.fecha_nacimiento).toLocaleDateString('es-VE')
                      : 'No especificada'}
                  </div>
                </div>
              </div>

              {/* Firma Digital de Registro */}
              {member.url_firma && (
                <div style={{ marginTop: '0.5rem' }}>
                  <span
                    style={{
                      fontSize: '0.85rem',
                      color: '#475569',
                      fontWeight: 700,
                      display: 'block',
                      marginBottom: '0.6rem',
                    }}
                  >
                    Firma Autógrafa Registrada:
                  </span>
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '12px',
                      padding: '1rem',
                      display: 'inline-block',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                    }}
                  >
                    <img
                      src={member.url_firma}
                      alt="Firma del Miembro"
                      style={{ maxHeight: '80px', width: 'auto', objectFit: 'contain' }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Historial de Diezmos / Aportes */}
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
                  Cargando historial financiero del miembro...
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
                  <p style={{ fontSize: '0.82rem', color: '#64748B', marginTop: '0.3rem' }}>
                    Al registrar un diezmo a nombre de "{member.nombre} {member.apellido}" o C.I.{' '}
                    {member.cedula}, aparecerá automáticamente reflejado aquí.
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

          {/* TAB 3: Carnet Digital */}
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
                {/* Header del Carnet */}
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
                  <div
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      fontFamily: "'Outfit', sans-serif",
                    }}
                  >
                    {activeOng?.nombre || 'MATEO ekklesia'}
                  </div>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      letterSpacing: '1px',
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

                {/* Cuerpo del Carnet */}
                <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
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
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
                      {member.nombre} {member.apellido}
                    </h3>
                    <p style={{ margin: '0.3rem 0 0 0', opacity: 0.85, fontSize: '0.85rem' }}>
                      C.I.: <strong>{member.cedula}</strong>
                    </p>
                    <p style={{ margin: '0.1rem 0 0 0', opacity: 0.75, fontSize: '0.78rem' }}>
                      Estado: Activo / Miembro
                    </p>
                  </div>
                </div>

                {/* Pie del Carnet con Código Barcode simulado */}
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
