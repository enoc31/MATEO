'use client';

import { ForgotPassword } from '../../features/auth/ForgotPassword';
import NextProviders from '../next-providers';
import PublicAuthGate from '../public-auth-gate';

export default function ForgotPasswordClient() {
  return (
    <NextProviders>
      <PublicAuthGate>
        <ForgotPassword nativeLinks />
      </PublicAuthGate>
    </NextProviders>
  );
}
