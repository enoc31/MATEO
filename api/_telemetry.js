/**
 * Serverless OpenTelemetry helper for Vercel functions (api/*).
 * Exports traces, metrics, and logs via OTLP HTTP to Grafana Cloud or an OpenTelemetry Collector.
 */

const OTLP_ENDPOINT =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT || process.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT || '';

const OTLP_HEADERS_RAW =
  process.env.OTEL_EXPORTER_OTLP_HEADERS || process.env.VITE_OTEL_EXPORTER_OTLP_HEADERS || '';

const SERVICE_NAME =
  process.env.OTEL_SERVICE_NAME || process.env.VITE_OTEL_SERVICE_NAME || 'mateo-api';

function parseHeaders(raw) {
  if (!raw) return {};
  const headers = {};
  const pairs = raw.split(/,(?=[A-Za-z0-9_-]+=)/g);
  for (const pair of pairs) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const k = trimmed.slice(0, eqIdx).trim();
      const v = trimmed.slice(eqIdx + 1).trim();
      if (k) headers[k] = v;
    }
  }
  return headers;
}

const parsedHeaders = parseHeaders(OTLP_HEADERS_RAW);

function getSignalUrl(signal) {
  if (!OTLP_ENDPOINT) return '';
  const base = OTLP_ENDPOINT.replace(/\/+$/, '');
  return `${base}/v1/${signal}`;
}

/**
 * Sends a structured log record to Grafana Cloud Loki via OTLP /v1/logs
 */
export async function sendServerlessLog(level, message, attributes = {}) {
  const url = getSignalUrl('logs');
  if (!url) return;

  const nowNano = String(Date.now() * 1000000);
  const payload = {
    resourceLogs: [
      {
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: SERVICE_NAME } },
            {
              key: 'deployment.environment',
              value: { stringValue: process.env.NODE_ENV || 'production' },
            },
          ],
        },
        scopeLogs: [
          {
            scope: { name: 'mateo-serverless' },
            logRecords: [
              {
                timeUnixNano: nowNano,
                observedTimeUnixNano: nowNano,
                severityText: level,
                body: { stringValue: message },
                attributes: Object.entries(attributes).map(([k, v]) => ({
                  key: k,
                  value: { stringValue: String(v) },
                })),
              },
            ],
          },
        ],
      },
    ],
  };

  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...parsedHeaders,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // Non-blocking fallback
    console.error('[OTel Serverless Log Error]', err);
  }
}

/**
 * Traces a serverless function invocation and exports span to Grafana Cloud Tempo
 */
export async function traceServerless(name, req, fn) {
  const startTime = Date.now();
  const startNano = String(startTime * 1000000);
  const traceId = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join('');
  const spanId = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join(
    '',
  );

  let error = null;
  let result;
  try {
    result = await fn({ traceId, spanId });
    return result;
  } catch (err) {
    error = err;
    throw err;
  } finally {
    const endNano = String(Date.now() * 1000000);
    const url = getSignalUrl('traces');

    if (url) {
      const tracePayload = {
        resourceSpans: [
          {
            resource: {
              attributes: [
                { key: 'service.name', value: { stringValue: SERVICE_NAME } },
                {
                  key: 'deployment.environment',
                  value: { stringValue: process.env.NODE_ENV || 'production' },
                },
              ],
            },
            scopeSpans: [
              {
                scope: { name: 'mateo-serverless-api' },
                spans: [
                  {
                    traceId,
                    spanId,
                    name,
                    kind: 2, // SPAN_KIND_SERVER
                    startTimeUnixNano: startNano,
                    endTimeUnixNano: endNano,
                    attributes: [
                      {
                        key: 'http.method',
                        value: { stringValue: req?.method || 'GET' },
                      },
                      {
                        key: 'http.url',
                        value: { stringValue: req?.url || '' },
                      },
                      {
                        key: 'http.status_code',
                        value: { intValue: error ? 500 : 200 },
                      },
                    ],
                    status: {
                      code: error ? 2 : 1, // 1 = OK, 2 = ERROR
                      message: error ? error.message : '',
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...parsedHeaders,
        },
        body: JSON.stringify(tracePayload),
      }).catch(() => {});
    }
  }
}
