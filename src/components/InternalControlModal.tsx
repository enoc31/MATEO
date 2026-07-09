import React from 'react';
import { BookOpen, ShieldCheck, Heart, AlertTriangle, Eye, Target } from 'lucide-react';

interface InternalControlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InternalControlModal: React.FC<InternalControlModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        padding: '1.5rem',
        overflowY: 'auto',
      }}
    >
      <div
        className="card animate-scale-in"
        style={{
          width: '100%',
          maxWidth: '850px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundColor: 'var(--card-bg, #ffffff)',
        }}
      >
        {/* Encabezado */}
        <div
          style={{
            backgroundColor: 'var(--primary)',
            color: '#ffffff',
            padding: '2rem',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#ffffff',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              fontSize: '1.2rem',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
          >
            &times;
          </button>

          <BookOpen size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.9 }} />
          <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>¡Bienvenido a MATEO!</h2>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.1rem', opacity: 0.9 }}>
            Tu rol en la Transparencia y el Impacto de la CNBV
          </p>
        </div>

        {/* Cuerpo */}
        <div style={{ padding: '2rem', overflowY: 'auto' }}>
          <p
            style={{
              fontSize: '1.05rem',
              lineHeight: 1.6,
              color: 'var(--neutral-dark)',
              marginBottom: '1.5rem',
            }}
          >
            Antes de empezar, queremos compartir contigo un concepto clave para nuestro ministerio:
            el <strong>Control Interno</strong>. Más que un término administrativo, es el conjunto
            de buenas prácticas que nos permite administrar cada donación con{' '}
            <strong>absoluta transparencia</strong>, construir <strong>confianza</strong> en nuestra
            comunidad y asegurar que cada recurso genere un <strong>impacto real</strong>.
          </p>

          <p
            style={{
              fontSize: '1.05rem',
              lineHeight: 1.6,
              color: 'var(--neutral-dark)',
              marginBottom: '2rem',
            }}
          >
            Para lograrlo, nos guiamos por 5 pilares fundamentales (basados en el modelo
            internacional COSO), adaptados especialmente para proteger nuestra misión:
          </p>

          <h3
            style={{
              color: 'var(--primary)',
              fontWeight: 700,
              fontSize: '1.3rem',
              marginBottom: '1.25rem',
              borderBottom: '2px solid var(--border-color)',
              paddingBottom: '0.5rem',
            }}
          >
            Los 5 Pilares de nuestro Control Interno
          </h3>

          <div style={{ display: 'grid', gap: '1.25rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div
                style={{
                  background: 'rgba(47, 90, 174, 0.1)',
                  padding: '0.75rem',
                  borderRadius: '12px',
                }}
              >
                <Heart size={24} color="var(--primary)" />
              </div>
              <div>
                <h4
                  style={{ margin: '0 0 0.25rem 0', fontWeight: 700, color: 'var(--neutral-dark)' }}
                >
                  Entorno de Control (Nuestra Base Ética)
                </h4>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.95rem',
                    color: 'var(--neutral-dark)',
                    opacity: 0.8,
                    lineHeight: 1.5,
                  }}
                >
                  Todo comienza con la integridad y nuestros valores. Es el compromiso de cada uno
                  de nosotros de hacer lo correcto en todo momento.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div
                style={{
                  background: 'rgba(217, 119, 6, 0.1)',
                  padding: '0.75rem',
                  borderRadius: '12px',
                }}
              >
                <AlertTriangle size={24} color="#d97706" />
              </div>
              <div>
                <h4
                  style={{ margin: '0 0 0.25rem 0', fontWeight: 700, color: 'var(--neutral-dark)' }}
                >
                  Evaluación de Riesgos (Anticipar para Proteger)
                </h4>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.95rem',
                    color: 'var(--neutral-dark)',
                    opacity: 0.8,
                    lineHeight: 1.5,
                  }}
                >
                  Identificamos de forma proactiva qué obstáculos podrían afectar nuestros
                  objetivos, para estar preparados y proteger los recursos que el Señor nos ha
                  confiado.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div
                style={{
                  background: 'rgba(7, 58, 17, 0.1)',
                  padding: '0.75rem',
                  borderRadius: '12px',
                }}
              >
                <ShieldCheck size={24} color="var(--success)" />
              </div>
              <div>
                <h4
                  style={{ margin: '0 0 0.25rem 0', fontWeight: 700, color: 'var(--neutral-dark)' }}
                >
                  Actividades de Control (Cuentas Claras)
                </h4>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.95rem',
                    color: 'var(--neutral-dark)',
                    opacity: 0.8,
                    lineHeight: 1.5,
                  }}
                >
                  Son las acciones diarias que nos cuidan: solicitar las autorizaciones correctas,
                  realizar conciliaciones y separar las funciones para que siempre haya revisiones
                  cruzadas.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div
                style={{
                  background: 'rgba(0, 143, 166, 0.1)',
                  padding: '0.75rem',
                  borderRadius: '12px',
                }}
              >
                <Eye size={24} color="var(--accent)" />
              </div>
              <div>
                <h4
                  style={{ margin: '0 0 0.25rem 0', fontWeight: 700, color: 'var(--neutral-dark)' }}
                >
                  Información y Comunicación (Diálogo Abierto)
                </h4>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.95rem',
                    color: 'var(--neutral-dark)',
                    opacity: 0.8,
                    lineHeight: 1.5,
                  }}
                >
                  Aseguramos que la información financiera y operativa fluya de manera clara,
                  precisa y oportuna para tomar buenas decisiones en equipo.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div
                style={{
                  background: 'rgba(100, 116, 139, 0.1)',
                  padding: '0.75rem',
                  borderRadius: '12px',
                }}
              >
                <Target size={24} color="#64748b" />
              </div>
              <div>
                <h4
                  style={{ margin: '0 0 0.25rem 0', fontWeight: 700, color: 'var(--neutral-dark)' }}
                >
                  Actividades de Monitoreo (Mejora Continua)
                </h4>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.95rem',
                    color: 'var(--neutral-dark)',
                    opacity: 0.8,
                    lineHeight: 1.5,
                  }}
                >
                  Siempre estamos revisando y evaluando nuestros procesos. Si algo se puede hacer de
                  forma más segura o eficiente, ¡lo ajustamos!
                </p>
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'rgba(47, 90, 174, 0.05)',
              border: '1px solid rgba(47, 90, 174, 0.2)',
              borderRadius: '12px',
              padding: '1.5rem',
              textAlign: 'center',
            }}
          >
            <h3
              style={{
                margin: '0 0 1rem 0',
                color: 'var(--primary)',
                fontWeight: 800,
                fontSize: '1.4rem',
              }}
            >
              ¡Tú eres la pieza clave!
            </h3>

            <blockquote
              style={{
                fontStyle: 'italic',
                color: 'var(--neutral-dark)',
                fontSize: '1.1rem',
                margin: '0 0 1rem 0',
                padding: '0.5rem 1rem',
                borderLeft: '4px solid var(--primary)',
                background: 'rgba(255,255,255,0.5)',
                textAlign: 'left',
              }}
            >
              "Ahora bien, se requiere de los administradores, que cada uno sea hallado fiel."{' '}
              <br />
              <strong style={{ fontSize: '0.9rem', color: 'var(--primary)' }}>
                — 1 Corintios 4:2 (RVR1960)
              </strong>
            </blockquote>

            <p
              style={{
                margin: 0,
                fontSize: '1rem',
                color: 'var(--neutral-dark)',
                lineHeight: 1.6,
                textAlign: 'left',
              }}
            >
              El Control Interno no es solo trabajo de los auditores o directivos.{' '}
              <strong>Tú eres nuestra primera línea de defensa</strong> para la integridad de la
              CNBV. Cada registro exacto que haces y cada procedimiento que sigues en MATEO es un
              acto de <strong>buena mayordomía</strong> que honra a Dios y el propósito de quienes
              nos apoyan.
            </p>
            <p
              style={{
                margin: '1rem 0 0 0',
                fontWeight: 700,
                color: 'var(--primary)',
                fontSize: '1.1rem',
              }}
            >
              ¡Gracias por tu compromiso y por ayudarnos a ser fieles administradores!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1.5rem 2rem',
            backgroundColor: 'var(--background, #f4f5f7)',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <button
            onClick={onClose}
            className="btn btn-primary"
            style={{ width: '100%', maxWidth: '300px', fontSize: '1.1rem', padding: '0.75rem' }}
          >
            Entendido, ¡Comencemos!
          </button>
        </div>
      </div>
    </div>
  );
};
