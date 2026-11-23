import type { ReactNode } from 'react';
import WorkspaceProviders from './workspace-providers';

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <WorkspaceProviders>{children}</WorkspaceProviders>;
}
