import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { initTelemetry } from './services/telemetry.ts';
import { TelemetryErrorBoundary } from './components/TelemetryErrorBoundary.tsx';

// Initialize OpenTelemetry browser tracing, metrics, and logs
initTelemetry();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TelemetryErrorBoundary name="root">
      <App />
    </TelemetryErrorBoundary>
  </StrictMode>,
);
