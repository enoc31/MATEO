'use client';

import dynamic from 'next/dynamic';

const ContributionClient = dynamic(() => import('./contribution-client'), { ssr: false });

export default function ContributionShell({ ongId }: { ongId: string }) {
  return <ContributionClient ongId={ongId} />;
}
