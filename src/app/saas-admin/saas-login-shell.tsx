'use client';

import dynamic from 'next/dynamic';

const SaasLoginClient = dynamic(() => import('./saas-login-client'), { ssr: false });

export default function SaasLoginShell() {
  return <SaasLoginClient />;
}
