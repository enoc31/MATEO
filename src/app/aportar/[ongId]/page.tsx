import ContributionShell from './contribution-shell';

export default async function ContributionPage({ params }: { params: Promise<{ ongId: string }> }) {
  const { ongId } = await params;
  return <ContributionShell ongId={ongId} />;
}
