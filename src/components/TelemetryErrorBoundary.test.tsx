import type { FC } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TelemetryErrorBoundary } from './TelemetryErrorBoundary';
import * as telemetry from '../services/telemetry';

const ThrowingComponent: FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test component crashed');
  }
  return <div>Component rendered safely</div>;
};

describe('TelemetryErrorBoundary', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when no error occurs', () => {
    render(
      <TelemetryErrorBoundary name="test-boundary">
        <div>Safe Content</div>
      </TelemetryErrorBoundary>,
    );

    expect(screen.getByText('Safe Content')).toBeInTheDocument();
  });

  it('catches render error, logs telemetry and displays accessible fallback UI', () => {
    const recordExceptionSpy = vi.spyOn(telemetry, 'recordException').mockImplementation(() => {});
    const recordMetricSpy = vi.spyOn(telemetry, 'recordMetric').mockImplementation(() => {});
    const emitLogSpy = vi.spyOn(telemetry, 'emitLog').mockImplementation(() => {});
    const onCatchSpy = vi.fn();

    // Prevent React from logging error to console in test output
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <TelemetryErrorBoundary name="test-feature" onCatch={onCatchSpy}>
        <ThrowingComponent />
      </TelemetryErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Ha ocurrido un error inesperado')).toBeInTheDocument();
    expect(screen.getByText('Reintentar')).toBeInTheDocument();
    expect(screen.getByText('Ir al inicio')).toBeInTheDocument();

    expect(recordExceptionSpy).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ component: 'test-feature' }),
    );
    expect(recordMetricSpy).toHaveBeenCalledWith(
      'mateo_error_boundary_catches_total',
      1,
      expect.objectContaining({ component: 'test-feature' }),
    );
    expect(emitLogSpy).toHaveBeenCalledWith(
      'ERROR',
      expect.stringContaining('[ErrorBoundary] Render crash in test-feature'),
      expect.any(Object),
    );
    expect(onCatchSpy).toHaveBeenCalledTimes(1);

    consoleErrorSpy.mockRestore();
  });

  it('supports custom function fallback', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <TelemetryErrorBoundary
        name="custom-fallback"
        fallback={(error, reset) => (
          <div>
            <span>Custom Fallback: {error.message}</span>
            <button onClick={reset}>Reset Me</button>
          </div>
        )}
      >
        <ThrowingComponent />
      </TelemetryErrorBoundary>,
    );

    expect(screen.getByText('Custom Fallback: Test component crashed')).toBeInTheDocument();
    expect(screen.getByText('Reset Me')).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it('resets state when retry button is clicked', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    let throwError = true;
    const DynamicComponent: React.FC = () => {
      if (throwError) {
        throw new Error('First render error');
      }
      return <div>Recovered Component</div>;
    };

    render(
      <TelemetryErrorBoundary name="retry-test">
        <DynamicComponent />
      </TelemetryErrorBoundary>,
    );

    expect(screen.getByText('Ha ocurrido un error inesperado')).toBeInTheDocument();

    // Fix error before retry
    throwError = false;
    fireEvent.click(screen.getByText('Reintentar'));

    expect(screen.getByText('Recovered Component')).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });
});
