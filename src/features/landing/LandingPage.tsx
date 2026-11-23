import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
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
  Shield,
  Star,
  Plus,
  Minus,
  FileCheck,
  Layers,
  Lock,
  Menu,
  X,
} from 'lucide-react';

const churchModules = [
  {
    icon: <Wallet size={26} />,
    color: '#1B5CB6',
    bg: '#EFF6FF',
    title: 'Diezmos y Ofrendas (USD/VES)',
    desc: 'Registra diezmos y aportes voluntariamente con conversión automática multi-moneda según la tasa oficial BCV.',
  },
  {
    icon: <ClipboardList size={26} />,
    color: '#10B981',
    bg: '#ECFDF5',
    title: 'Solicitudes Ministeriales',
    desc: 'Permite a los líderes de jóvenes, damas y misiones solicitar presupuestos con aprobación previa del Tesorero o Pastor.',
  },
  {
    icon: <Camera size={26} />,
    color: '#8B5CF6',
    bg: '#F3E8FF',
    title: 'Rendición de Gastos con Foto',
    desc: 'Carga recibos y facturas directamente desde el celular para rendición de fondos transparente y sin papel.',
  },
  {
    icon: <UserCheck size={26} />,
    color: '#EC4899',
    bg: '#FCE7F3',
    title: 'Gestión de Miembros',
    desc: 'Mantén la base digital ordenada de feligreses, roles ministeriales, bautismos, fechas especiales y contacto.',
  },
  {
    icon: <CalendarDays size={26} />,
    color: '#F59E0B',
    bg: '#FEF3C7',
    title: 'Actividades Eclesiásticas',
    desc: 'Organiza cultos especiales, retiros, conferencias y jornadas comunitarias controlando asistencia y recursos.',
  },
  {
    icon: <PieChart size={26} />,
    color: '#469BE7',
    bg: '#E0F2FE',
    title: 'Presupuesto Ministerial',
    desc: 'Monitorea en tiempo real el cumplimiento presupuestario por departamento ministerial y fondo asignado.',
  },
  {
    icon: <Scale size={26} />,
    color: '#0D9488',
    bg: '#CCFBF1',
    title: 'Conciliación Bancaria',
    desc: 'Vincula extractos bancarios de la iglesia para verificar movimientos y cuadres de cuenta de forma automática.',
  },
  {
    icon: <Search size={26} />,
    color: '#EF4444',
    bg: '#FEE2E2',
    title: 'Auditoría Ministerial',
    desc: 'Rastrea cada peso registrado con logs inmutables, historial de aprobaciones y reportes descargables para la junta.',
  },
];

const faqs = [
  {
    q: '¿Puedo registrar diezmos en dólares y bolívares al mismo tiempo?',
    a: 'Sí. MATEO ekklesia soporta doble moneda de forma nativa. Al ingresar un diezmo en USD, el sistema lo convierte automáticamente a Bolívares usando la tasa BCV oficial del día.',
  },
  {
    q: '¿Cómo funciona el proceso de aprobación de gastos?',
    a: 'Un líder ministerial genera una Solicitud de Presupuesto. El Tesorero la revisa y aprueba (o rechaza). Al ejecutarse el gasto, se carga la factura en foto para el historial de auditoría.',
  },
  {
    q: '¿El sistema es seguro? ¿Quién puede ver los datos financieros?',
    a: 'La plataforma cuenta con roles diferenciados: Pastor (vista general), Tesorero (gestión financiera), Líder Ministerial (solicitudes propias). Cada usuario solo accede a lo que le corresponde.',
  },
  {
    q: '¿Puedo usar MATEO desde el celular?',
    a: 'Sí. La plataforma está completamente optimizada para dispositivos móviles. Puedes registrar diezmos, cargar recibos y revisar reportes desde tu smartphone sin instalar ninguna aplicación.',
  },
  {
    q: '¿Qué pasa con mis datos si cancelo el plan?',
    a: 'Tienes acceso completo a tus datos durante 30 días después de cancelar. Puedes exportar todos los reportes, registros y comprobantes en formato PDF o CSV antes de que la cuenta se cierre.',
  },
];

export function LandingPage() {
  const navigate = useNavigate();
  return <LandingPageContent navigate={navigate} />;
}

export function LandingPageContent({ navigate }: { navigate: (path: string) => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('inicio');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isAnnual, setIsAnnual] = useState(true);

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 20);
    const sections = ['inicio', 'modulos', 'precios', 'faq'];
    for (const id of sections) {
      const el = document.getElementById(id);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= 120 && rect.bottom >= 120) {
          setActiveSection(id);
          break;
        }
      }
    }
  }, []);

  const handleResize = useCallback(() => {
    setIsMobile(window.innerWidth < 900);
    if (window.innerWidth >= 900) setMobileMenuOpen(false);
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [handleScroll, handleResize]);

  return (
    <div
      style={{
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        minHeight: '100vh',
        backgroundColor: '#F8FAFC',
        color: '#0F172A',
      }}
    >
      {/* ===== 1. NAVBAR SUPERIOR ===== */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          backgroundColor: scrolled ? '#1B5CB6' : 'white',
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid #E2E8F0',
          padding: isMobile ? '0.6rem 1.2rem' : scrolled ? '0.6rem 2.5rem' : '0.85rem 2.5rem',
          boxShadow: scrolled
            ? '0 10px 25px -4px rgba(15, 23, 42, 0.25)'
            : '0 1px 4px rgba(0,0,0,0.04)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* Logo Oficial Transparente: Azul en top, Blanco en scroll */}
          <div
            onClick={() => navigate('/')}
            style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          >
            <img
              src={
                scrolled
                  ? '/docs/propuestas/2_transparent.png'
                  : '/docs/propuestas/1_transparent.png'
              }
              alt="MATEO ekklesia"
              style={{
                height: isMobile ? '38px' : scrolled ? '42px' : '48px',
                width: 'auto',
                objectFit: 'contain',
                transition: 'height 0.3s ease',
              }}
            />
          </div>

          {/* Menú Escritorio */}
          {!isMobile && (
            <>
              <nav style={{ display: 'flex', gap: '2.2rem', alignItems: 'center' }}>
                {[
                  { id: 'inicio', label: 'Inicio' },
                  { id: 'modulos', label: 'Módulos' },
                  { id: 'precios', label: 'Precios' },
                  { id: 'faq', label: 'FAQ' },
                ].map((link) => {
                  const isActive = activeSection === link.id;
                  const isHovered = hoveredLink === link.id;
                  return (
                    <a
                      key={link.id}
                      href={`#${link.id}`}
                      onMouseEnter={() => setHoveredLink(link.id)}
                      onMouseLeave={() => setHoveredLink(null)}
                      style={{
                        color: scrolled
                          ? isActive
                            ? 'white'
                            : isHovered
                              ? 'white'
                              : 'rgba(255, 255, 255, 0.85)'
                          : isActive
                            ? '#1B5CB6'
                            : isHovered
                              ? '#0F172A'
                              : '#475569',
                        textDecoration: 'none',
                        transition: 'color 0.2s ease',
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: isActive ? 800 : 600,
                        fontSize: '0.96rem',
                        borderBottom: scrolled && isActive ? '2px solid white' : 'none',
                        paddingBottom: scrolled ? '2px' : '0',
                      }}
                    >
                      {link.label}
                    </a>
                  );
                })}
              </nav>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button
                  onClick={() => navigate('/login')}
                  onMouseEnter={() => setHoveredBtn('login')}
                  onMouseLeave={() => setHoveredBtn(null)}
                  style={{
                    backgroundColor: 'transparent',
                    color: scrolled
                      ? hoveredBtn === 'login'
                        ? 'white'
                        : 'rgba(255, 255, 255, 0.95)'
                      : hoveredBtn === 'login'
                        ? '#1B5CB6'
                        : '#0F172A',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    transition: 'color 0.25s ease',
                    padding: '0.6rem 1rem',
                  }}
                >
                  Iniciar Sesión
                </button>
                <button
                  onClick={() => navigate('/registro-ong')}
                  onMouseEnter={() => setHoveredBtn('register')}
                  onMouseLeave={() => setHoveredBtn(null)}
                  style={{
                    padding: '0.75rem 1.6rem',
                    backgroundColor: scrolled
                      ? 'white'
                      : hoveredBtn === 'register'
                        ? '#154B96'
                        : '#1B5CB6',
                    color: scrolled ? '#1B5CB6' : 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 800,
                    fontSize: '0.93rem',
                    cursor: 'pointer',
                    boxShadow: scrolled
                      ? '0 4px 14px rgba(0, 0, 0, 0.15)'
                      : hoveredBtn === 'register'
                        ? '0 8px 22px rgba(27, 92, 182, 0.38)'
                        : '0 4px 14px rgba(27, 92, 182, 0.22)',
                    transform: hoveredBtn === 'register' ? 'translateY(-1px)' : 'translateY(0)',
                    transition: 'all 0.25s ease',
                  }}
                >
                  Prueba Gratis 14 Días
                </button>
              </div>
            </>
          )}

          {/* Botón Hamburguesa Móvil */}
          {isMobile && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                backgroundColor: scrolled ? 'rgba(255, 255, 255, 0.15)' : '#EFF6FF',
                color: scrolled ? 'white' : '#1B5CB6',
                border: scrolled ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid #DBEAFE',
                borderRadius: '10px',
                padding: '0.6rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Abrir menú"
            >
              {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
            </button>
          )}
        </div>
      </header>

      {/* Menú Móvil Desplegable */}
      {isMobile && mobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            top: '72px',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'white',
            zIndex: 99,
            padding: '2rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.2rem',
            overflowY: 'auto',
          }}
        >
          {[
            { id: 'inicio', label: 'Inicio' },
            { id: 'modulos', label: 'Módulos' },
            { id: 'precios', label: 'Precios' },
            { id: 'faq', label: 'FAQ' },
          ].map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                color: activeSection === link.id ? '#1B5CB6' : '#0F172A',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '1.2rem',
                padding: '0.8rem 0',
                borderBottom: '1px solid #F1F5F9',
              }}
            >
              {link.label}
            </a>
          ))}
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1.5rem' }}
          >
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('/registro-ong');
              }}
              style={{
                width: '100%',
                padding: '1.05rem',
                backgroundColor: '#1B5CB6',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '1.05rem',
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(27, 92, 182, 0.3)',
              }}
            >
              Prueba Gratis 14 Días
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('/login');
              }}
              style={{
                width: '100%',
                padding: '1.05rem',
                backgroundColor: '#F1F5F9',
                color: '#0F172A',
                border: '1px solid #CBD5E1',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '1.05rem',
                cursor: 'pointer',
              }}
            >
              Iniciar Sesión
            </button>
          </div>
        </div>
      )}

      <main style={{ paddingTop: isMobile ? '82px' : '108px' }}>
        {/* ===== 2. HERO — LAPTOP + TELÉFONO CON PANTALLAS REALES ===== */}
        <section
          id="inicio"
          style={{
            position: 'relative',
            overflow: 'hidden',
            padding: isMobile ? '2.5rem 1rem 4rem' : '4rem 2rem 7rem',
            background: 'linear-gradient(155deg, #EFF6FF 0%, #F8FAFC 50%, #EEF2FF 100%)',
          }}
        >
          {/* Orbes de fondo decorativos */}
          {!isMobile && (
            <>
              <div
                style={{
                  position: 'absolute',
                  top: '-150px',
                  right: '-100px',
                  width: '550px',
                  height: '550px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(27,92,182,0.07) 0%, transparent 70%)',
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '-100px',
                  left: '-100px',
                  width: '450px',
                  height: '450px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
                  pointerEvents: 'none',
                }}
              />
            </>
          )}

          <div
            style={{
              maxWidth: '1280px',
              margin: '0 auto',
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1.2fr',
              gap: isMobile ? '3rem' : '5rem',
              alignItems: 'center',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {/* — Columna Izquierda: Texto y CTAs — */}
            <div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: 'rgba(27, 92, 182, 0.09)',
                  border: '1px solid rgba(27, 92, 182, 0.18)',
                  color: '#1B5CB6',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  padding: '0.42rem 1rem',
                  borderRadius: '999px',
                  marginBottom: '1.5rem',
                }}
              >
                <Sparkles size={14} /> MATEO ekklesia · Sistema Integral para Iglesias
              </span>

              <h1
                style={{
                  fontSize: isMobile ? '2rem' : 'clamp(2.3rem, 3.8vw, 3.4rem)',
                  fontWeight: 800,
                  lineHeight: 1.1,
                  marginBottom: '1.4rem',
                  letterSpacing: '-1px',
                  color: '#0F172A',
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                Transparencia y Eficiencia Administrativa para tu{' '}
                <span style={{ color: '#1B5CB6' }}>Iglesia</span>
              </h1>

              <p
                style={{
                  fontSize: isMobile ? '1rem' : '1.1rem',
                  color: '#475569',
                  lineHeight: 1.68,
                  marginBottom: '2.2rem',
                  maxWidth: '490px',
                }}
              >
                La plataforma todo en uno para gestionar diezmos en dos monedas (USD/VES),
                presupuestos ministeriales, gestión de miembros y auditoría en tiempo real.
              </p>

              <div
                style={{
                  display: 'flex',
                  gap: '1rem',
                  flexDirection: isMobile ? 'column' : 'row',
                  marginBottom: '2rem',
                }}
              >
                <button
                  onClick={() => navigate('/registro-ong')}
                  style={{
                    padding: '0.92rem 2.1rem',
                    backgroundColor: '#1B5CB6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '11px',
                    fontWeight: 800,
                    fontSize: '0.98rem',
                    cursor: 'pointer',
                    boxShadow: '0 10px 28px rgba(27, 92, 182, 0.28)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    width: isMobile ? '100%' : 'auto',
                  }}
                >
                  Prueba Gratis 14 Días <Sparkles size={16} />
                </button>
                <button
                  onClick={() => navigate('/login')}
                  style={{
                    padding: '0.92rem 1.7rem',
                    backgroundColor: 'white',
                    color: '#0F172A',
                    border: '1.5px solid #CBD5E1',
                    borderRadius: '11px',
                    fontWeight: 700,
                    fontSize: '0.98rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    width: isMobile ? '100%' : 'auto',
                  }}
                >
                  Iniciar Sesión
                </button>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.7rem',
                  fontSize: '0.83rem',
                  color: '#475569',
                  fontWeight: 600,
                }}
              >
                <div style={{ display: 'flex', gap: '0.1rem' }}>
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} fill="#F59E0B" stroke="none" color="#F59E0B" />
                  ))}
                </div>
                <span>
                  Valoración <strong>4.9/5</strong> · Sin tarjeta de crédito requerida
                </span>
              </div>
            </div>

            {/* — Columna Derecha: Imagen Fotorrealista MacBook + Teléfono — */}
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src="/hero_devices.png"
                alt="MATEO ekklesia — Tablero en MacBook Pro y teléfono"
                style={{
                  width: '100%',
                  maxWidth: isMobile ? '480px' : '680px',
                  height: 'auto',
                  display: 'block',
                  filter: 'drop-shadow(0 30px 50px rgba(15, 23, 42, 0.12))',
                  userSelect: 'none',
                }}
                draggable={false}
              />
            </div>
          </div>
        </section>

        {/* ===== 3. PROPÓSITO & TRANSPARENCIA ===== */}
        <section
          style={{
            padding: isMobile ? '3.5rem 1.2rem' : '5.5rem 1.5rem',
            backgroundColor: 'white',
            borderTop: '1px solid #E2E8F0',
          }}
        >
          <div
            style={{
              maxWidth: '1200px',
              margin: '0 auto',
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(12, 1fr)',
              gap: isMobile ? '2.5rem' : '4rem',
              alignItems: 'center',
            }}
          >
            <div style={{ gridColumn: isMobile ? 'span 12' : 'span 6' }}>
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  padding: isMobile ? '1.4rem' : '2rem',
                  borderRadius: '24px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    marginBottom: '1.5rem',
                    paddingBottom: '1rem',
                    borderBottom: '1px solid #E2E8F0',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '14px',
                      backgroundColor: '#EFF6FF',
                      color: '#1B5CB6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Layers size={26} />
                  </div>
                  <div>
                    <h4
                      style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}
                    >
                      Arquitectura Multi-Moneda
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0 }}>
                      Conversión automática al registrar diezmos en USD o Bolívares.
                    </p>
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    marginBottom: '1.5rem',
                    paddingBottom: '1rem',
                    borderBottom: '1px solid #E2E8F0',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '14px',
                      backgroundColor: '#ECFDF5',
                      color: '#10B981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <FileCheck size={26} />
                  </div>
                  <div>
                    <h4
                      style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}
                    >
                      Firma & Aprobaciones
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0 }}>
                      Flujo seguro de 3 pasos: Solicitud, Verificación y Aprobación.
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '14px',
                      backgroundColor: '#FEF3C7',
                      color: '#D97706',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Lock size={26} />
                  </div>
                  <div>
                    <h4
                      style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}
                    >
                      Auditoría Inmutable
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0 }}>
                      Registro inalterable de ingresos, egresos y comprobantes.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ gridColumn: isMobile ? 'span 12' : 'span 6' }}>
              <span
                style={{
                  color: '#1B5CB6',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                }}
              >
                PROPÓSITO & TRANSPARENCIA
              </span>
              <h2
                style={{
                  fontSize: isMobile ? '1.8rem' : 'clamp(1.8rem, 3vw, 2.5rem)',
                  fontWeight: 800,
                  color: '#0F172A',
                  margin: '0.6rem 0 1.2rem 0',
                  lineHeight: 1.25,
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                Diseñado para servir al liderazgo eclesial con excelencia
              </h2>
              <p
                style={{
                  color: '#475569',
                  fontSize: '1.02rem',
                  lineHeight: 1.65,
                  marginBottom: '2rem',
                }}
              >
                MATEO ekklesia fue concebido para eliminar la fatiga visual y el desorden
                administrativo en las iglesias. Permite que el equipo pastoral y de tesorería
                trabaje de forma colaborativa y en paz.
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: '1.2rem',
                }}
              >
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    padding: '1.2rem',
                    borderRadius: '14px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <Shield size={24} color="#1B5CB6" style={{ marginBottom: '0.5rem' }} />
                  <h4
                    style={{
                      fontSize: '0.98rem',
                      fontWeight: 800,
                      color: '#0F172A',
                      margin: '0 0 0.3rem 0',
                    }}
                  >
                    Firma & Permisos
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0 }}>
                    Roles diferenciados para pastores y tesoreros.
                  </p>
                </div>
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    padding: '1.2rem',
                    borderRadius: '14px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <Camera size={24} color="#8B5CF6" style={{ marginBottom: '0.5rem' }} />
                  <h4
                    style={{
                      fontSize: '0.98rem',
                      fontWeight: 800,
                      color: '#0F172A',
                      margin: '0 0 0.3rem 0',
                    }}
                  >
                    Fotos de Recibos
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0 }}>
                    Digitaliza comprobantes al momento del gasto.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== 4. MÓDULOS ===== */}
        <section
          id="modulos"
          style={{
            padding: isMobile ? '3.5rem 1.2rem' : '5.5rem 1.5rem',
            backgroundColor: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
          }}
        >
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: isMobile ? '2.5rem' : '4rem' }}>
              <span
                style={{
                  color: '#1B5CB6',
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
                  fontSize: isMobile ? '1.8rem' : 'clamp(1.8rem, 3.2vw, 2.6rem)',
                  fontWeight: 800,
                  color: '#0F172A',
                  marginTop: '0.5rem',
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                Todo lo que tu iglesia necesita en un solo lugar
              </h2>
              <p
                style={{
                  color: '#475569',
                  fontSize: '1.06rem',
                  maxWidth: '600px',
                  margin: '0.8rem auto 0',
                }}
              >
                Módulos interconectados para una gestión integral, transparente y sin papel.
              </p>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1.5rem',
              }}
            >
              {churchModules.map((mod, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: 'white',
                    padding: '1.6rem',
                    borderRadius: '20px',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                    (e.currentTarget as HTMLDivElement).style.boxShadow =
                      '0 12px 30px rgba(0,0,0,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLDivElement).style.boxShadow =
                      '0 4px 14px rgba(0,0,0,0.03)';
                  }}
                >
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '16px',
                      backgroundColor: mod.bg,
                      color: mod.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '1.1rem',
                    }}
                  >
                    {mod.icon}
                  </div>
                  <h3
                    style={{
                      fontSize: '1.02rem',
                      fontWeight: 800,
                      color: '#0F172A',
                      margin: '0 0 0.5rem 0',
                      fontFamily: "'Outfit', sans-serif",
                    }}
                  >
                    {mod.title}
                  </h3>
                  <p style={{ fontSize: '0.87rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                    {mod.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== 5. PRECIOS ===== */}
        <section
          id="precios"
          style={{
            backgroundColor: '#1B5CB6',
            padding: isMobile ? '4rem 1.2rem' : '6rem 2rem',
          }}
        >
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: isMobile ? '3rem' : '4.5rem' }}>
              <span
                style={{
                  color: 'white',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  letterSpacing: '2.5px',
                  textTransform: 'uppercase',
                  backgroundColor: 'rgba(255, 255, 255, 0.18)',
                  padding: '0.35rem 1.1rem',
                  borderRadius: '999px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                }}
              >
                PLANES & PRECIOS
              </span>
              <h2
                style={{
                  fontSize: isMobile ? '1.9rem' : 'clamp(2rem, 3.5vw, 2.8rem)',
                  fontWeight: 800,
                  color: 'white',
                  marginTop: '1.2rem',
                  fontFamily: "'Outfit', sans-serif",
                  lineHeight: 1.2,
                }}
              >
                Planes diseñados para cada etapa de tu Iglesia
              </h2>
              <p
                style={{
                  color: 'rgba(255, 255, 255, 0.88)',
                  fontSize: '1.05rem',
                  maxWidth: '560px',
                  margin: '0.9rem auto 0',
                  lineHeight: 1.65,
                }}
              >
                Sin contratos. Sin sorpresas. Cancela cuando quieras.
              </p>

              {/* Toggle Anual / Mensual */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '1rem',
                  marginTop: '2rem',
                }}
              >
                <span
                  style={{
                    color: !isAnnual ? 'white' : 'rgba(255, 255, 255, 0.75)',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    transition: 'color 0.2s',
                  }}
                >
                  Mensual
                </span>
                <button
                  onClick={() => setIsAnnual(!isAnnual)}
                  style={{
                    width: '52px',
                    height: '28px',
                    backgroundColor: isAnnual ? '#0F172A' : 'rgba(255, 255, 255, 0.3)',
                    borderRadius: '999px',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background-color 0.3s',
                  }}
                  aria-label="Cambiar periodo de facturación"
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '3px',
                      left: isAnnual ? '26px' : '3px',
                      width: '22px',
                      height: '22px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: 'left 0.3s',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                    }}
                  />
                </button>
                <span
                  style={{
                    color: isAnnual ? 'white' : 'rgba(255, 255, 255, 0.75)',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    transition: 'color 0.2s',
                  }}
                >
                  Anual
                  <span
                    style={{
                      marginLeft: '0.5rem',
                      backgroundColor: '#22C55E',
                      color: 'white',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '0.15rem 0.55rem',
                      borderRadius: '999px',
                    }}
                  >
                    -20%
                  </span>
                </span>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                gap: '1.8rem',
                alignItems: 'stretch',
              }}
            >
              {/* Plan Free */}
              <div
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  borderRadius: '22px',
                  padding: '2.2rem 1.8rem',
                  border: '1px solid rgba(255, 255, 255, 0.28)',
                  display: 'flex',
                  flexDirection: 'column',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <h3
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: 'white',
                    margin: '0 0 0.4rem 0',
                  }}
                >
                  Free
                </h3>
                <p
                  style={{
                    color: 'rgba(255, 255, 255, 0.85)',
                    fontSize: '0.88rem',
                    margin: '0 0 1.4rem 0',
                    lineHeight: 1.5,
                  }}
                >
                  Prueba todas las herramientas durante 14 días sin costo.
                </p>
                <div
                  style={{
                    fontSize: '2.6rem',
                    fontWeight: 900,
                    color: 'white',
                    marginBottom: '1.6rem',
                  }}
                >
                  $0
                  <span
                    style={{
                      fontSize: '0.88rem',
                      color: 'rgba(255, 255, 255, 0.75)',
                      fontWeight: 600,
                    }}
                  >
                    {' '}
                    / 14 días
                  </span>
                </div>
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: '0 0 2rem 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    fontSize: '0.9rem',
                    color: 'white',
                  }}
                >
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <CheckCircle2 size={17} color="#5EEAD4" /> Acceso completo a todos los módulos
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <CheckCircle2 size={17} color="#5EEAD4" /> Diezmos, Ofrendas y Solicitudes
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <CheckCircle2 size={17} color="#5EEAD4" /> Usuarios ilimitados
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <CheckCircle2 size={17} color="#5EEAD4" /> Reportes en PDF
                  </li>
                </ul>
                <button
                  onClick={() => navigate('/registro-ong')}
                  style={{
                    marginTop: 'auto',
                    width: '100%',
                    padding: '0.95rem',
                    backgroundColor: 'white',
                    color: '#1B5CB6',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
                  }}
                >
                  Iniciar Prueba Gratis
                </button>
              </div>

              {/* Plan Estándar — POPULAR (White card highlight) */}
              <div
                style={{
                  backgroundColor: 'white',
                  borderRadius: '24px',
                  padding: '2.4rem 1.9rem',
                  border: 'none',
                  boxShadow: '0 20px 45px rgba(15, 23, 42, 0.28)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  transform: isMobile ? 'none' : 'translateY(-6px)',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '-14px',
                    right: '22px',
                    backgroundColor: '#F59E0B',
                    color: 'white',
                    fontWeight: 900,
                    fontSize: '0.72rem',
                    padding: '0.28rem 0.9rem',
                    borderRadius: '999px',
                    letterSpacing: '0.5px',
                  }}
                >
                  POPULAR
                </span>
                <h3
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: '#0F172A',
                    margin: '0 0 0.4rem 0',
                  }}
                >
                  Estándar
                </h3>
                <p
                  style={{
                    color: '#475569',
                    fontSize: '0.88rem',
                    margin: '0 0 1.4rem 0',
                    lineHeight: 1.5,
                  }}
                >
                  Para congregaciones locales en pleno crecimiento.
                </p>
                <div
                  style={{
                    fontSize: '2.7rem',
                    fontWeight: 900,
                    color: '#1B5CB6',
                    marginBottom: '1.6rem',
                  }}
                >
                  {isAnnual ? '$19' : '$24'}
                  <span style={{ fontSize: '0.88rem', color: '#64748B', fontWeight: 600 }}>
                    {' '}
                    / {isAnnual ? 'mes, facturado anual' : 'mes'}
                  </span>
                </div>
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: '0 0 2rem 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    fontSize: '0.9rem',
                    color: '#334155',
                  }}
                >
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <CheckCircle2 size={17} color="#10B981" /> Todo lo incluido en Free
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <CheckCircle2 size={17} color="#10B981" /> Conciliación bancaria automática
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <CheckCircle2 size={17} color="#10B981" /> Historial de auditoría inmutable
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <CheckCircle2 size={17} color="#10B981" /> Soporte técnico prioritario
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <CheckCircle2 size={17} color="#10B981" /> Hasta 500 miembros
                  </li>
                </ul>
                <button
                  onClick={() => navigate('/registro-ong')}
                  style={{
                    marginTop: 'auto',
                    width: '100%',
                    padding: '0.95rem',
                    backgroundColor: '#1B5CB6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    boxShadow: '0 6px 18px rgba(27, 92, 182, 0.35)',
                  }}
                >
                  Comenzar con Estándar
                </button>
              </div>

              {/* Plan Avanzado */}
              <div
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  borderRadius: '22px',
                  padding: '2.2rem 1.8rem',
                  border: '1px solid rgba(255, 255, 255, 0.28)',
                  display: 'flex',
                  flexDirection: 'column',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <h3
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: 'white',
                    margin: '0 0 0.4rem 0',
                  }}
                >
                  Avanzado
                </h3>
                <p
                  style={{
                    color: 'rgba(255, 255, 255, 0.85)',
                    fontSize: '0.88rem',
                    margin: '0 0 1.4rem 0',
                    lineHeight: 1.5,
                  }}
                >
                  Para redes de iglesias o distritos con múltiples sedes.
                </p>
                <div
                  style={{
                    fontSize: '2.6rem',
                    fontWeight: 900,
                    color: 'white',
                    marginBottom: '1.6rem',
                  }}
                >
                  {isAnnual ? '$39' : '$49'}
                  <span
                    style={{
                      fontSize: '0.88rem',
                      color: 'rgba(255, 255, 255, 0.75)',
                      fontWeight: 600,
                    }}
                  >
                    {' '}
                    / {isAnnual ? 'mes, facturado anual' : 'mes'}
                  </span>
                </div>
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: '0 0 2rem 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    fontSize: '0.9rem',
                    color: 'white',
                  }}
                >
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <CheckCircle2 size={17} color="#A78BFA" /> Todo lo incluido en Estándar
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <CheckCircle2 size={17} color="#A78BFA" /> Multisede (varias congregaciones)
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <CheckCircle2 size={17} color="#A78BFA" /> Miembros ilimitados
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <CheckCircle2 size={17} color="#A78BFA" /> API & Integraciones
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <CheckCircle2 size={17} color="#A78BFA" /> Gerente de cuenta dedicado
                  </li>
                </ul>
                <button
                  onClick={() => navigate('/registro-ong')}
                  style={{
                    marginTop: 'auto',
                    width: '100%',
                    padding: '0.95rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '12px',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                  }}
                >
                  Contactar Ventas
                </button>
              </div>
            </div>
          </div>
        </section>
        {/* ===== 6. FAQ ===== */}
        <section
          id="faq"
          style={{
            padding: isMobile ? '3.5rem 1.2rem' : '5.5rem 1.5rem',
            backgroundColor: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
          }}
        >
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: isMobile ? '2.5rem' : '3.5rem' }}>
              <span
                style={{
                  color: '#1B5CB6',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                }}
              >
                PREGUNTAS FRECUENTES
              </span>
              <h2
                style={{
                  fontSize: isMobile ? '1.8rem' : 'clamp(1.8rem, 3.2vw, 2.6rem)',
                  fontWeight: 800,
                  color: '#0F172A',
                  marginTop: '0.5rem',
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                ¿Tienes dudas? Aquí están las respuestas
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    border: '1px solid #E2E8F0',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '1.3rem 1.5rem',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      gap: '1rem',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: '#0F172A',
                        lineHeight: 1.4,
                      }}
                    >
                      {faq.q}
                    </span>
                    {openFaq === i ? (
                      <Minus size={20} color="#1B5CB6" style={{ flexShrink: 0 }} />
                    ) : (
                      <Plus size={20} color="#64748B" style={{ flexShrink: 0 }} />
                    )}
                  </button>
                  {openFaq === i && (
                    <div
                      style={{
                        padding: '0 1.5rem 1.3rem',
                        color: '#475569',
                        fontSize: '0.95rem',
                        lineHeight: 1.65,
                        borderTop: '1px solid #F1F5F9',
                      }}
                    >
                      <p style={{ margin: '1rem 0 0 0' }}>{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== 7. CTA FINAL ===== */}
        <section
          style={{
            padding: isMobile ? '4rem 1.2rem' : '6rem 2rem',
            background: 'linear-gradient(135deg, #0F172A 0%, #1B5CB6 100%)',
            textAlign: 'center',
          }}
        >
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.85)',
                fontWeight: 700,
                fontSize: '0.82rem',
                padding: '0.4rem 1rem',
                borderRadius: '999px',
                marginBottom: '1.5rem',
                letterSpacing: '0.5px',
              }}
            >
              <Sparkles size={14} /> Empieza hoy · Sin tarjeta de crédito
            </span>
            <h2
              style={{
                fontSize: isMobile ? '2rem' : 'clamp(2rem, 4vw, 3rem)',
                fontWeight: 800,
                color: 'white',
                margin: '0 0 1.2rem 0',
                lineHeight: 1.15,
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              Tu iglesia merece una administración transparente y moderna
            </h2>
            <p
              style={{
                fontSize: '1.08rem',
                color: 'rgba(255,255,255,0.75)',
                marginBottom: '2.5rem',
                lineHeight: 1.6,
              }}
            >
              Únete a iglesias que ya gestionan sus finanzas con MATEO ekklesia. Prueba gratuita de
              14 días con acceso completo a todos los módulos.
            </p>
            <button
              onClick={() => navigate('/registro-ong')}
              style={{
                padding: '1.1rem 3rem',
                backgroundColor: 'white',
                color: '#1B5CB6',
                border: 'none',
                borderRadius: '14px',
                fontWeight: 800,
                fontSize: '1.08rem',
                cursor: 'pointer',
                boxShadow: '0 12px 30px rgba(0,0,0,0.2)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.6rem',
              }}
            >
              Registrar mi Iglesia <Sparkles size={18} />
            </button>
          </div>
        </section>

        {/* ===== 8. FOOTER ===== */}
        <footer
          style={{
            backgroundColor: '#0F172A',
            color: 'rgba(255,255,255,0.5)',
            padding: isMobile ? '2.5rem 1.2rem' : '3rem 2.5rem',
            textAlign: 'center',
          }}
        >
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.5rem',
              }}
            >
              <img
                src="/docs/propuestas/2_transparent.png"
                alt="MATEO"
                style={{ height: '42px', objectFit: 'contain' }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: isMobile ? '1.2rem' : '2.5rem',
                flexWrap: 'wrap',
                marginBottom: '1.5rem',
                fontSize: '0.88rem',
              }}
            >
              {['Inicio', 'Módulos', 'Precios', 'FAQ', 'Iniciar Sesión'].map((item) => (
                <a
                  key={item}
                  href="#inicio"
                  style={{
                    color: 'rgba(255,255,255,0.55)',
                    textDecoration: 'none',
                    fontWeight: 600,
                    transition: 'color 0.2s',
                  }}
                >
                  {item}
                </a>
              ))}
            </div>
            <p style={{ fontSize: '0.82rem', margin: 0 }}>
              © {new Date().getFullYear()} MATEO ekklesia · Plataforma de Gestión Eclesiástica ·
              Todos los derechos reservados.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
