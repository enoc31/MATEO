import SaasWorkspaceShell from './workspace-shell';

export default async function SaasWorkspacePage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  return <SaasWorkspaceShell section={section} />;
}
