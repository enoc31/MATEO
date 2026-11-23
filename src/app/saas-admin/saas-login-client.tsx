'use client';

import { SaasLogin } from '../../features/saas/SaasLogin';
import NextProviders from '../next-providers';
import PublicAuthGate from '../public-auth-gate';

export default function SaasLoginClient() {
  return (
    <NextProviders>
      <PublicAuthGate>
        <SaasLogin nativeLinks />
      </PublicAuthGate>
    </NextProviders>
  );
}
