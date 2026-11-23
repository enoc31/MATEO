import ProjectShell from './project-shell';

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ProjectShell projectId={projectId} />;
}
