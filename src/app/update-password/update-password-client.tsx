'use client';

import { useRouter } from 'next/navigation';
import { UpdatePasswordForm } from '../../features/auth/UpdatePassword';
import NextProviders from '../next-providers';

export default function UpdatePasswordClient() {
  const router = useRouter();
  return (
    <NextProviders allowRecovery>
      <UpdatePasswordForm navigate={(path) => router.push(path)} nativeLinks />
    </NextProviders>
  );
}
