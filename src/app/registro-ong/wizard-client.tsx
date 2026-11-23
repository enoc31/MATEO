'use client';

import { useRouter } from 'next/navigation';
import { CreateOngWizardForm } from '../../features/auth/CreateOngWizard';
import NextProviders from '../next-providers';
import PublicAuthGate from '../public-auth-gate';

export default function WizardClient() {
  const router = useRouter();
  return (
    <NextProviders>
      <PublicAuthGate>
        <CreateOngWizardForm navigate={(path) => router.push(path)} nativeLinks />
      </PublicAuthGate>
    </NextProviders>
  );
}
