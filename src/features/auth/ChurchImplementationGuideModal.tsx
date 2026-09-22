import React from 'react';
import {
  CheckCircle2,
  Users,
  CalendarDays,
  Wallet,
  Sparkles,
  ArrowRight,
  X,
  Compass,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ChurchImplementationGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  churchName?: string;
  completedSteps?: number[];
}

export const ChurchImplementationGuideModal: React.FC<ChurchImplementationGuideModalProps> = ({
  isOpen,
  onClose,
  churchName = 'Tu Iglesia',
  completedSteps = [1],
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const steps = [
    {
      id: 1,
      title: '1. Registro e Identidad de la Iglesia',
      desc: 'Nombre del templo, dirección en Venezuela (Estado/Municipio/Parroquia), pastores responsables e identificación legal (RIF o C.I.).',
      icon: <Sparkles size={20} className="text-amber-500" />,
      completed: completedSteps.includes(1),
      actionLabel: 'Verificado',
      actionRoute: null,
    },
    {
      id: 2,
      title: '2. Relación de Miembros y Fieles',
      desc: 'Registra los feligreses de la congregación, marca el estado de bautismo en agua y adjunta fotos de cédula o perfil 360°.',
      icon: <Users size={20} className="text-blue-500" />,
      completed: completedSteps.includes(2),
      actionLabel: 'Ir a Miembros',
      actionRoute: '/app?tab=beneficiaries',
    },
    {
      id: 3,
      title: '3. Estructura Eclesiástica y Ministerios',
      desc: 'Asigna pastores, diáconos y servidores en las 5 Áreas Ministeriales: Proclamación, Enseñanza, Servicio, Compañerismo y Adoración.',
      icon: <CalendarDays size={20} className="text-emerald-500" />,
      completed: completedSteps.includes(3),
      actionLabel: 'Configurar Ministerios',
      actionRoute: '/app?tab=jornadas',
    },
    {
      id: 4,
      title: '4. Finanzas, Presupuesto de Obra y Diezmos',
      desc: 'Registra la tasa BCV oficial del día, establece el presupuesto congregacional y lleva la relación de diezmos y ofrendas (USD/VES).',
      icon: <Wallet size={20} className="text-purple-500" />,
      completed: completedSteps.includes(4),
      actionLabel: 'Registrar Finanzas',
      actionRoute: '/app?tab=incomes',
    },
  ];

  const currentProgress = Math.round((completedSteps.length / steps.length) * 100);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)',
        zIndex: 1300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '24px',
          maxWidth: '750px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado del Modal */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1B5CB6 0%, #0F3C7A 100%)',
            color: 'white',
            padding: '2rem',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
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

          <div
            style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.6rem' }}
          >
            <span
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                padding: '0.4rem 0.8rem',
                borderRadius: '999px',
                fontSize: '0.78rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <Compass size={14} /> GUÍA PASO A PASO
            </span>
          </div>

          <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900 }}>
            🚀 Ruta de Implementación Congregacional
          </h2>
          <p style={{ margin: '0.4rem 0 0 0', opacity: 0.9, fontSize: '0.95rem' }}>
            Guía práctica para la puesta en marcha de <strong>{churchName}</strong> en MATEO
            Ekklesia.
          </p>

          {/* Barra de Progreso */}
          <div
            style={{
              marginTop: '1.5rem',
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderRadius: '12px',
              padding: '0.8rem 1rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.82rem',
                fontWeight: 800,
                marginBottom: '0.4rem',
              }}
            >
              <span>Progreso de Implementación</span>
              <span>{currentProgress}% Completado</span>
            </div>
            <div
              style={{
                width: '100%',
                height: '8px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: '999px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${currentProgress}%`,
                  height: '100%',
                  backgroundColor: '#34D399',
                  borderRadius: '999px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        </div>

        {/* Cuerpo del Modal - Pasos */}
        <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {steps.map((st) => (
            <div
              key={st.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.2rem',
                borderRadius: '16px',
                backgroundColor: st.completed ? '#F0FDF4' : '#F8FAFC',
                border: st.completed ? '1px solid #BBF7D0' : '1px solid #E2E8F0',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    backgroundColor: st.completed ? '#DCFCE7' : '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {st.completed ? <CheckCircle2 size={24} className="text-emerald-600" /> : st.icon}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                    {st.title}
                  </h4>
                  <p
                    style={{
                      margin: '0.2rem 0 0 0',
                      fontSize: '0.82rem',
                      color: '#64748B',
                      lineHeight: 1.4,
                    }}
                  >
                    {st.desc}
                  </p>
                </div>
              </div>

              {st.actionRoute && !st.completed ? (
                <button
                  onClick={() => {
                    onClose();
                    navigate(st.actionRoute!);
                  }}
                  className="btn btn-primary"
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.8rem',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    borderRadius: '10px',
                    flexShrink: 0,
                  }}
                >
                  {st.actionLabel} <ArrowRight size={14} />
                </button>
              ) : (
                <span
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    backgroundColor: st.completed ? '#DCFCE7' : '#E2E8F0',
                    color: st.completed ? '#15803D' : '#64748B',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {st.completed ? '✓ Completado' : 'Pendiente'}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Pie del Modal */}
        <div
          style={{
            padding: '1.2rem 2rem',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            borderBottomLeftRadius: '24px',
            borderBottomRightRadius: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '0.82rem', color: '#64748B' }}>
            Esta guía estará siempre disponible desde la barra superior de MATEO.
          </span>
          <button
            className="btn btn-primary"
            onClick={onClose}
            style={{ padding: '0.5rem 1.2rem' }}
          >
            Entendido, Continuar
          </button>
        </div>
      </div>
    </div>
  );
};
