import { afterEach, describe, expect, it, vi } from 'vitest';

function response() {
  const res = {
    setHeader: vi.fn(),
    status: vi.fn(),
    json: vi.fn(),
    send: vi.fn(),
    end: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
}

describe('OTLP proxy contract', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('handles preflight and rejects non-POST requests without forwarding', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { default: handler } = await import('./otlp.js');
    const preflight = response();
    await handler({ method: 'OPTIONS' }, preflight);
    expect(preflight.status).toHaveBeenCalledWith(200);
    expect(preflight.end).toHaveBeenCalled();
    const rejected = response();
    await handler({ method: 'GET' }, rejected);
    expect(rejected.status).toHaveBeenCalledWith(405);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('forwards the signal, payload, content type and server credentials', async () => {
    vi.stubEnv('GRAFANA_CLOUD_OTLP_ENDPOINT', 'https://collector.example/otlp');
    vi.stubEnv('OTEL_EXPORTER_OTLP_HEADERS', 'Authorization=Basic test-credential');
    const fetchMock = vi.fn().mockResolvedValue({
      status: 202,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => '{"accepted":true}',
    });
    vi.stubGlobal('fetch', fetchMock);
    const { default: handler } = await import('./otlp.js');
    const res = response();
    await handler(
      {
        method: 'POST',
        query: { signal: 'v1/metrics' },
        headers: { 'content-type': 'application/json' },
        body: { data: 1 },
      },
      res,
    );
    expect(fetchMock).toHaveBeenCalledWith('https://collector.example/otlp/v1/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Basic test-credential' },
      body: '{"data":1}',
    });
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.send).toHaveBeenCalledWith('{"accepted":true}');
  });

  it('returns a gateway error when forwarding fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('collector unavailable')));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { default: handler } = await import('./otlp.js');
    const res = response();
    await handler({ method: 'POST', query: { signal: 'v1/traces' }, headers: {}, body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Failed to forward telemetry to Grafana Cloud',
      details: 'collector unavailable',
    });
  });
});
