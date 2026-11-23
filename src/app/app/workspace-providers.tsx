'use client';
import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
const Providers = dynamic(() => import('../next-providers'), { ssr: false });
export default function WorkspaceProviders({ children }: { children: ReactNode }) {
  return <Providers>{children}</Providers>;
}
