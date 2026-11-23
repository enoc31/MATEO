'use client';

import { BeneficiaryRegistry } from '../../features/beneficiaries/BeneficiaryRegistry';
import NextProviders from '../next-providers';

export default function RegistrationClient() {
  return (
    <NextProviders>
      <div style={{ backgroundColor: '#f4f5f7', minHeight: '100vh', padding: '1rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <img
            src="/mateo_logo.png"
            alt="Logo MATEO"
            style={{
              height: '50px',
              width: '50px',
              objectFit: 'contain',
              borderRadius: '10px',
            }}
          />
        </div>
        <BeneficiaryRegistry />
      </div>
    </NextProviders>
  );
}
