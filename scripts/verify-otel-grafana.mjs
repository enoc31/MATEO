#!/usr/bin/env node

/**
 * Diagnostic & Verification Script for OpenTelemetry & Grafana Cloud.
 * Tests sending traces, metrics, and logs to Grafana Cloud OTLP HTTP gateway.
 *
 * Usage:
 *   node scripts/verify-otel-grafana.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

// Load .env if present
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed
        .slice(eqIdx + 1)
        .trim()
        .replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const endpoint =
  process.env.GRAFANA_CLOUD_OTLP_ENDPOINT ||
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
  process.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT ||
  'http://localhost:4318';

let authHeader =
  process.env.OTEL_EXPORTER_OTLP_HEADERS || process.env.VITE_OTEL_EXPORTER_OTLP_HEADERS || '';

if (!authHeader && process.env.GRAFANA_CLOUD_INSTANCE_ID && process.env.GRAFANA_CLOUD_API_KEY) {
  const token = Buffer.from(
    `${process.env.GRAFANA_CLOUD_INSTANCE_ID}:${process.env.GRAFANA_CLOUD_API_KEY}`,
  ).toString('base64');
  authHeader = `Authorization=Basic ${token}`;
}

function parseHeaders(raw) {
  if (!raw) return {};
  const headers = {};
  const pairs = raw.split(/,(?=[A-Za-z0-9_-]+=)/g);
  for (const pair of pairs) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx !== -1) {
      headers[pair.slice(0, eqIdx).trim()] = pair.slice(eqIdx + 1).trim();
    }
  }
  return headers;
}

const headers = {
  'Content-Type': 'application/json',
  ...parseHeaders(authHeader),
};

const baseUrl = endpoint.replace(/\/+$/, '');
const tracesUrl = `${baseUrl}/v1/traces`;
const metricsUrl = `${baseUrl}/v1/metrics`;
const logsUrl = `${baseUrl}/v1/logs`;

console.log('='.repeat(65));
console.log(' OpenTelemetry -> Grafana Cloud Connectivity Diagnostic');
console.log('='.repeat(65));
console.log(`Target Endpoint: ${baseUrl}`);
console.log(
  `Authorization:   ${headers['Authorization'] ? 'Configured (Basic ***)' : 'None (Local / Collector mode)'}`,
);
console.log('='.repeat(65));

const nowNano = String(Date.now() * 1000000);
const traceId = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join(
  '',
);
const spanId = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join(
  '',
);

async function testTraces() {
  const payload = {
    resourceSpans: [
      {
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: 'mateo-otel-verify' } },
            { key: 'deployment.environment', value: { stringValue: 'verification' } },
          ],
        },
        scopeSpans: [
          {
            scope: { name: 'diagnostic-test' },
            spans: [
              {
                traceId,
                spanId,
                name: 'test.trace.grafana_cloud',
                kind: 1,
                startTimeUnixNano: nowNano,
                endTimeUnixNano: String(Date.now() * 1000000),
                attributes: [{ key: 'verification.status', value: { stringValue: 'success' } }],
                status: { code: 1 },
              },
            ],
          },
        ],
      },
    ],
  };

  try {
    const res = await fetch(tracesUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    return { ok: res.ok, status: res.status, text: await res.text() };
  } catch (err) {
    return { ok: false, status: 0, text: err.message };
  }
}

async function testMetrics() {
  const payload = {
    resourceMetrics: [
      {
        resource: {
          attributes: [{ key: 'service.name', value: { stringValue: 'mateo-otel-verify' } }],
        },
        scopeMetrics: [
          {
            scope: { name: 'diagnostic-test' },
            metrics: [
              {
                name: 'mateo.verification.counter',
                description: 'Verifies OpenTelemetry metrics ingestion to Grafana Cloud',
                unit: '1',
                sum: {
                  aggregationTemporality: 2,
                  isMonotonic: true,
                  dataPoints: [
                    {
                      asInt: '1',
                      startTimeUnixNano: nowNano,
                      timeUnixNano: nowNano,
                      attributes: [{ key: 'test_run', value: { stringValue: 'true' } }],
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    ],
  };

  try {
    const res = await fetch(metricsUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    return { ok: res.ok, status: res.status, text: await res.text() };
  } catch (err) {
    return { ok: false, status: 0, text: err.message };
  }
}

async function testLogs() {
  const payload = {
    resourceLogs: [
      {
        resource: {
          attributes: [{ key: 'service.name', value: { stringValue: 'mateo-otel-verify' } }],
        },
        scopeLogs: [
          {
            scope: { name: 'diagnostic-test' },
            logRecords: [
              {
                timeUnixNano: nowNano,
                observedTimeUnixNano: nowNano,
                severityText: 'INFO',
                body: { stringValue: 'Verification test log sent to Grafana Cloud Loki' },
                attributes: [{ key: 'test.component', value: { stringValue: 'otel-verify' } }],
              },
            ],
          },
        ],
      },
    ],
  };

  try {
    const res = await fetch(logsUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    return { ok: res.ok, status: res.status, text: await res.text() };
  } catch (err) {
    return { ok: false, status: 0, text: err.message };
  }
}

async function run() {
  console.log('\n[1/3] Testing Traces -> ' + tracesUrl);
  const traceRes = await testTraces();
  console.log(`      Status: ${traceRes.status} | OK: ${traceRes.ok} ${traceRes.ok ? '✓' : '✗'}`);
  if (!traceRes.ok) console.log(`      Response: ${traceRes.text}`);

  console.log('\n[2/3] Testing Metrics -> ' + metricsUrl);
  const metricRes = await testMetrics();
  console.log(
    `      Status: ${metricRes.status} | OK: ${metricRes.ok} ${metricRes.ok ? '✓' : '✗'}`,
  );
  if (!metricRes.ok) console.log(`      Response: ${metricRes.text}`);

  console.log('\n[3/3] Testing Logs -> ' + logsUrl);
  const logRes = await testLogs();
  console.log(`      Status: ${logRes.status} | OK: ${logRes.ok} ${logRes.ok ? '✓' : '✗'}`);
  if (!logRes.ok) console.log(`      Response: ${logRes.text}`);

  console.log('\n' + '='.repeat(65));
  if (traceRes.ok && metricRes.ok && logRes.ok) {
    console.log(' All OpenTelemetry signals (Traces, Metrics, Logs) successfully sent! 🎉');
  } else {
    console.log(' Verification completed with notices. Ensure endpoint & credentials are set.');
  }
  console.log('='.repeat(65));
}

run();
