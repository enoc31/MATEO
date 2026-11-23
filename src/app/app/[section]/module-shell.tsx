'use client';

import dynamic from 'next/dynamic';
import type { MigratedSection } from './sections';

const ModuleClient = dynamic(() => import('./module-client'), { ssr: false });

export default function ModuleShell({ section }: { section: MigratedSection }) {
  return <ModuleClient section={section} />;
}
