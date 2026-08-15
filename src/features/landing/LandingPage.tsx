import React, { useState, useEffect } from 'react';
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
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Shield,
  Award,
  Star,
  Plus,
  Minus,
} from 'lucide-react';

const heroCarouselSlides = [
  {
    image: '/images/hero_congregation.png',
    badge: '⛪ Congregación & Comunidad',
    title: 'Una Iglesia Conectada, Transparente y Organizada',
    subtitle:
      'Fortalece la comunión de tu iglesia y mantén la trazabilidad transparente de aportes, actividades y membresía.',
    tagColor: '#5eead4',
  },
  {
    image: '/images/hero_admin_team.png',
    badge: '💼 Gestión & Liderazgo Ministerial',
    title: 'Control Administrativo Fluido para tu Equipo de Trabajo',
    subtitle:
      'Aprobación de compras con un clic, rendición de caja chica con fotos de recibos y trabajo colaborativo para líderes ministeriales.',
    tagColor: '#38bdf8',
  },
  {
    image: '/images/hero_finance_dash.png',
    badge: '📊 Tableros Financieros & Auditoría',
    title: 'Finanzas Claras, Diezmos y Reportes Multi-moneda Instantáneos',
    subtitle:
      'Gráficos de ejecución presupuestaria en tiempo real, conciliación bancaria automática e informes contables impecables.',
    tagColor: '#c084fc',
  },
];

const churchModules = [
  {
    icon: <Wallet size={26} />,
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
    title: 'Diezmos y Ofrendas',
    desc: 'Registra diezmos y aportes voluntariamente con conversión automática multi-moneda (USD/VES) según la tasa oficial.',
  },
  {
    icon: <ClipboardList size={26} />,
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.12)',
    title: 'Solicitudes Ministeriales',
    desc: 'Permite a los líderes de jóvenes, damas y misiones solicitar presupuestos con aprobación previa del Tesorero o Pastor.',
  },
  {
    icon: <Camera size={26} />,
    color: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.12)',
    title: 'Registro de Gastos con Foto',
    desc: 'Carga recibos y facturas directamente desde el celular para rendición de fondos transparente y eliminación de papel.',
  },
  {
    icon: <UserCheck size={26} />,
    color: '#ec4899',
    bg: 'rgba(236, 72, 153, 0.12)',
    title: 'Padrón de Miembros',
    desc: 'Mantén la base digital ordenada de feligreses, roles ministeriales, bautismos, fechas especiales y contacto.',
  },
  {
    icon: <CalendarDays size={26} />,
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.12)',
    title: 'Actividades Eclesiásticas',
    desc: 'Organiza cultos especiales, retiros, conferencias y jornadas comunitarias controlando asistencia y recursos.',
  },
  {
    icon: <PieChart size={26} />,
    color: '#0ea5e9',
    bg: 'rgba(14, 165, 233, 0.12)',
    title: 'Presupuesto Parroquial',
    desc: 'Monitorea en tiempo real el cumplimiento presupuestario por departamento ministerial y fondo asignado.',
  },
  {
    icon: <Scale size={26} />,
    color: '#14b8a6',
    bg: 'rgba(20, 184, 166, 0.12)',
    title: 'Conciliación Bancaria',
    desc: 'Vincula extractos bancarios de la iglesia para verificar movimientos y cuadres de cuenta de forma automática.',
  },
  {
    icon: <Search size={26} />,
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.12)',
    title: 'Auditoría & Trazabilidad',
    desc: 'Firma digital, historial inmutable de aprobaciones y trazabilidad total para presentar cuentas claras a la asamblea.',
  },
];

const faqs = [
  {
    q: '¿Cómo funciona el período de prueba de 14 días gratis?',
    a: 'Al registrar tu iglesia obtienes 14 días completos de acceso sin costo, sin requerir tarjeta de crédito. Puedes crear usuarios para tu pastor, tesorero y líderes ministeriales para probar todas las herramientas sin compromiso.',
  },
  {
    q: '¿Cómo maneja MATEO la conversión de divisas (USD / Bolívares)?',
    a: 'MATEO integra la tasa del Banco Central de Venezuela (BCV) en tiempo real y permite definir tasas personalizadas de la iglesia. Cada diezmo o gasto registrado en bolívares calcula automáticamente su equivalente en dólares.',
  },
  {
    q: '¿Los datos de nuestra congregación están protegidos y aislados?',
    a: 'Sí, 100%. MATEO opera en una arquitectura multi-inquilino aislada con cifrado de grado bancario. Ninguna otra iglesia u organización puede ver ni acceder a los datos de tu congregación.',
  },
  {
    q: '¿Podemos generar reportes en PDF e imprimir cuentas claras?',
    a: 'Por supuesto. Con un solo clic puedes generar e imprimir reportes contables oficiales, balances por ministerio y resúmenes de auditoría listos para presentar en asambleas congregacionales.',
  },
];

const testimonials = [
  {
    quote:
      'MATEO ekklesia nos devolvió la paz administrativa. Ahora la tesorería aprueba solicitudes en minutos y la congregación ve cuentas claras en cada asamblea.',
    author: 'Pr. Carlos Mendoza',
    role: 'Pastor Principal — Iglesia Ekklesia Central',
    rating: 5,
  },
  {
    quote:
      'Llevar diezmos y ofrendas en dos monedas solía ser un dolor de cabeza. Con la tasa BCV automática y las fotos de comprobantes, cuadramos caja en la mitad del tiempo.',
    author: 'Lic. Carmen Rodríguez',
    role: 'Directora de Tesorería — Ministerio de Fe & Esperanza',
    rating: 5,
  },
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroCarouselSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? heroCarouselSlides.length - 1 : prev - 1));
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroCarouselSlides.length);
  };

  return (
    <div
      style={{
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        minHeight: '100vh',
        backgroundColor: '#090e34', // Deep Play Astro Dark Navy
        color: '#f8fafc',
      }}
    >
      {/* 1. STICKY NAVBAR estilo Play Astro */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: 'rgba(9, 14, 52, 0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '1rem 2rem',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* Logo */}
          <div
            onClick={() => navigate('/')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
          >
            <img
              src="/mateo_logo.png"
              alt="MATEO ekklesia"
              style={{ height: '42px', width: '42px', objectFit: 'contain', borderRadius: '10px' }}
            />
            <div>
              <div
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 900,
                  color: 'white',
                  letterSpacing: '0.5px',
                }}
              >
                MATEO <span style={{ color: '#5eead4' }}>ekklesia</span>
              </div>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>
                Gestión Financiera &amp; Ministerial
              </span>
            </div>
          </div>

          {/* Links de Navegación */}
          <nav
            style={{
              display: 'flex',
              gap: '2rem',
              alignItems: 'center',
              fontSize: '0.92rem',
              fontWeight: 600,
            }}
          >
            <a
              href="#inicio"
              style={{ color: '#e2e8f0', textDecoration: 'none', transition: 'color 0.2s' }}
            >
              Inicio
            </a>
            <a
              href="#modulos"
              style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }}
            >
              Módulos
            </a>
            <a
              href="#precios"
              style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }}
            >
              Planes
            </a>
            <a
              href="#faq"
              style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }}
            >
              Preguntas
            </a>
          </nav>

          {/* Botones Header */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button
              onClick={() => navigate('/login')}
              style={{
                backgroundColor: 'transparent',
                color: '#e2e8f0',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => navigate('/registro-ong')}
              style={{
                padding: '0.65rem 1.4rem',
                backgroundColor: '#3758f9', // Play Astro signature blue button
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(55, 88, 249, 0.4)',
              }}
            >
              Registrar Iglesia
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* 2. HERO SECTION estilo Play Astro */}
        <section
          id="inicio"
          style={{
            position: 'relative',
            padding: '5rem 1.5rem 6rem',
            background: 'radial-gradient(ellipse at top, #111a62 0%, #090e34 70%)',
            overflow: 'hidden',
          }}
        >
          {/* SVG Dot Pattern Decorativo Play Astro */}
          <div
            style={{
              position: 'absolute',
              top: '5%',
              right: '3%',
              opacity: 0.15,
              pointerEvents: 'none',
            }}
          >
            <svg width="200" height="200" fill="none">
              <pattern
                id="dot-pattern-1"
                x="0"
                y="0"
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="2" cy="2" r="2" fill="#ffffff" />
              </pattern>
              <rect width="200" height="200" fill="url(#dot-pattern-1)" />
            </svg>
          </div>

          <div
            style={{
              maxWidth: '1000px',
              margin: '0 auto',
              textAlign: 'center',
              position: 'relative',
              zIndex: 2,
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'rgba(55, 88, 249, 0.15)',
                border: '1px solid rgba(55, 88, 249, 0.3)',
                color: '#60a5fa',
                fontWeight: 700,
                fontSize: '0.82rem',
                padding: '0.45rem 1.2rem',
                borderRadius: '999px',
                marginBottom: '1.5rem',
              }}
            >
              <Sparkles size={16} /> Diseñado específicamente para Pastores, Tesoreros y Consejos
            </span>

            <h1
              style={{
                fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
                fontWeight: 900,
                lineHeight: 1.15,
                marginBottom: '1.4rem',
                letterSpacing: '-1px',
                color: 'white',
              }}
            >
              La Administración de tu Iglesia,{' '}
              <span
                style={{
                  background: 'linear-gradient(90deg, #3758f9, #5eead4)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Fácil, Transparente y en Orden
              </span>
            </h1>

            <p
              style={{
                fontSize: '1.15rem',
                color: '#94a3b8',
                lineHeight: 1.65,
                maxWidth: '740px',
                margin: '0 auto 2.5rem',
              }}
            >
              Olvídate del desorden en cuadernos o tablas complejas. MATEO ekklesia ayuda a tu
              congregación a registrar diezmos, controlar presupuestos ministeriales, gestionar
              actividades y presentar cuentas claras con un solo clic.
            </p>

            {/* CTAs */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '1.2rem',
                flexWrap: 'wrap',
                marginBottom: '3rem',
              }}
            >
              <button
                onClick={() => navigate('/registro-ong')}
                style={{
                  padding: '1rem 2.4rem',
                  backgroundColor: '#3758f9',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '1.02rem',
                  cursor: 'pointer',
                  boxShadow: '0 10px 25px rgba(55, 88, 249, 0.4)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                }}
              >
                Registrar Mi Iglesia (14 Días Gratis) <Sparkles size={18} />
              </button>

              <button
                onClick={() => navigate('/login')}
                style={{
                  padding: '1rem 2rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '1.02rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
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
                gap: '1.8rem',
                flexWrap: 'wrap',
                fontSize: '0.88rem',
                color: '#cbd5e1',
                fontWeight: 600,
                marginBottom: '3.5rem',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={16} color="#5eead4" /> Sin tarjeta de crédito
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={16} color="#5eead4" /> Tasa BCV y multi-moneda automática
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={16} color="#5eead4" /> Reportes contables PDF
              </span>
            </div>

            {/* PLAY ASTRO SHOWCASE CONTAINER (Visor Flotante estilo Play Astro) */}
            <div
              style={{
                maxWidth: '960px',
                margin: '0 auto',
                backgroundColor: '#111746',
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.6)',
                overflow: 'hidden',
                textAlign: 'left',
              }}
            >
              {/* Header del Visor */}
              <div
                style={{
                  padding: '0.9rem 1.4rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: '#ef4444',
                    }}
                  />
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: '#f59e0b',
                    }}
                  />
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: '#10b981',
                    }}
                  />
                  <span
                    style={{
                      fontSize: '0.78rem',
                      color: '#94a3b8',
                      marginLeft: '0.5rem',
                      fontWeight: 600,
                    }}
                  >
                    MATEO ekklesia — Plataforma Ministerial
                  </span>
                </div>

                <span
                  style={{
                    color: heroCarouselSlides[currentSlide].tagColor,
                    fontWeight: 800,
                    fontSize: '0.8rem',
                  }}
                >
                  {heroCarouselSlides[currentSlide].badge}
                </span>
              </div>

              {/* Imagen en Alta Resolución */}
              <div
                style={{
                  position: 'relative',
                  height: '360px',
                  overflow: 'hidden',
                  backgroundColor: '#020617',
                }}
              >
                <img
                  src={heroCarouselSlides[currentSlide].image}
                  alt={heroCarouselSlides[currentSlide].title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'all 0.5s ease',
                  }}
                />

                {/* Controles de Navegación sobre Imagen */}
                <button
                  onClick={handlePrevSlide}
                  aria-label="Anterior"
                  style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(9, 14, 52, 0.75)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    backdropFilter: 'blur(6px)',
                  }}
                >
                  <ChevronLeft size={20} />
                </button>

                <button
                  onClick={handleNextSlide}
                  aria-label="Siguiente"
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(9, 14, 52, 0.75)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    backdropFilter: 'blur(6px)',
                  }}
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              {/* Pie del Visor */}
              <div
                style={{
                  padding: '1.25rem 1.6rem',
                  backgroundColor: '#0c1033',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <h4
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      margin: '0 0 0.3rem 0',
                      color: 'white',
                    }}
                  >
                    {heroCarouselSlides[currentSlide].title}
                  </h4>
                  <p style={{ fontSize: '0.88rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                    {heroCarouselSlides[currentSlide].subtitle}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {heroCarouselSlides.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentSlide(idx)}
                      style={{
                        width: currentSlide === idx ? '24px' : '8px',
                        height: '8px',
                        borderRadius: '4px',
                        backgroundColor:
                          currentSlide === idx ? '#3758f9' : 'rgba(255, 255, 255, 0.25)',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. SECCIÓN SOBRE LA PLATAFORMA (Layout 2 Columnas estilo Play Astro) */}
        <section
          style={{
            backgroundColor: '#0c1142',
            padding: '5.5rem 1.5rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div style={{ maxWidth: '1150px', margin: '0 auto' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '4rem',
                alignItems: 'center',
              }}
            >
              {/* Imagen con tarjeta flotante Play Astro */}
              <div style={{ position: 'relative' }}>
                <img
                  src="/images/hero_admin_team.png"
                  alt="Equipo Pastoral y Administrativo"
                  style={{
                    width: '100%',
                    borderRadius: '18px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-20px',
                    right: '-20px',
                    backgroundColor: '#3758f9',
                    color: 'white',
                    padding: '1.2rem 1.5rem',
                    borderRadius: '16px',
                    boxShadow: '0 10px 25px rgba(55, 88, 249, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                  }}
                >
                  <Award size={36} />
                  <div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>100% Auditabilidad</div>
                    <div style={{ fontSize: '0.78rem', opacity: 0.9 }}>
                      Trazabilidad &amp; Cuentas Claras
                    </div>
                  </div>
                </div>
              </div>

              {/* Contenido Explicativo */}
              <div>
                <span
                  style={{
                    color: '#5eead4',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                  }}
                >
                  PROPÓSITO &amp; TRANSPARENCIA
                </span>
                <h2
                  style={{
                    fontSize: 'clamp(1.8rem, 3vw, 2.5rem)',
                    fontWeight: 800,
                    color: 'white',
                    margin: '0.6rem 0 1.2rem 0',
                    lineHeight: 1.25,
                  }}
                >
                  Diseñado para servir al liderazgo eclesial con excelencia
                </h2>
                <p
                  style={{
                    color: '#94a3b8',
                    fontSize: '1rem',
                    lineHeight: 1.65,
                    marginBottom: '2rem',
                  }}
                >
                  MATEO ekklesia fue concebido para eliminar las fricciones administrativas en las
                  iglesias. Permite que el equipo pastoral y de tesorería trabaje de forma
                  colaborativa y sin estrés.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      padding: '1.2rem',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <Shield size={24} color="#5eead4" style={{ marginBottom: '0.5rem' }} />
                    <h4
                      style={{
                        fontSize: '0.98rem',
                        fontWeight: 800,
                        color: 'white',
                        margin: '0 0 0.3rem 0',
                      }}
                    >
                      Firma &amp; Permisos
                    </h4>
                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
                      Roles diferenciados para pastores, tesoreros y líderes.
                    </p>
                  </div>

                  <div
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      padding: '1.2rem',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <Camera size={24} color="#60a5fa" style={{ marginBottom: '0.5rem' }} />
                    <h4
                      style={{
                        fontSize: '0.98rem',
                        fontWeight: 800,
                        color: 'white',
                        margin: '0 0 0.3rem 0',
                      }}
                    >
                      Fotos de Recibos
                    </h4>
                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
                      Digitaliza comprobantes al momento del gasto.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. MÓDULOS DEL SISTEMA (Grid 3 Columnas estilo Play Astro Feature Cards) */}
        <section
          id="modulos"
          style={{ padding: '5.5rem 1.5rem', maxWidth: '1200px', margin: '0 auto' }}
        >
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <span
              style={{
                color: '#3758f9',
                fontWeight: 800,
                fontSize: '0.8rem',
                letterSpacing: '2px',
                textTransform: 'uppercase',
              }}
            >
              HERRAMIENTAS INCLUIDAS
            </span>
            <h2
              style={{
                fontSize: 'clamp(1.8rem, 3.2vw, 2.6rem)',
                fontWeight: 800,
                color: 'white',
                marginTop: '0.5rem',
              }}
            >
              Todo lo que necesitas para una gestión transparente
            </h2>
            <p
              style={{
                color: '#94a3b8',
                fontSize: '1.02rem',
                maxWidth: '650px',
                margin: '0.6rem auto 0',
              }}
            >
              Módulos nativos integrados y adaptados al vocabulario eclesial.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1.8rem',
            }}
          >
            {churchModules.map((m, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: '#111746',
                  borderRadius: '16px',
                  padding: '2rem',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  transition: 'transform 0.25s ease, border-color 0.25s ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-5px)';
                  (e.currentTarget as HTMLElement).style.borderColor = '#3758f9';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255, 255, 255, 0.08)';
                }}
              >
                <div
                  style={{
                    backgroundColor: m.bg,
                    color: m.color,
                    width: '52px',
                    height: '52px',
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {m.icon}
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: '1.15rem',
                      fontWeight: 800,
                      color: 'white',
                      marginBottom: '0.4rem',
                    }}
                  >
                    {m.title}
                  </h3>
                  <p
                    style={{
                      color: '#94a3b8',
                      fontSize: '0.9rem',
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {m.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. CALL TO ACTION BANNER estilo Play Astro */}
        <section style={{ padding: '0 1.5rem', margin: '2rem 0 4rem' }}>
          <div
            style={{
              maxWidth: '1150px',
              margin: '0 auto',
              background: 'linear-gradient(135deg, #3758f9 0%, #1e3a8a 100%)',
              borderRadius: '24px',
              padding: '4rem 2rem',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(55, 88, 249, 0.3)',
            }}
          >
            <div
              style={{
                maxWidth: '720px',
                margin: '0 auto',
                position: 'relative',
                zIndex: 2,
              }}
            >
              <h2
                style={{
                  fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)',
                  fontWeight: 900,
                  color: 'white',
                  marginBottom: '1rem',
                }}
              >
                Comienza la transformación administrativa de tu Iglesia hoy
              </h2>
              <p
                style={{
                  color: '#cbd5e1',
                  fontSize: '1.1rem',
                  marginBottom: '2.2rem',
                  lineHeight: 1.6,
                }}
              >
                Pruébalo durante 14 días con acceso completo sin costo ni tarjeta de crédito.
              </p>
              <button
                onClick={() => navigate('/registro-ong')}
                style={{
                  padding: '1.1rem 2.6rem',
                  backgroundColor: '#0d9488',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: 900,
                  fontSize: '1.05rem',
                  cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(13, 148, 136, 0.4)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                }}
              >
                Activar Espacio de Mi Iglesia (14 Días Gratis) <Sparkles size={20} />
              </button>
            </div>
          </div>
        </section>

        {/* 6. TABLA DE PLANES DE PRECIOS estilo Play Astro */}
        <section
          id="precios"
          style={{
            backgroundColor: '#0c1142',
            padding: '5.5rem 1.5rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
              <span
                style={{
                  color: '#5eead4',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                }}
              >
                INVERSIÓN TRANSPARENTE
              </span>
              <h2
                style={{
                  fontSize: 'clamp(1.8rem, 3.2vw, 2.6rem)',
                  fontWeight: 800,
                  color: 'white',
                  marginTop: '0.5rem',
                }}
              >
                Planes diseñados para cada etapa de tu Iglesia
              </h2>
              <p
                style={{
                  color: '#94a3b8',
                  fontSize: '1.02rem',
                  maxWidth: '600px',
                  margin: '0.6rem auto 0',
                }}
              >
                Comienza con 14 días gratis sin compromisos ni requisitos de pago.
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '2.5rem',
                alignItems: 'stretch',
              }}
            >
              {/* Plan Trial 14 Días (POPULAR) */}
              <div
                style={{
                  backgroundColor: '#111746',
                  borderRadius: '20px',
                  padding: '2.5rem 2rem',
                  border: '2px solid #3758f9',
                  boxShadow: '0 15px 35px rgba(55, 88, 249, 0.25)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '-14px',
                    right: '24px',
                    backgroundColor: '#3758f9',
                    color: 'white',
                    fontWeight: 900,
                    fontSize: '0.75rem',
                    padding: '0.3rem 0.95rem',
                    borderRadius: '999px',
                    letterSpacing: '0.5px',
                  }}
                >
                  RECOMENDADO / POPULAR
                </span>
                <h3
                  style={{
                    fontSize: '1.35rem',
                    fontWeight: 800,
                    color: 'white',
                    margin: '0 0 0.5rem 0',
                  }}
                >
                  Prueba Gratuita
                </h3>
                <p
                  style={{
                    color: '#94a3b8',
                    fontSize: '0.9rem',
                    margin: '0 0 1.6rem 0',
                    lineHeight: 1.5,
                  }}
                >
                  Ideal para evaluar todas las herramientas con tu equipo pastoral durante 14 días.
                </p>
                <div
                  style={{
                    fontSize: '2.8rem',
                    fontWeight: 900,
                    color: 'white',
                    marginBottom: '1.8rem',
                  }}
                >
                  $0{' '}
                  <span style={{ fontSize: '0.92rem', color: '#94a3b8', fontWeight: 600 }}>
                    / 14 días completos
                  </span>
                </div>
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: '0 0 2.2rem 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                    fontSize: '0.92rem',
                    color: '#e2e8f0',
                  }}
                >
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <CheckCircle2 size={18} color="#5eead4" /> Acceso Completo a Todos los Módulos
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <CheckCircle2 size={18} color="#5eead4" /> Diezmos, Ofrendas y Solicitudes
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <CheckCircle2 size={18} color="#5eead4" /> Usuarios Ilimitados para el Equipo
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <CheckCircle2 size={18} color="#5eead4" /> Reportes Financieros en PDF
                  </li>
                </ul>
                <button
                  onClick={() => navigate('/registro-ong')}
                  style={{
                    marginTop: 'auto',
                    width: '100%',
                    padding: '1rem',
                    backgroundColor: '#3758f9',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: 800,
                    fontSize: '1rem',
                    cursor: 'pointer',
                    boxShadow: '0 6px 18px rgba(55, 88, 249, 0.4)',
                  }}
                >
                  Iniciar Prueba Gratis Ahora
                </button>
              </div>

              {/* Plan Ekklesia Estándar */}
              <div
                style={{
                  backgroundColor: '#111746',
                  borderRadius: '20px',
                  padding: '2.5rem 2rem',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <h3
                  style={{
                    fontSize: '1.35rem',
                    fontWeight: 800,
                    color: 'white',
                    margin: '0 0 0.5rem 0',
                  }}
                >
                  Congregación Estándar
                </h3>
                <p
                  style={{
                    color: '#94a3b8',
                    fontSize: '0.9rem',
                    margin: '0 0 1.6rem 0',
                    lineHeight: 1.5,
                  }}
                >
                  Para congregaciones locales que buscan mantener su administración al día.
                </p>
                <div
                  style={{
                    fontSize: '2.8rem',
                    fontWeight: 900,
                    color: 'white',
                    marginBottom: '1.8rem',
                  }}
                >
                  SaaS{' '}
                  <span style={{ fontSize: '0.92rem', color: '#94a3b8', fontWeight: 600 }}>
                    / suscripción mensual
                  </span>
                </div>
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: '0 0 2.2rem 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                    fontSize: '0.92rem',
                    color: '#e2e8f0',
                  }}
                >
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <CheckCircle2 size={18} color="#60a5fa" /> Todo lo incluido en el Plan Trial
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <CheckCircle2 size={18} color="#60a5fa" /> Conciliación Bancaria Automática
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <CheckCircle2 size={18} color="#60a5fa" /> Historial de Auditoría Inmutable
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <CheckCircle2 size={18} color="#60a5fa" /> Soporte Técnico Prioritario
                  </li>
                </ul>
                <button
                  onClick={() => navigate('/registro-ong')}
                  style={{
                    marginTop: 'auto',
                    width: '100%',
                    padding: '1rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '12px',
                    fontWeight: 800,
                    fontSize: '1rem',
                    cursor: 'pointer',
                  }}
                >
                  Solicitar Información de Licencia
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 7. TESTIMONIOS estilo Play Astro */}
        <section style={{ padding: '5.5rem 1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <span
              style={{
                color: '#5eead4',
                fontWeight: 800,
                fontSize: '0.8rem',
                letterSpacing: '2px',
                textTransform: 'uppercase',
              }}
            >
              TESTIMONIOS
            </span>
            <h2
              style={{
                fontSize: 'clamp(1.8rem, 3.2vw, 2.6rem)',
                fontWeight: 800,
                color: 'white',
                marginTop: '0.5rem',
              }}
            >
              Lo que opinan los líderes y tesoreros
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '2rem',
            }}
          >
            {testimonials.map((t, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: '#111746',
                  borderRadius: '18px',
                  padding: '2.2rem',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.3rem',
                      color: '#f59e0b',
                      marginBottom: '1.2rem',
                    }}
                  >
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} size={18} fill="#f59e0b" stroke="none" />
                    ))}
                  </div>
                  <p
                    style={{
                      color: '#e2e8f0',
                      fontSize: '1rem',
                      lineHeight: 1.65,
                      fontStyle: 'italic',
                      marginBottom: '1.8rem',
                    }}
                  >
                    "{t.quote}"
                  </p>
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: 'white', fontSize: '1.02rem' }}>
                    {t.author}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 8. PREGUNTAS FRECUENTES (Acordeón Interactivo estilo Play Astro) */}
        <section
          id="faq"
          style={{
            backgroundColor: '#0c1142',
            padding: '5.5rem 1.5rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div style={{ maxWidth: '850px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <span
                style={{
                  color: '#3758f9',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                }}
              >
                RESPUESTAS CLARAS
              </span>
              <h2
                style={{
                  fontSize: 'clamp(1.8rem, 3vw, 2.5rem)',
                  fontWeight: 800,
                  color: 'white',
                  marginTop: '0.5rem',
                }}
              >
                Preguntas Frecuentes de Administradores
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: '#111746',
                    borderRadius: '14px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    style={{
                      width: '100%',
                      padding: '1.4rem 1.6rem',
                      backgroundColor: 'transparent',
                      color: 'white',
                      border: 'none',
                      textAlign: 'left',
                      fontWeight: 800,
                      fontSize: '1.05rem',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <HelpCircle size={20} color="#5eead4" /> {faq.q}
                    </span>
                    {openFaq === idx ? (
                      <Minus size={20} color="#5eead4" />
                    ) : (
                      <Plus size={20} color="#94a3b8" />
                    )}
                  </button>

                  {openFaq === idx && (
                    <div
                      style={{
                        padding: '0 1.6rem 1.5rem 3.25rem',
                        color: '#94a3b8',
                        fontSize: '0.95rem',
                        lineHeight: 1.65,
                      }}
                    >
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* 9. FOOTER estilo Play Astro */}
      <footer
        style={{
          backgroundColor: '#070b28',
          color: '#94a3b8',
          padding: '4rem 2rem 2rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '3rem',
            marginBottom: '3rem',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                marginBottom: '1rem',
              }}
            >
              <img
                src="/mateo_logo.png"
                alt="MATEO ekklesia"
                style={{
                  height: '36px',
                  width: '36px',
                  objectFit: 'contain',
                  borderRadius: '8px',
                }}
              />
              <span
                style={{
                  fontWeight: 900,
                  color: 'white',
                  fontSize: '1.2rem',
                  letterSpacing: '0.5px',
                }}
              >
                MATEO <span style={{ color: '#5eead4' }}>ekklesia</span>
              </span>
            </div>
            <p style={{ fontSize: '0.88rem', lineHeight: 1.6, color: '#94a3b8' }}>
              Plataforma de Gestión Financiera &amp; Ministerial para Iglesias. Transparencia, orden
              y buen testimonio.
            </p>
          </div>

          <div>
            <h4
              style={{
                color: 'white',
                fontWeight: 800,
                fontSize: '1rem',
                marginBottom: '1.2rem',
              }}
            >
              Navegación
            </h4>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
                fontSize: '0.88rem',
              }}
            >
              <li>
                <a href="#inicio" style={{ color: '#94a3b8', textDecoration: 'none' }}>
                  Inicio
                </a>
              </li>
              <li>
                <a href="#modulos" style={{ color: '#94a3b8', textDecoration: 'none' }}>
                  Módulos
                </a>
              </li>
              <li>
                <a href="#precios" style={{ color: '#94a3b8', textDecoration: 'none' }}>
                  Planes
                </a>
              </li>
              <li>
                <a href="#faq" style={{ color: '#94a3b8', textDecoration: 'none' }}>
                  Preguntas Frecuentes
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4
              style={{
                color: 'white',
                fontWeight: 800,
                fontSize: '1rem',
                marginBottom: '1.2rem',
              }}
            >
              Acceso Rápido
            </h4>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
                fontSize: '0.88rem',
              }}
            >
              <li>
                <a
                  onClick={() => navigate('/registro-ong')}
                  style={{ color: '#94a3b8', textDecoration: 'none', cursor: 'pointer' }}
                >
                  Registrar Iglesia (14 Días Gratis)
                </a>
              </li>
              <li>
                <a
                  onClick={() => navigate('/login')}
                  style={{ color: '#94a3b8', textDecoration: 'none', cursor: 'pointer' }}
                >
                  Iniciar Sesión
                </a>
              </li>
              <li>
                <a
                  onClick={() => navigate('/saas-admin')}
                  style={{ color: '#94a3b8', textDecoration: 'none', cursor: 'pointer' }}
                >
                  Portal SaaS Admin
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '2rem',
            textAlign: 'center',
            fontSize: '0.85rem',
          }}
        >
          MATEO ekklesia © {new Date().getFullYear()} — Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
};
