'use client';

import { useRouter } from 'next/navigation';
import { LandingPageContent } from '../features/landing/LandingPage';
import NextProviders from './next-providers';
import PublicAuthGate from './public-auth-gate';

export default function LandingClient() {
  const router = useRouter();
  return (
    <NextProviders>
      <PublicAuthGate>
        <LandingPageContent navigate={(path) => router.push(path)} />
      </PublicAuthGate>
    </NextProviders>
  );
}
