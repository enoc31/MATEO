import { createHmac, timingSafeEqual } from 'node:crypto';
import handler from '../../../../api/slack-events.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret)
    return Response.json({ error: 'Slack signing secret not configured' }, { status: 503 });

  const timestamp = request.headers.get('x-slack-request-timestamp') ?? '';
  const signature = request.headers.get('x-slack-signature') ?? '';
  const body = await request.text();
  const seconds = Number(timestamp);
  if (
    !/^\d+$/.test(timestamp) ||
    !Number.isSafeInteger(seconds) ||
    Math.abs(Date.now() / 1000 - seconds) > 300
  ) {
    return Response.json({ error: 'Invalid Slack request' }, { status: 401 });
  }
  const expected = `v0=${createHmac('sha256', signingSecret).update(`v0:${timestamp}:${body}`).digest('hex')}`;
  const supplied = Buffer.from(signature);
  const computed = Buffer.from(expected);
  if (supplied.length !== computed.length || !timingSafeEqual(supplied, computed)) {
    return Response.json({ error: 'Invalid Slack request' }, { status: 401 });
  }

  const headers = new Headers();
  let statusCode = 200;
  let result: string | null = null;
  const response = {
    setHeader(name: string, value: string) {
      headers.set(name, value);
    },
    status(value: number) {
      statusCode = value;
      return this;
    },
    json(value: unknown) {
      headers.set('content-type', 'application/json');
      result = JSON.stringify(value);
      return this;
    },
    end() {
      return this;
    },
  };
  await handler({ method: 'POST', headers: Object.fromEntries(request.headers), body }, response);
  return new Response(result, { status: statusCode, headers });
}
