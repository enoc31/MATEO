import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ClipboardList,
  Camera,
  Scale,
  Search,
  PieChart,
  Wallet,
  CalendarDays,
  UserCheck,
  Sparkles,
  CheckCircle2,
  BookOpen,
  HeartHandshake,
  FileCheck2,
  HelpCircle,
} from 'lucide-react';

const churchModules = [
  {
    icon: <Wallet size={28} />,
    color: '#10b981',
    bg: '#ecfdf5',
    title: 'Diezmos y Ofrendas',
    desc: 'Registra aportes en USD y Bolívares con conversión a la tasa BCV oficial. Mantén la cuenta clara por feligrés, ministerio y fecha.',
  },
  {
    icon: <ClipboardList size={28} />,
    color: '#3b82f6',
    bg: '#eff6ff',
    title: 'Solicitudes de Fondos',
    desc: 'Permite a los líderes ministeriales solicitar compras o viáticos. Cada solicitud requiere aprobación del Tesorero o Pastor antes de desembolsar.',
  },
  {
    icon: <Camera size={28} />,
    color: '#8b5cf6',
    bg: '#f5f3ff',
    title: 'Registro de Gastos con Foto',
    desc: 'Carga facturas, recibos y fotos de comprobantes desde el celular. Elimina el desorden de facturas en papel y las pérdidas de caja.',
  },
  {
    icon: <UserCheck size={28} />,
    color: '#ec4899',
    bg: '#fdf2f8',
    title: 'Padrón de Miembros',
    desc: 'Mantén un registro digital ordenado de los miembros de tu congregación, sus roles ministeriales, datos de contacto e historial de actividad.',
  },
  {
    icon: <CalendarDays size={28} />,
    color: '#f59e0b',
    bg: '#fffbeb',
    title: 'Actividades y Eventos',
    desc: 'Organiza conferencias, retiros, cultos especiales y jornadas comunitarias. Lleva el control de asistencia y recursos entregados.',
  },
  {
    icon: <PieChart size={28} />,
    color: '#0ea5e9',
    bg: '#f0f9ff',
    title: 'Presupuestos Ministeriales',
    desc: 'Asigna presupuestos por ministerio (Alabanza, Jóvenes, Damas, Misiones) y monitorea en tiempo real cuánto se ha ejecutado.',
  },
  {
    icon: <Scale size={28} />,
    color: '#14b8a6',
    bg: '#f0fdfa',
    title: 'Conciliación Bancaria',
    desc: 'Importa extractos bancarios de la iglesia y verifica fácilmente que las transferencias coincidan con las ofrendas y diezmos reportados.',
  },
  {
    icon: <Search size={28} />,
    color: '#ef4444',
    bg: '#fef2f2',
    title: 'Auditoría e Historial',
    desc: 'Trazabilidad total: revisa quién aprobó cada gasto, cuándo se registró cada ingreso y consulta evidencias en cualquier momento.',
  },
];

const stepsToUse = [
  {
    num: '1',
    title: 'Registra Diezmos y Ofrendas en Segundos',
    desc: 'Anota los ingresos en efectivo o transferencia. El sistema calcula automáticamente la equivalencia en Bolívares usando la Tasa Oficial BCV.',
    icon: <HeartHandshake size={24} color="#10b981" />,
  },
  {
    num: '2',
    title: 'Controla las Compras y Salidas de Dinero',
    desc: 'Los encargados de ministerio envían sus solicitudes de gasto. Tú apruebas o rechazas con un clic y exiges la foto del recibo como respaldo.',
    icon: <FileCheck2 size={24} color="#3b82f6" />,
  },
  {
    num: '3',
    title: 'Presenta Cuentas Claras en Asambleas',
    desc: 'Genera reportes PDF resumidos o detallados listos para imprimir y compartir con el Consejo Pastoral y la congregación en cada reunión.',
    icon: <BookOpen size={24} color="#8b5cf6" />,
  },
];

const faqs = [
  {
    q: '¿Es fácil de usar para personas sin experiencia contable?',
    a: 'Sí, 100%. MATEO ekklesia está diseñado pensando en pastores, tesoreros y líderes de iglesia, no en contadores. La interfaz es intuitiva, didáctica y guiada.',
  },
  {
    q: '¿Cómo maneja las dos monedas (Dólares y Bolívares)?',
    a: 'MATEO se sincroniza diariamente con la Tasa Oficial del Banco Central de Venezuela (BCV). Puedes registrar aportes en USD o Bs y el sistema lleva la cuenta exacta sin enredos.',
  },
  {
    q: '¿Los datos de mi iglesia están protegidos?',
    a: 'Totalmente. Cada iglesia opera en su propio espacio privado aislado con encriptación de grado bancario. Solo las personas autorizadas por la iglesia pueden ver la información.',
  },
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        fontFamily: 'Inter, system-ui, sans-serif',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f8fafc',
        color: '#0f172a',
      }}
    >
      {/* Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.2rem 2rem',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: 'white',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img
            src="/mateo_logo.png"
            alt="MATEO ekklesia"
            style={{ height: '44px', width: '44px', objectFit: 'contain', borderRadius: '10px' }}
          />
          <div>
            <div
              style={{
                fontSize: '1.4rem',
                fontWeight: 900,
                color: '#1e3a8a',
                letterSpacing: '1px',
                lineHeight: 1,
              }}
            >
              MATEO <span style={{ color: '#0d9488', fontWeight: 700 }}>ekklesia</span>
            </div>
            <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>
              Gestión Financiera &amp; Ministerial
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={() => navigate('/register')}
            style={{
              padding: '0.6rem 1.2rem',
              backgroundColor: '#f1f5f9',
              color: '#1e3a8a',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.88rem',
            }}
          >
            Registrar Iglesia
          </button>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '0.6rem 1.4rem',
              backgroundColor: '#1e3a8a',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            Iniciar Sesión <ArrowRight size={16} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1 }}>
        {/* HERO SECTION DIDÁCTICO */}
        <section
          style={{
            background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
            color: 'white',
            padding: '4.5rem 1.5rem 5rem',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Sombra de fondo decorativa */}
          <div
            style={{
              position: 'absolute',
              top: '-10%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '600px',
              height: '400px',
              background: 'radial-gradient(circle, rgba(13, 148, 136, 0.25) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ maxWidth: '840px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#5eead4',
                fontWeight: 700,
                fontSize: '0.82rem',
                padding: '0.4rem 1.1rem',
                borderRadius: '999px',
                marginBottom: '1.5rem',
              }}
            >
              <Sparkles size={16} /> Diseñado específicamente para Pastores, Tesoreros y Consejos
            </span>

            <h1
              style={{
                fontSize: 'clamp(2rem, 4.5vw, 3.4rem)',
                fontWeight: 900,
                lineHeight: 1.2,
                marginBottom: '1.25rem',
                letterSpacing: '-0.5px',
              }}
            >
              La administración de tu Iglesia,{' '}
              <span
                style={{
                  background: 'linear-gradient(90deg, #5eead4, #38bdf8)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                fácil, transparente y en orden
              </span>
            </h1>

            <p
              style={{
                fontSize: '1.15rem',
                color: '#94a3b8',
                lineHeight: 1.6,
                marginBottom: '2.5rem',
                maxWidth: '720px',
                margin: '0 auto 2.5rem auto',
              }}
            >
              Olvídate del desorden en cuadernos o hojas de cálculo complejas. MATEO ekklesia es la
              plataforma que te ayuda a registrar diezmos, controlar presupuestos ministeriales,
              gestionar actividades y presentar cuentas claras a tu congregación.
            </p>

            {/* CTAs */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '1rem',
                flexWrap: 'wrap',
                marginBottom: '2.5rem',
              }}
            >
              <button
                onClick={() => navigate('/register')}
                style={{
                  padding: '0.95rem 2.2rem',
                  backgroundColor: '#0d9488',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(13, 148, 136, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                }}
              >
                Registrar Mi Iglesia (14 Días Gratis) <Sparkles size={18} />
              </button>

              <button
                onClick={() => navigate('/login')}
                style={{
                  padding: '0.95rem 2rem',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.25)',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                Ingresar al Sistema <ArrowRight size={18} />
              </button>
            </div>

            {/* Píldoras de confianza */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '1.5rem',
                flexWrap: 'wrap',
                fontSize: '0.85rem',
                color: '#cbd5e1',
                fontWeight: 600,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <CheckCircle2 size={16} color="#5eead4" /> Sin tarjeta de crédito
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <CheckCircle2 size={16} color="#5eead4" /> Dólares y Bolívares (Tasa BCV)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <CheckCircle2 size={16} color="#5eead4" /> Reportes PDF instantáneos
              </span>
            </div>
          </div>
        </section>

        {/* SECCIÓN DIDÁCTICA: ¿CÓMO FUNCIONA? */}
        <section style={{ padding: '4.5rem 1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <span
              style={{
                color: '#0d9488',
                fontWeight: 800,
                fontSize: '0.78rem',
                letterSpacing: '2px',
                textTransform: 'uppercase',
              }}
            >
              Simplicidad y Didáctica
            </span>
            <h2
              style={{
                fontSize: 'clamp(1.75rem, 3.2vw, 2.4rem)',
                fontWeight: 800,
                color: '#0f172a',
                marginTop: '0.4rem',
              }}
            >
              ¿Cómo simplifica MATEO ekklesia el día a día de tu Iglesia?
            </h2>
            <p
              style={{
                color: '#64748b',
                fontSize: '1rem',
                maxWidth: '650px',
                margin: '0.5rem auto 0',
              }}
            >
              Diseñado en 3 pasos sencillos para que todo el equipo trabaje en armonía y sin estrés.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '2rem',
            }}
          >
            {stepsToUse.map((step, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  padding: '2rem',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1.25rem',
                  }}
                >
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {step.icon}
                  </div>
                  <span
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: 900,
                      color: '#cbd5e1',
                    }}
                  >
                    Paso 0{step.num}
                  </span>
                </div>

                <h3
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    color: '#1e293b',
                    marginBottom: '0.6rem',
                    lineHeight: 1.3,
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    color: '#64748b',
                    fontSize: '0.92rem',
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* SECCIÓN MÓDULOS DE LA IGLESIA */}
        <section
          style={{
            backgroundColor: '#ffffff',
            padding: '4.5rem 1.5rem',
            borderTop: '1px solid #e2e8f0',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <span
                style={{
                  display: 'inline-block',
                  backgroundColor: '#f0fdfa',
                  color: '#0d9488',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  padding: '0.35rem 1rem',
                  borderRadius: '999px',
                  marginBottom: '0.75rem',
                }}
              >
                Herramientas Incluidas
              </span>
              <h2
                style={{
                  fontSize: 'clamp(1.75rem, 3.2vw, 2.4rem)',
                  fontWeight: 800,
                  color: '#0f172a',
                  lineHeight: 1.2,
                }}
              >
                Todo lo que necesitas para una administración excelente
              </h2>
              <p
                style={{
                  color: '#64748b',
                  fontSize: '1rem',
                  maxWidth: '600px',
                  margin: '0.5rem auto 0',
                }}
              >
                Módulos integrados y adaptados al vocabulario eclesial.
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '1.25rem',
              }}
            >
              {churchModules.map((m, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
                    (e.currentTarget as HTMLElement).style.boxShadow =
                      '0 8px 24px rgba(0,0,0,0.06)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  }}
                >
                  <div
                    style={{
                      backgroundColor: m.bg,
                      color: m.color,
                      width: '48px',
                      height: '48px',
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
                        fontWeight: 800,
                        fontSize: '1rem',
                        color: '#1e293b',
                        marginBottom: '0.35rem',
                      }}
                    >
                      {m.title}
                    </h4>
                    <p
                      style={{ color: '#64748b', fontSize: '0.85rem', lineHeight: 1.55, margin: 0 }}
                    >
                      {m.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PREGUNTAS FRECUENTES (DIDÁCTICA PARA ADMINISTRADORES) */}
        <section style={{ padding: '4.5rem 1.5rem', maxWidth: '850px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span
              style={{
                color: '#1e3a8a',
                fontWeight: 800,
                fontSize: '0.78rem',
                letterSpacing: '2px',
                textTransform: 'uppercase',
              }}
            >
              Respuestas Claras
            </span>
            <h2
              style={{
                fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
                fontWeight: 800,
                color: '#0f172a',
                marginTop: '0.4rem',
              }}
            >
              Preguntas Frecuentes de Administradores e Iglesias
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '14px',
                  padding: '1.6rem',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                }}
              >
                <h4
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    color: '#1e293b',
                    marginBottom: '0.6rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                  }}
                >
                  <HelpCircle size={20} color="#0d9488" /> {faq.q}
                </h4>
                <p style={{ color: '#64748b', fontSize: '0.92rem', lineHeight: 1.6, margin: 0 }}>
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA FINAL */}
        <section
          style={{
            backgroundColor: '#1e3a8a',
            color: 'white',
            padding: '4rem 1.5rem',
            textAlign: 'center',
          }}
        >
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '1rem' }}>
              Comienza hoy mismo la transformación administrativa de tu Iglesia
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '1.05rem', marginBottom: '2rem' }}>
              Pruébalo durante 14 días con acceso completo sin costo ni compromiso.
            </p>
            <button
              onClick={() => navigate('/register')}
              style={{
                padding: '1rem 2.5rem',
                backgroundColor: '#0d9488',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '1.05rem',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(13, 148, 136, 0.4)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.6rem',
              }}
            >
              Activar Espacio de Mi Iglesia <Sparkles size={20} />
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        style={{
          backgroundColor: '#0f172a',
          color: '#94a3b8',
          padding: '2.5rem 2rem',
          textAlign: 'center',
          fontSize: '0.88rem',
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
            alt="MATEO ekklesia"
            style={{
              height: '32px',
              width: '32px',
              objectFit: 'contain',
              borderRadius: '6px',
            }}
          />
          <span
            style={{
              fontWeight: 900,
              color: '#e2e8f0',
              letterSpacing: '1px',
              fontSize: '1.1rem',
            }}
          >
            MATEO <span style={{ color: '#5eead4' }}>ekklesia</span>
          </span>
        </div>
        Plataforma de Gestión Financiera &amp; Ministerial para Iglesias ©{' '}
        {new Date().getFullYear()} — Orden, transparencia y buen testimonio.
      </footer>
    </div>
  );
};
