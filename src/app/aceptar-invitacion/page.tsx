import InvitationShell from './invitation-shell';

export default async function InvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;
  return <InvitationShell token={Array.isArray(token) ? token[0] || '' : token || ''} />;
}
