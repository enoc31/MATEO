'use client';

import dynamic from 'next/dynamic';
const UnknownWorkspaceClient = dynamic(() => import('./unknown-workspace-client'), { ssr: false });
export default function UnknownWorkspaceShell({ standalone = false }: { standalone?: boolean }) {
  return <UnknownWorkspaceClient standalone={standalone} />;
}
