import handler from '../../../../../api/otlp.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Adapt the existing Vercel handler so the legacy and App Router endpoints keep
// the same forwarding behavior while the endpoint is migrated.
async function handle(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const headers = new Headers();
  let statusCode = 200;
  let body: string | null = null;
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
      body = JSON.stringify(value);
      return this;
    },
    send(value: string) {
      body = value;
      return this;
    },
    end() {
      return this;
    },
  };
  const signal = url.searchParams.get('signal') || undefined;
  const path = url.searchParams.get('path') || undefined;
  const req = {
    method: request.method,
    url: `${url.pathname}${url.search}`,
    query: { signal, path },
    headers: Object.fromEntries(request.headers),
    body: request.method === 'POST' ? Buffer.from(await request.arrayBuffer()) : undefined,
  };
  await handler(req, response);
  return new Response(body, { status: statusCode, headers });
}

export const GET = handle;
export const POST = handle;
export const OPTIONS = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
