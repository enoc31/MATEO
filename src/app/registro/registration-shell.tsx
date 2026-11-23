'use client';

import dynamic from 'next/dynamic';

const RegistrationClient = dynamic(() => import('./registration-client'), { ssr: false });

export default function RegistrationShell() {
  return <RegistrationClient />;
}
