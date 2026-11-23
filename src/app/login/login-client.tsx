'use client';

import { Login } from '../../features/auth/Login';
import NextProviders from '../next-providers';
import PublicAuthGate from '../public-auth-gate';

export default function LoginClient() {
  return (
    <NextProviders>
      <PublicAuthGate>
        <Login nativeLinks />
      </PublicAuthGate>
    </NextProviders>
  );
}
