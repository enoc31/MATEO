'use client';

import { PublicContributionFormForOng } from '../../../features/finance/PublicContributionForm';
import NextProviders from '../../next-providers';

export default function ContributionClient({ ongId }: { ongId: string }) {
  return (
    <NextProviders>
      <PublicContributionFormForOng ongId={ongId} />
    </NextProviders>
  );
}
