'use client';
import dynamic from 'next/dynamic';
const ProjectClient = dynamic(() => import('./project-client'), { ssr: false });
export default function ProjectShell({ projectId }: { projectId: string }) {
  return <ProjectClient projectId={projectId} />;
}
