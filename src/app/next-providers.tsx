'use client';

import { useEffect, type ReactNode } from 'react';
import { AuthProvider } from '../context/AuthContext';
import { NotificationProvider } from '../components/NotificationProvider';
import { TelemetryErrorBoundary } from '../components/TelemetryErrorBoundary';
import { initTelemetry } from '../services/telemetry';

export default function NextProviders({
  children,
  allowRecovery = false,
}: {
  children: ReactNode;
  allowRecovery?: boolean;
}) {
  useEffect(() => {
    initTelemetry();
    const { hash, search } = window.location;
    if (!allowRecovery && (hash.includes('type=recovery') || search.includes('type=recovery'))) {
      window.location.replace(`/update-password${hash}${search}`);
    }
  }, [allowRecovery]);

  return (
    <TelemetryErrorBoundary name="root">
      <AuthProvider>
        <NotificationProvider>{children}</NotificationProvider>
      </AuthProvider>
    </TelemetryErrorBoundary>
  );
}
