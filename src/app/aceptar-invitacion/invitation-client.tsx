'use client';

import { useRouter } from 'next/navigation';
import { AcceptInvitationForm } from '../../features/auth/AcceptInvitation';
import NextProviders from '../next-providers';
import PublicAuthGate from '../public-auth-gate';

export default function InvitationClient({ token }: { token: string }) {
  const router = useRouter();
  return (
    <NextProviders>
      <PublicAuthGate>
        <AcceptInvitationForm
          tokenFromUrl={token}
          navigate={(path) => router.push(path)}
          nativeLinks
        />
      </PublicAuthGate>
    </NextProviders>
  );
}
