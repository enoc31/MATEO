'use client';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext';
import { LayoutContent } from '../../../../components/Layout';
import { AccessDenied } from '../../../../App';
import { ProjectPartidasConfigContent } from '../../../../features/budgets/ProjectPartidasConfig';
import WorkspaceGuard from '../../workspace-guard';

function Project({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { profile } = useAuth();
  const navigate = (path: string) => router.push(path);
  return (
    <LayoutContent pathname={`/app/project-partidas/${projectId}`} navigate={navigate} nativeLinks>
      {profile && ['administrador', 'admin_iglesia', 'director'].includes(profile.rol) ? (
        <ProjectPartidasConfigContent projectId={projectId} navigate={navigate} />
      ) : (
        <AccessDenied />
      )}
    </LayoutContent>
  );
}
export default function ProjectClient({ projectId }: { projectId: string }) {
  return (
    <WorkspaceGuard>
      <Project projectId={projectId} />
    </WorkspaceGuard>
  );
}
