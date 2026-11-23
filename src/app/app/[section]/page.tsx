import ModuleShell from './module-shell';
import { isMigratedSection } from './sections';
import UnknownWorkspaceShell from '../unknown-workspace-shell';

export default async function ModulePage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  return isMigratedSection(section) ? <ModuleShell section={section} /> : <UnknownWorkspaceShell />;
}
