import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

function signedRequest(body: string, timestamp = Math.floor(Date.now() / 1000).toString()) {
  const signature = createHmac('sha256', 'test-secret')
    .update(`v0:${timestamp}:${body}`)
    .digest('hex');
  return new Request('http://localhost/api/slack-events', {
    method: 'POST',
    headers: { 'x-slack-request-timestamp': timestamp, 'x-slack-signature': `v0=${signature}` },
    body,
  });
}

describe('Slack events route', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('rejects requests when signature verification is not configured', async () => {
    vi.stubEnv('SLACK_SIGNING_SECRET', '');
    expect((await POST(signedRequest('{}'))).status).toBe(503);
  });

  it('accepts a signed challenge', async () => {
    vi.stubEnv('SLACK_SIGNING_SECRET', 'test-secret');
    const result = await POST(
      signedRequest(JSON.stringify({ type: 'url_verification', challenge: 'abc' })),
    );
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ challenge: 'abc' });
  });

  it('rejects modified and stale requests', async () => {
    vi.stubEnv('SLACK_SIGNING_SECRET', 'test-secret');
    const unsigned = new Request('http://localhost/api/slack-events', {
      method: 'POST',
      body: '{}',
    });
    expect((await POST(unsigned)).status).toBe(401);
    const old = Math.floor(Date.now() / 1000 - 301).toString();
    expect((await POST(signedRequest('{}', old))).status).toBe(401);
    const signed = signedRequest('{}');
    const tampered = new Request(signed.url, {
      method: 'POST',
      headers: signed.headers,
      body: '{"modified":true}',
    });
    expect((await POST(tampered)).status).toBe(401);
  });
});
