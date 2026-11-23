'use client';

import { usePathname, useRouter } from 'next/navigation';
import { LayoutContent } from '../../components/Layout';
import NextProviders from '../next-providers';
import WorkspaceGuard from './workspace-guard';

function UnknownWorkspace() {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <WorkspaceGuard>
      <LayoutContent pathname={pathname} navigate={(path) => router.push(path)} nativeLinks>
        <div>Página no encontrada</div>
      </LayoutContent>
    </WorkspaceGuard>
  );
}

export default function UnknownWorkspaceClient({ standalone }: { standalone: boolean }) {
  return standalone ? (
    <NextProviders>
      <UnknownWorkspace />
    </NextProviders>
  ) : (
    <UnknownWorkspace />
  );
}
