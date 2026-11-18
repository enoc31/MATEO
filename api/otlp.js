/**
 * Vercel Serverless Reverse Proxy for OpenTelemetry -> Grafana Cloud.
 * Forwards frontend browser traces, metrics, and logs securely to Grafana Cloud OTLP Gateway
 * without exposing Grafana Cloud API tokens in the public client bundle.
 */

const OTLP_BASE =
  process.env.GRAFANA_CLOUD_OTLP_ENDPOINT || 'https://otlp-gateway-prod-us-east-6.grafana.net/otlp';

const INSTANCE_ID =
  process.env.GRAFANA_CLOUD_INSTANCE_ID || process.env.GRAFANA_INSTANCE_ID || '1923445';

const API_TOKEN =
  process.env.GRAFANA_CLOUD_API_TOKEN ||
  process.env.GRAFANA_CLOUD_API_KEY ||
  process.env.GRAFANA_TOKEN ||
  '';

function resolveAuthHeader() {
  const rawHeader = process.env.OTEL_EXPORTER_OTLP_HEADERS || '';
  if (rawHeader) {
    let cleaned = rawHeader.trim().replace(/^Authorization\s*[:=]\s*/i, '');
    if (!cleaned.toLowerCase().startsWith('basic ')) {
      cleaned = `Basic ${cleaned}`;
    }
    return cleaned;
  }

  if (!API_TOKEN) return '';

  let token = API_TOKEN.trim().replace(/^['"]|['"]$/g, '');

  if (/^Authorization\s*[:=]\s*/i.test(token)) {
    token = token.replace(/^Authorization\s*[:=]\s*/i, '').trim();
  }
  if (/^Basic\s+/i.test(token)) {
    return token;
  }

  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    if (decoded.includes(':') && (decoded.includes('glc_') || /^\d+:/.test(decoded))) {
      return `Basic ${token}`;
    }
  } catch {
    // Ignore decode error
  }

  const id = (INSTANCE_ID || '').trim().replace(/^['"]|['"]$/g, '');
  if (id) {
    return `Basic ${Buffer.from(`${id}:${token}`).toString('base64')}`;
  }

  return `Bearer ${token}`;
}

export default async function handler(req, res) {
  // CORS support for web clients
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Traceparent, Baggage');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const signalPath =
    req.query.signal ||
    req.query.path ||
    (req.url ? req.url.replace(/^\/api\/otlp\/?/, '').split('?')[0] : 'v1/traces');

  const cleanSignalPath = signalPath.replace(/^\/+/, '');
  const targetUrl = `${OTLP_BASE.replace(/\/+$/, '')}/${cleanSignalPath}`;

  const authHeader = resolveAuthHeader();

  try {
    const requestBody = Buffer.isBuffer(req.body)
      ? req.body
      : typeof req.body === 'string'
        ? req.body
        : JSON.stringify(req.body);

    const upstreamResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: requestBody,
    });

    const responseText = await upstreamResponse.text();
    res.status(upstreamResponse.status);
    res.setHeader(
      'Content-Type',
      upstreamResponse.headers.get('content-type') || 'application/json',
    );
    return res.send(responseText);
  } catch (err) {
    console.error('[OTLP Proxy Error]', err);
    return res.status(502).json({
      error: 'Failed to forward telemetry to Grafana Cloud',
      details: err.message,
    });
  }
}
