import { redirect } from 'next/navigation';
import UnknownWorkspaceShell from '../app/unknown-workspace-shell';
import SaasWorkspaceShell from '../saas-admin/[section]/workspace-shell';

export default async function Page({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  if (path[0] === 'app') return <UnknownWorkspaceShell standalone />;
  if (path[0] === 'saas-admin') return <SaasWorkspaceShell section="__unknown__" />;
  redirect('/');
}
