import { trace, propagation, type Tracer, type Meter, SpanStatusCode } from '@opentelemetry/api';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { SeverityNumber, type Logger } from '@opentelemetry/api-logs';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { W3CTraceContextPropagator, CompositePropagator } from '@opentelemetry/core';

export interface TelemetryConfig {
  enabled: boolean;
  serviceName: string;
  serviceVersion: string;
  environment: string;
  otlpEndpoint: string;
  headers: Record<string, string>;
  tracesEndpoint?: string;
  metricsEndpoint?: string;
  logsEndpoint?: string;
}

let isInitialized = false;
let globalTracer: Tracer | null = null;
let globalMeter: Meter | null = null;
let globalLogger: Logger | null = null;
let tracerProviderInstance: WebTracerProvider | null = null;
let meterProviderInstance: MeterProvider | null = null;
let loggerProviderInstance: LoggerProvider | null = null;

/**
 * Parses header strings in formats like:
 * "Authorization=Basic <token>,Other=value" or "Authorization: Basic <token>"
 */
export function parseOtelHeaders(raw?: string): Record<string, string> {
  if (!raw || typeof raw !== 'string') return {};
  const headers: Record<string, string> = {};

  // Support comma-separated key=value pairs or individual headers
  const pairs = raw.split(/,(?=[A-Za-z0-9_-]+=)/g);
  for (const pair of pairs) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    const eqIdx = trimmed.indexOf('=');
    const colonIdx = trimmed.indexOf(':');

    if (eqIdx !== -1 && (colonIdx === -1 || eqIdx < colonIdx)) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (key) headers[key] = val;
    } else if (colonIdx !== -1) {
      const key = trimmed.slice(0, colonIdx).trim();
      const val = trimmed.slice(colonIdx + 1).trim();
      if (key) headers[key] = val;
    }
  }

  return headers;
}

/**
 * Resolves standard OTLP signal endpoints from base URL or overrides
 */
export function resolveSignalEndpoints(baseEndpoint: string, config: Partial<TelemetryConfig>) {
  const normalizedBase = baseEndpoint ? baseEndpoint.replace(/\/+$/, '') : '';

  return {
    traces:
      config.tracesEndpoint ||
      (normalizedBase
        ? normalizedBase.endsWith('/v1/traces')
          ? normalizedBase
          : `${normalizedBase}/v1/traces`
        : ''),
    metrics:
      config.metricsEndpoint ||
      (normalizedBase
        ? normalizedBase.endsWith('/v1/metrics')
          ? normalizedBase
          : `${normalizedBase}/v1/metrics`
        : ''),
    logs:
      config.logsEndpoint ||
      (normalizedBase
        ? normalizedBase.endsWith('/v1/logs')
          ? normalizedBase
          : `${normalizedBase}/v1/logs`
        : ''),
  };
}

/**
 * Reads telemetry configuration from Vite environment variables
 */
export function getTelemetryConfigFromEnv(): TelemetryConfig {
  const env: Record<string, string | undefined> =
    typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env as unknown as Record<string, string | undefined>)
      : {};

  const grafanaToken = env.VITE_GRAFANA_TOKEN || '';
  const instanceId = env.VITE_GRAFANA_INSTANCE_ID || '';
  let autoEndpoint = '';
  if (grafanaToken.startsWith('glc_')) {
    try {
      const rawPayload = grafanaToken.replace(/^glc_/, '');
      const decoded = JSON.parse(
        typeof atob !== 'undefined'
          ? atob(rawPayload)
          : Buffer.from(rawPayload, 'base64').toString('utf8'),
      );
      if (decoded?.m?.r) {
        autoEndpoint = `https://otlp-gateway-${decoded.m.r}.grafana.net/otlp`;
      }
    } catch {
      // Ignore
    }
  }

  const baseEndpoint = env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT || autoEndpoint || '';
  let rawHeaders = env.VITE_OTEL_EXPORTER_OTLP_HEADERS || '';
  if (!rawHeaders && instanceId && grafanaToken) {
    const credentials = `${instanceId}:${grafanaToken}`;
    const encoded =
      typeof btoa !== 'undefined' ? btoa(credentials) : Buffer.from(credentials).toString('base64');
    rawHeaders = `Authorization=Basic ${encoded}`;
  }

  const enabled =
    env.VITE_OTEL_ENABLED !== 'false' &&
    Boolean(baseEndpoint || env.VITE_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT);

  const headers = parseOtelHeaders(rawHeaders);

  return {
    enabled,
    serviceName: env.VITE_OTEL_SERVICE_NAME || 'mateo-humanitaria',
    serviceVersion: env.VITE_APP_VERSION || '1.0.0',
    environment: env.MODE || 'development',
    otlpEndpoint: baseEndpoint,
    headers,
    tracesEndpoint: env.VITE_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
    metricsEndpoint: env.VITE_OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
    logsEndpoint: env.VITE_OTEL_EXPORTER_OTLP_LOGS_ENDPOINT,
  };
}

/**
 * Initializes OpenTelemetry browser tracing, metrics, and logs for Grafana Cloud
 */
export function initTelemetry(customConfig?: Partial<TelemetryConfig>): boolean {
  if (isInitialized) {
    return true;
  }

  const baseConfig = getTelemetryConfigFromEnv();
  const config: TelemetryConfig = {
    ...baseConfig,
    ...customConfig,
    headers: { ...baseConfig.headers, ...(customConfig?.headers || {}) },
  };

  if (!config.enabled || !config.otlpEndpoint) {
    // Graceful no-op when telemetry is not configured or disabled
    return false;
  }

  try {
    const endpoints = resolveSignalEndpoints(config.otlpEndpoint, config);

    // 1. Shared Resource definition
    const resource = new Resource({
      [ATTR_SERVICE_NAME]: config.serviceName,
      [ATTR_SERVICE_VERSION]: config.serviceVersion,
      'deployment.environment': config.environment,
      'telemetry.sdk.language': 'webjs',
      'telemetry.sdk.name': 'opentelemetry',
    });

    // 2. Tracing Setup (Traces -> Grafana Cloud Tempo)
    if (endpoints.traces) {
      const traceExporter = new OTLPTraceExporter({
        url: endpoints.traces,
        headers: config.headers,
      });

      tracerProviderInstance = new WebTracerProvider({
        resource,
      });

      tracerProviderInstance.addSpanProcessor(
        new BatchSpanProcessor(traceExporter, {
          maxQueueSize: 2048,
          maxExportBatchSize: 512,
          scheduledDelayMillis: 2000,
        }),
      );

      // Register global propagators and tracer
      propagation.setGlobalPropagator(
        new CompositePropagator({
          propagators: [new W3CTraceContextPropagator()],
        }),
      );
      tracerProviderInstance.register();
      trace.setGlobalTracerProvider(tracerProviderInstance);

      // Register Browser Auto-instrumentations (Fetch & Document Load)
      registerInstrumentations({
        tracerProvider: tracerProviderInstance,
        instrumentations: [
          new FetchInstrumentation({
            propagateTraceHeaderCorsUrls: [/.*/],
            clearTimingResources: true,
          }),
          new DocumentLoadInstrumentation(),
        ],
      });
    }

    // 3. Metrics Setup (Metrics -> Grafana Cloud Mimir / Prometheus)
    if (endpoints.metrics) {
      const metricExporter = new OTLPMetricExporter({
        url: endpoints.metrics,
        headers: config.headers,
      });

      meterProviderInstance = new MeterProvider({
        resource,
        readers: [
          new PeriodicExportingMetricReader({
            exporter: metricExporter,
            exportIntervalMillis: 15000,
          }),
        ],
      });
    }

    // 4. Logs Setup (Logs -> Grafana Cloud Loki)
    if (endpoints.logs) {
      const logExporter = new OTLPLogExporter({
        url: endpoints.logs,
        headers: config.headers,
      });

      loggerProviderInstance = new LoggerProvider({
        resource,
      });

      loggerProviderInstance.addLogRecordProcessor(
        new BatchLogRecordProcessor(logExporter, {
          scheduledDelayMillis: 2000,
          maxExportBatchSize: 256,
        }),
      );
    }

    globalTracer = trace.getTracer(config.serviceName, config.serviceVersion);
    if (meterProviderInstance) {
      globalMeter = meterProviderInstance.getMeter(config.serviceName, config.serviceVersion);
    }
    if (loggerProviderInstance) {
      globalLogger = loggerProviderInstance.getLogger(config.serviceName, config.serviceVersion);
    }

    isInitialized = true;
    return true;
  } catch (error) {
    // Never crash the frontend application if telemetry fails to initialize
    console.warn('[OpenTelemetry] Failed to initialize telemetry:', error);
    return false;
  }
}

/**
 * Retrieves the global application tracer
 */
export function getTracer(name = 'mateo-app'): Tracer {
  if (globalTracer) return globalTracer;
  return trace.getTracer(name);
}

/**
 * Retrieves the global meter provider
 */
export function getMeter(name = 'mateo-app'): Meter | null {
  if (globalMeter) return globalMeter;
  if (meterProviderInstance) {
    return meterProviderInstance.getMeter(name);
  }
  return null;
}

/**
 * Records a numeric metric (counter or gauge measurement)
 */
export function recordMetric(
  metricName: string,
  value: number,
  attributes?: Record<string, string | number | boolean>,
): void {
  try {
    const meter = getMeter();
    if (!meter) return;

    const counter = meter.createCounter(metricName, {
      description: `Metric tracking ${metricName}`,
    });
    counter.add(value, attributes);
  } catch {
    // Ignore metric recording errors to protect runtime flow
  }
}

/**
 * Emits a structured log record to OpenTelemetry (Grafana Cloud Loki)
 */
export function emitLog(
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR',
  message: string,
  attributes?: Record<string, string | number | boolean>,
): void {
  try {
    if (!globalLogger && loggerProviderInstance) {
      globalLogger = loggerProviderInstance.getLogger('mateo-logger');
    }
    if (!globalLogger) return;

    let severityNumber = SeverityNumber.INFO;
    if (level === 'DEBUG') severityNumber = SeverityNumber.DEBUG;
    if (level === 'WARN') severityNumber = SeverityNumber.WARN;
    if (level === 'ERROR') severityNumber = SeverityNumber.ERROR;

    globalLogger.emit({
      severityNumber,
      severityText: level,
      body: message,
      attributes: {
        timestamp_iso: new Date().toISOString(),
        ...(attributes || {}),
      },
    });
  } catch {
    // Ignore logging errors to ensure telemetry never causes app disruption
  }
}

/**
 * Wraps an async or sync operation in an OpenTelemetry active span
 */
export async function traceOperation<T>(
  name: string,
  operation: () => Promise<T> | T,
  attributes?: Record<string, string | number | boolean>,
): Promise<T> {
  const tracer = getTracer();
  return tracer.startActiveSpan(name, async (span) => {
    if (attributes) {
      for (const [k, v] of Object.entries(attributes)) {
        span.setAttribute(k, v);
      }
    }
    try {
      const result = await operation();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: errorMessage,
      });
      if (err instanceof Error) {
        span.recordException(err);
      }
      throw err;
    } finally {
      span.end();
    }
  });
}

/**
 * Teardown helper for tests or clean unmounting
 */
export async function shutdownTelemetry(): Promise<void> {
  if (tracerProviderInstance) {
    await tracerProviderInstance.shutdown().catch(() => {});
    tracerProviderInstance = null;
  }
  if (meterProviderInstance) {
    await meterProviderInstance.shutdown().catch(() => {});
    meterProviderInstance = null;
  }
  if (loggerProviderInstance) {
    await loggerProviderInstance.shutdown().catch(() => {});
    loggerProviderInstance = null;
  }
  isInitialized = false;
  globalTracer = null;
  globalMeter = null;
  globalLogger = null;
}
