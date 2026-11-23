'use client';

import dynamic from 'next/dynamic';

const WorkspaceHomeClient = dynamic(() => import('./workspace-home-client'), { ssr: false });

export default function WorkspaceHomeShell() {
  return <WorkspaceHomeClient />;
}
