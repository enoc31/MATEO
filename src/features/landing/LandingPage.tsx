import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Activity, Users, ArrowRight } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '1.5rem 2rem',
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: 'white'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '1.5rem'
          }}>
            M
          </div>
          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.5px' }}>
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
              fontSize: '1rem'
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
              gap: '0.5rem'
            }}
          >
            Portal de ONGs <ArrowRight size={16} />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main style={{ 
        flex: 1, 
        backgroundImage: 'linear-gradient(rgba(248, 250, 252, 0.85), rgba(248, 250, 252, 0.95)), url("/humanitarian_aid_bg.png")', 
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        display: 'flex', 
        flexDirection: 'column' 
      }}>
        <section style={{
          textAlign: 'center',
          padding: '5rem 2rem',
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          <h1 style={{ 
            fontSize: '3.5rem', 
            fontWeight: 800, 
            color: '#0f172a',
            lineHeight: 1.2,
            marginBottom: '1.5rem'
          }}>
            Transparencia y Control para tu <span style={{ color: '#3b82f6' }}>Organización</span>
          </h1>
          <p style={{
            fontSize: '1.25rem',
            color: '#475569',
            lineHeight: 1.6,
            marginBottom: '2.5rem'
          }}>
            MATEO es la plataforma integral de gestión humanitaria diseñada para ONGs.
            Controla presupuestos, audita gastos y asegura la transparencia financiera en cada proyecto.
          </p>
          <button 
            onClick={() => navigate('/login')}
            style={{
              padding: '1rem 2rem',
              backgroundColor: '#1e3a8a',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '1.2rem',
              cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(30, 58, 138, 0.2)'
            }}
          >
            Ingresar a la Plataforma
          </button>
        </section>

        {/* Features */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
          padding: '4rem 2rem',
          maxWidth: '1200px',
          margin: '0 auto',
          width: '100%'
        }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <Shield size={40} color="#3b82f6" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>Aislamiento Seguro</h3>
            <p style={{ color: '#64748b', lineHeight: 1.5 }}>
              Tus datos están protegidos. La información financiera y operativa de tu ONG es completamente privada y aislada de otras organizaciones en la plataforma.
            </p>
          </div>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <Activity size={40} color="#10b981" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>Auditoría en Tiempo Real</h3>
            <p style={{ color: '#64748b', lineHeight: 1.5 }}>
              Aprueba requisiciones, concilia movimientos bancarios y mantén un control presupuestario estricto con un flujo de trabajo auditable paso a paso.
            </p>
          </div>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <Users size={40} color="#8b5cf6" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>Gestión de Equipos</h3>
            <p style={{ color: '#64748b', lineHeight: 1.5 }}>
              Maneja diferentes roles: directores, auditores y auxiliares de campo, cada uno con accesos y permisos específicos adaptados a sus funciones.
            </p>
          </div>
        </section>
      </main>

      <footer style={{ backgroundColor: '#0f172a', color: '#94a3b8', padding: '2rem', textAlign: 'center' }}>
        MATEO - Sistema de Gestión Humanitaria © {new Date().getFullYear()}
      </footer>
    </div>
  );
};
