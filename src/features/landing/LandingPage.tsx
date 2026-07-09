import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Activity,
  Users,
  ArrowRight,
  ClipboardList,
  Camera,
  Scale,
  Search,
  PieChart,
  Wallet,
  BarChart3,
  ArrowRightLeft,
  CalendarDays,
  UserCheck,
  ChevronRight,
} from 'lucide-react';

const modules = [
  {
    icon: <ClipboardList size={28} />,
    color: '#3b82f6',
    bg: '#eff6ff',
    title: 'Requisiciones',
    desc: 'Gestiona solicitudes de fondos con flujo de aprobación multinivel. Cada requisición es trazable, con evidencia documental y estados auditables.',
  },
  {
    icon: <Camera size={28} />,
    color: '#f59e0b',
    bg: '#fffbeb',
    title: 'Carga de Gastos',
    desc: 'Los coordinadores de campo registran comprobantes con fotos, montos y categorías desde cualquier dispositivo. Sin papel, sin pérdidas.',
  },
  {
    icon: <Wallet size={28} />,
    color: '#10b981',
    bg: '#ecfdf5',
    title: 'Ingresos y Donaciones',
    desc: 'Registra donaciones en VES y USD con tasa BCV vigente. Lleva un historial completo por donante, proyecto y fecha de recepción.',
  },
  {
    icon: <Scale size={28} />,
    color: '#8b5cf6',
    bg: '#f5f3ff',
    title: 'Conciliación Bancaria',
    desc: 'Importa extractos bancarios y concilia automáticamente cada movimiento con las donaciones registradas. Detecta discrepancias al instante.',
  },
  {
    icon: <Search size={28} />,
    color: '#ef4444',
    bg: '#fef2f2',
    title: 'Auditoría de Comprobantes',
    desc: 'Revisa, aprueba o rechaza comprobantes de gasto con comentarios detallados. El auditor tiene visibilidad total del flujo de egresos.',
  },
  {
    icon: <PieChart size={28} />,
    color: '#0ea5e9',
    bg: '#f0f9ff',
    title: 'Presupuestos y Reportes',
    desc: 'Asigna presupuestos por proyecto y partida. Genera reportes PDF detallados del estado financiero, ejecución y saldo disponible.',
  },
  {
    icon: <ArrowRightLeft size={28} />,
    color: '#14b8a6',
    bg: '#f0fdfa',
    title: 'Tasa de Cambio BCV',
    desc: 'Sincronización automática diaria con la tasa oficial del BCV. Todas las conversiones Bs/$ se realizan con el tipo de cambio del día exacto.',
  },
  {
    icon: <CalendarDays size={28} />,
    color: '#f97316',
    bg: '#fff7ed',
    title: 'Jornadas Humanitarias',
    desc: 'Planifica y registra jornadas de atención en campo: fechas, lugares, responsables y beneficiarios atendidos por cada actividad.',
  },
  {
    icon: <UserCheck size={28} />,
    color: '#6366f1',
    bg: '#eef2ff',
    title: 'Registro de Beneficiarios',
    desc: 'Construye un padrón digital de beneficiarios con datos personales, historial de ayuda recibida y categorización por tipo de necesidad.',
  },
  {
    icon: <BarChart3 size={28} />,
    color: '#ec4899',
    bg: '#fdf2f8',
    title: 'Tableros Ejecutivos',
    desc: 'Dashboards interactivos con KPIs en tiempo real: gastos por proyecto, avance presupuestario, donaciones recibidas y alertas de control.',
  },
  {
    icon: <Users size={28} />,
    color: '#64748b',
    bg: '#f8fafc',
    title: 'Gestión de Usuarios y Roles',
    desc: 'Define roles específicos: Administrador, Director, Auditor, Coordinador, Auxiliar de Campo y Donante, cada uno con permisos precisos.',
  },
  {
    icon: <Shield size={28} />,
    color: '#1e3a8a',
    bg: '#eff6ff',
    title: 'Multi-ONG y Seguridad',
    desc: 'Arquitectura multi-organización con aislamiento total de datos. Cada ONG opera en su propio entorno seguro con políticas RLS en base de datos.',
  },
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        fontFamily: 'Inter, sans-serif',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.5rem 2rem',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: 'white',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img
            src="/mateo_logo.png"
            alt="MATEO"
            style={{ height: '48px', width: '48px', objectFit: 'contain', borderRadius: '10px' }}
          />
          <span
            style={{
              fontSize: '1.8rem',
              fontWeight: 900,
              color: '#1e3a8a',
              letterSpacing: '3px',
              fontFamily: '"Playfair Display", Georgia, serif',
              textTransform: 'uppercase',
            }}
          >
            MATEO
          </span>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '0.6rem 1.5rem',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#3b82f6',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            Iniciar Sesión
          </button>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '0.6rem 1.5rem',
              backgroundColor: '#1e3a8a',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            Portal de ONGs <ArrowRight size={16} />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main
        style={{
          flex: 1,
          backgroundImage:
            'linear-gradient(rgba(248, 250, 252, 0.85), rgba(248, 250, 252, 0.95)), url("/humanitarian_aid_bg.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Hero */}
        <section
          style={{
            textAlign: 'center',
            padding: '5rem 2rem',
            maxWidth: '800px',
            margin: '0 auto',
          }}
        >
          <h1
            style={{
              fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
              fontWeight: 800,
              color: '#0f172a',
              lineHeight: 1.2,
              marginBottom: '1.5rem',
            }}
          >
            Transparencia y Control para tu <span style={{ color: '#3b82f6' }}>Organización</span>
          </h1>
          <p
            style={{
              fontSize: '1.2rem',
              color: '#475569',
              lineHeight: 1.6,
              marginBottom: '2.5rem',
            }}
          >
            MATEO es la plataforma integral de gestión humanitaria diseñada para ONGs. Controla
            presupuestos, audita gastos y asegura la transparencia financiera en cada proyecto.
          </p>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '1rem 2.5rem',
              backgroundColor: '#1e3a8a',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '1.1rem',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(30, 58, 138, 0.35)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            Ingresar a la Plataforma <ChevronRight size={20} />
          </button>
        </section>

        {/* Pilares */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem',
            padding: '0 2rem 3rem',
            maxWidth: '1100px',
            margin: '0 auto',
            width: '100%',
          }}
        >
          {[
            {
              icon: <Shield size={36} color="#3b82f6" />,
              title: 'Aislamiento Seguro',
              desc: 'Datos financieros y operativos de tu ONG completamente privados y aislados de otras organizaciones.',
            },
            {
              icon: <Activity size={36} color="#10b981" />,
              title: 'Auditoría en Tiempo Real',
              desc: 'Flujo de trabajo auditable paso a paso: requisiciones, comprobantes y conciliación bancaria.',
            },
            {
              icon: <Users size={36} color="#8b5cf6" />,
              title: 'Gestión de Equipos',
              desc: 'Roles diferenciados para directores, auditores y auxiliares, cada uno con permisos exactos.',
            },
          ].map((f, i) => (
            <div
              key={i}
              style={{
                backgroundColor: 'white',
                padding: '2rem',
                borderRadius: '14px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <div style={{ marginBottom: '1rem' }}>{f.icon}</div>
              <h3
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  color: '#1e293b',
                  marginBottom: '0.5rem',
                }}
              >
                {f.title}
              </h3>
              <p style={{ color: '#64748b', lineHeight: 1.6, fontSize: '0.95rem' }}>{f.desc}</p>
            </div>
          ))}
        </section>

        {/* Módulos del Sistema */}
        <section
          style={{
            backgroundColor: 'rgba(255,255,255,0.92)',
            padding: '5rem 2rem',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <span
                style={{
                  display: 'inline-block',
                  backgroundColor: '#eff6ff',
                  color: '#3b82f6',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  padding: '0.3rem 1rem',
                  borderRadius: '999px',
                  marginBottom: '1rem',
                }}
              >
                Módulos del Sistema
              </span>
              <h2
                style={{
                  fontSize: 'clamp(1.8rem, 3vw, 2.5rem)',
                  fontWeight: 800,
                  color: '#0f172a',
                  lineHeight: 1.2,
                  marginBottom: '1rem',
                }}
              >
                El flujo completo de tu ONG,{' '}
                <span style={{ color: '#3b82f6' }}>en un solo lugar</span>
              </h2>
              <p
                style={{
                  color: '#64748b',
                  fontSize: '1.1rem',
                  maxWidth: '600px',
                  margin: '0 auto',
                }}
              >
                Desde la solicitud de fondos hasta el reporte final auditado, MATEO cubre cada etapa
                del ciclo financiero humanitario.
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1.25rem',
              }}
            >
              {modules.map((m, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: 'white',
                    border: '1px solid #f1f5f9',
                    borderRadius: '14px',
                    padding: '1.5rem',
                    display: 'flex',
                    gap: '1rem',
                    alignItems: 'flex-start',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    cursor: 'default',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
                  }}
                >
                  <div
                    style={{
                      backgroundColor: m.bg,
                      color: m.color,
                      width: '52px',
                      height: '52px',
                      minWidth: '52px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {m.icon}
                  </div>
                  <div>
                    <h4
                      style={{
                        fontWeight: 700,
                        fontSize: '1rem',
                        color: '#1e293b',
                        marginBottom: '0.35rem',
                      }}
                    >
                      {m.title}
                    </h4>
                    <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.55 }}>
                      {m.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: '3rem' }}>
              <button
                onClick={() => navigate('/login')}
                style={{
                  padding: '0.9rem 2.5rem',
                  backgroundColor: '#1e3a8a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 14px rgba(30, 58, 138, 0.3)',
                }}
              >
                Solicitar Acceso para tu ONG <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer
        style={{
          backgroundColor: '#0f172a',
          color: '#94a3b8',
          padding: '2.5rem 2rem',
          textAlign: 'center',
          fontSize: '0.9rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem',
            marginBottom: '0.75rem',
          }}
        >
          <img
            src="/mateo_logo.png"
            alt="MATEO"
            style={{
              height: '32px',
              width: '32px',
              objectFit: 'contain',
              borderRadius: '6px',
              opacity: 0.8,
            }}
          />
          <span
            style={{
              fontWeight: 900,
              color: '#e2e8f0',
              letterSpacing: '3px',
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: '1.1rem',
            }}
          >
            MATEO
          </span>
        </div>
        Sistema de Gestión Humanitaria © {new Date().getFullYear()} — Construido con transparencia.
      </footer>
    </div>
  );
};
