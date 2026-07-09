import React from 'react';
import { CheckCircle, UserPlus } from 'lucide-react';

interface SuccessScreenProps {
  onNewRegistration: () => void;
}

export const SuccessScreen: React.FC<SuccessScreenProps> = ({ onNewRegistration }) => {
  return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
        <CheckCircle size={80} color="var(--success)" strokeWidth={1.5} />
      </div>
      <h3
        style={{
          fontSize: '1.5rem',
          color: 'var(--primary)',
          marginBottom: '1rem',
          fontWeight: 700,
        }}
      >
        ¡Registro Exitoso!
      </h3>
      <p
        style={{
          color: 'var(--neutral-dark)',
          opacity: 0.8,
          marginBottom: '2.5rem',
          maxWidth: '400px',
          margin: '0 auto 2.5rem auto',
        }}
      >
        El beneficiario y su firma han sido guardados correctamente en el sistema.
      </p>

      <button
        onClick={onNewRegistration}
        className="btn btn-primary"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '1rem 2rem',
          fontSize: '1.1rem',
          fontWeight: 700,
        }}
      >
        <UserPlus size={20} /> Nuevo Registro
      </button>
    </div>
  );
};
