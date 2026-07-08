import React from 'react';
import { FileText, CheckCircle, Receipt, Search, Scale } from 'lucide-react';

export type FlowchartStep = 'requisicion' | 'autorizacion' | 'ejecucion' | 'auditoria' | 'conciliacion';

interface ProcessFlowchartProps {
  currentStep: FlowchartStep;
  description?: string;
}

const steps = [
  { id: 'requisicion', label: 'Requisición', icon: FileText },
  { id: 'autorizacion', label: 'Autorización', icon: CheckCircle },
  { id: 'ejecucion', label: 'Ejecución', icon: Receipt },
  { id: 'auditoria', label: 'Auditoría', icon: Search },
  { id: 'conciliacion', label: 'Conciliación', icon: Scale },
];

export const ProcessFlowchart: React.FC<ProcessFlowchartProps> = ({ currentStep, description }) => {
  const currentIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="card animate-fade-in" style={{ padding: '1.5rem', marginBottom: '2rem', backgroundColor: 'var(--surface)' }}>
      {description && (
        <div style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div style={{ width: '4px', height: '18px', backgroundColor: 'var(--primary)', borderRadius: '2px' }}></div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--neutral-dark)' }}>
              Importancia en el Control Interno
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--neutral-dark)', opacity: 0.8, lineHeight: 1.5 }}>
            {description}
          </p>
        </div>
      )}

      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', overflowX: 'auto', padding: '0.5rem 0' }}>
        
        {/* Línea conectora de fondo */}
        <div style={{ 
          position: 'absolute', 
          top: '20px', 
          left: '5%', 
          right: '5%', 
          height: '2px', 
          backgroundColor: 'var(--border-color)', 
          zIndex: 1 
        }} />

        {/* Línea conectora de progreso (hasta el paso actual) */}
        <div style={{ 
          position: 'absolute', 
          top: '20px', 
          left: '5%', 
          width: `${Math.max(0, (currentIndex / (steps.length - 1)) * 90)}%`, 
          height: '2px', 
          backgroundColor: 'var(--primary)', 
          transition: 'width 0.5s ease',
          zIndex: 2 
        }} />

        {steps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          
          let bgColor = 'var(--surface)';
          let borderColor = 'var(--border-color)';
          let iconColor = 'var(--neutral-dark)';
          if (isCompleted) {
            bgColor = 'var(--success)';
            borderColor = 'var(--success)';
            iconColor = '#ffffff';
          } else if (isCurrent) {
            bgColor = 'var(--primary)';
            borderColor = 'var(--primary)';
            iconColor = '#ffffff';
          }

          return (
            <div key={step.id} style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              zIndex: 3,
              width: '20%',
              minWidth: '80px',
              opacity: isCurrent ? 1 : (isCompleted ? 0.9 : 0.6),
              transition: 'all 0.3s ease'
            }}>
              <div style={{
                width: isCurrent ? '48px' : '40px',
                height: isCurrent ? '48px' : '40px',
                borderRadius: '50%',
                backgroundColor: bgColor,
                border: `2px solid ${borderColor}`,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: '0.75rem',
                boxShadow: isCurrent ? '0 0 0 4px rgba(47, 90, 174, 0.2)' : 'none',
                transition: 'all 0.3s ease'
              }}>
                <Icon size={isCurrent ? 24 : 18} color={iconColor} strokeWidth={isCurrent ? 2 : 1.5} />
              </div>
              <span style={{ 
                fontSize: isCurrent ? '0.85rem' : '0.75rem', 
                fontWeight: isCurrent ? 700 : 600, 
                color: isCurrent ? 'var(--primary)' : 'var(--neutral-dark)',
                textAlign: 'center',
                lineHeight: 1.2
              }}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
