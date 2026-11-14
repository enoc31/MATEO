import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  parseOtelHeaders,
  resolveSignalEndpoints,
  initTelemetry,
  getTracer,
  getMeter,
  recordMetric,
  emitLog,
  traceOperation,
  recordException,
  getCurrentTraceId,
  registerGlobalErrorHandlers,
  unregisterGlobalErrorHandlers,
  shutdownTelemetry,
} from './telemetry';

describe('telemetry service', () => {
  beforeEach(async () => {
    await shutdownTelemetry();
  });

  afterEach(async () => {
    await shutdownTelemetry();
  });

  describe('parseOtelHeaders', () => {
    it('returns empty object for empty or missing input', () => {
      expect(parseOtelHeaders('')).toEqual({});
      expect(parseOtelHeaders(undefined)).toEqual({});
    });

    it('parses Authorization header with key=value format', () => {
      const headerStr = 'Authorization=Basic dXNlcm5hbWU6cGFzc3dvcmQ=';
      const parsed = parseOtelHeaders(headerStr);
      expect(parsed).toEqual({
        Authorization: 'Basic dXNlcm5hbWU6cGFzc3dvcmQ=',
      });
    });

    it('parses multiple comma-separated headers', () => {
      const headerStr = 'Authorization=Basic dXNlcjpwYXNz,X-Custom-Header=CustomVal,env=production';
      const parsed = parseOtelHeaders(headerStr);
      expect(parsed).toEqual({
        Authorization: 'Basic dXNlcjpwYXNz',
        'X-Custom-Header': 'CustomVal',
        env: 'production',
      });
    });

    it('parses colon-separated headers format', () => {
      const headerStr = 'Authorization: Basic 12345';
      const parsed = parseOtelHeaders(headerStr);
      expect(parsed).toEqual({
        Authorization: 'Basic 12345',
      });
    });
  });

  describe('resolveSignalEndpoints', () => {
    it('constructs /v1/traces, /v1/metrics, /v1/logs from base OTLP gateway URL', () => {
      const base = 'https://otlp-gateway-prod-us-east-0.grafana.net/otlp';
      const endpoints = resolveSignalEndpoints(base, {});

      expect(endpoints.traces).toBe(
        'https://otlp-gateway-prod-us-east-0.grafana.net/otlp/v1/traces',
      );
      expect(endpoints.metrics).toBe(
        'https://otlp-gateway-prod-us-east-0.grafana.net/otlp/v1/metrics',
      );
      expect(endpoints.logs).toBe('https://otlp-gateway-prod-us-east-0.grafana.net/otlp/v1/logs');
    });

    it('respects individual signal endpoint overrides', () => {
      const base = 'http://localhost:4318';
      const endpoints = resolveSignalEndpoints(base, {
        tracesEndpoint: 'https://tempo.custom.domain/v1/traces',
      });

      expect(endpoints.traces).toBe('https://tempo.custom.domain/v1/traces');
      expect(endpoints.metrics).toBe('http://localhost:4318/v1/metrics');
      expect(endpoints.logs).toBe('http://localhost:4318/v1/logs');
    });

    it('handles trailing slashes gracefully', () => {
      const base = 'http://localhost:4318/';
      const endpoints = resolveSignalEndpoints(base, {});
      expect(endpoints.traces).toBe('http://localhost:4318/v1/traces');
    });
  });

  describe('initTelemetry lifecycle', () => {
    it('returns false when telemetry is not enabled or endpoint is empty', () => {
      const initialized = initTelemetry({
        enabled: false,
        otlpEndpoint: '',
      });
      expect(initialized).toBe(false);
    });

    it('initializes successfully with valid configuration', () => {
      const initialized = initTelemetry({
        enabled: true,
        otlpEndpoint: 'http://localhost:4318',
        serviceName: 'mateo-test-service',
        environment: 'test',
        headers: { Authorization: 'Basic test-token' },
      });

      expect(initialized).toBe(true);
      expect(getTracer()).toBeDefined();
      expect(getMeter()).toBeDefined();
    });

    it('does not re-initialize if already initialized', () => {
      const first = initTelemetry({
        enabled: true,
        otlpEndpoint: 'http://localhost:4318',
      });
      const second = initTelemetry({
        enabled: true,
        otlpEndpoint: 'http://localhost:4318',
      });
      expect(first).toBe(true);
      expect(second).toBe(true);
    });
  });

  describe('telemetry helpers', () => {
    it('records metric without throwing errors', () => {
      initTelemetry({
        enabled: true,
        otlpEndpoint: 'http://localhost:4318',
      });

      expect(() => {
        recordMetric('donations.created', 1, { payment_type: 'transfer' });
      }).not.toThrow();
    });

    it('emits log records without throwing errors', () => {
      initTelemetry({
        enabled: true,
        otlpEndpoint: 'http://localhost:4318',
      });

      expect(() => {
        emitLog('INFO', 'User logged in', { userId: '123' });
        emitLog('WARN', 'Rate limit warning');
        emitLog('ERROR', 'DB query failed', { query: 'donations' });
      }).not.toThrow();
    });

    it('traces async operations successfully and returns result', async () => {
      initTelemetry({
        enabled: true,
        otlpEndpoint: 'http://localhost:4318',
      });

      const result = await traceOperation(
        'test.operation',
        async () => {
          return 42;
        },
        { 'test.attribute': 'value' },
      );

      expect(result).toBe(42);
    });

    it('captures error in traceOperation and rethrows', async () => {
      initTelemetry({
        enabled: true,
        otlpEndpoint: 'http://localhost:4318',
      });

      await expect(
        traceOperation('test.error.operation', async () => {
          throw new Error('Simulation failed');
        }),
      ).rejects.toThrow('Simulation failed');
    });

    it('records exceptions safely via recordException helper', () => {
      initTelemetry({
        enabled: true,
        otlpEndpoint: 'http://localhost:4318',
      });

      expect(() => {
        recordException(new TypeError('Cannot read properties of null'), {
          module: 'reconciliation',
          operation: 'parse_csv',
        });
      }).not.toThrow();
    });

    it('retrieves current trace id or undefined when no active span', () => {
      const traceId = getCurrentTraceId();
      expect(traceId === undefined || typeof traceId === 'string').toBe(true);
    });

    it('registers and unregisters browser global error handlers without error', () => {
      expect(() => {
        registerGlobalErrorHandlers();
        // Dispatches synthetic error event
        window.dispatchEvent(
          new ErrorEvent('error', {
            message: 'Synthetic test error',
            filename: 'test.ts',
            lineno: 10,
          }),
        );
        unregisterGlobalErrorHandlers();
      }).not.toThrow();
    });
  });
});
