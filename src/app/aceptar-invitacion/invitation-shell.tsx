'use client';

import dynamic from 'next/dynamic';

const InvitationClient = dynamic(() => import('./invitation-client'), { ssr: false });

export default function InvitationShell({ token }: { token: string }) {
  return <InvitationClient token={token} />;
}
