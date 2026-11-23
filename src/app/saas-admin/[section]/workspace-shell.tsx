'use client';

import dynamic from 'next/dynamic';

const WorkspaceClient = dynamic(() => import('./workspace-client'), { ssr: false });

export default function SaasWorkspaceShell({ section }: { section: string }) {
  return <WorkspaceClient section={section} />;
}
