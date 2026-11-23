'use client';

import dynamic from 'next/dynamic';

const ForgotPasswordClient = dynamic(() => import('./forgot-password-client'), { ssr: false });

export default function ForgotPasswordShell() {
  return <ForgotPasswordClient />;
}
