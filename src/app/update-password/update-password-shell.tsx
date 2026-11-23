'use client';

import dynamic from 'next/dynamic';

const UpdatePasswordClient = dynamic(() => import('./update-password-client'), { ssr: false });

export default function UpdatePasswordShell() {
  return <UpdatePasswordClient />;
}
