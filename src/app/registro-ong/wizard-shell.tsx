'use client';

import dynamic from 'next/dynamic';

const WizardClient = dynamic(() => import('./wizard-client'), { ssr: false });

export default function WizardShell() {
  return <WizardClient />;
}
