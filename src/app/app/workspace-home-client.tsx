'use client';

import { useRouter } from 'next/navigation';
import { LayoutContent } from '../../components/Layout';
import { AppsDashboardContent } from '../../components/AppsDashboard';
import WorkspaceGuard from './workspace-guard';

export default function WorkspaceHomeClient() {
  const router = useRouter();
  const navigate = (path: string) => router.push(path);
  return (
    <WorkspaceGuard>
      <LayoutContent pathname="/app" navigate={navigate} nativeLinks>
        <AppsDashboardContent navigate={navigate} />
      </LayoutContent>
    </WorkspaceGuard>
  );
}
