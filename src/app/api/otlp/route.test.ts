import { afterEach, describe, expect, it, vi } from 'vitest';

describe('Next.js OTLP route', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('preserves the signal path and binary payload', async () => {
    vi.stubEnv('GRAFANA_CLOUD_OTLP_ENDPOINT', 'https://collector.example/otlp');
    vi.stubEnv('OTEL_EXPORTER_OTLP_HEADERS', 'Authorization=Basic test-credential');
    const forward = vi.fn().mockResolvedValue({
      status: 202,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => '{"accepted":true}',
    });
    vi.stubGlobal('fetch', forward);
    const { POST } = await import('./[[...signal]]/route');
    const result = await POST(
      new Request('http://localhost/api/otlp/v1/traces', {
        method: 'POST',
        headers: { 'content-type': 'application/x-protobuf' },
        body: new Uint8Array([0, 1, 255]),
      }),
    );
    expect(forward).toHaveBeenCalledWith('https://collector.example/otlp/v1/traces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-protobuf', Authorization: 'Basic test-credential' },
      body: Buffer.from([0, 1, 255]),
    });
    expect(result.status).toBe(202);
    expect(await result.text()).toBe('{"accepted":true}');
  });

  it('handles preflight without forwarding', async () => {
    const forward = vi.fn();
    vi.stubGlobal('fetch', forward);
    const { OPTIONS } = await import('./[[...signal]]/route');
    const result = await OPTIONS(new Request('http://localhost/api/otlp', { method: 'OPTIONS' }));
    expect(result.status).toBe(200);
    expect(result.headers.get('access-control-allow-methods')).toBe('POST, OPTIONS');
    expect(forward).not.toHaveBeenCalled();
  });
});
