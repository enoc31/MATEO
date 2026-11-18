import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';

interface JornadaRow {
  nombre: string;
  proyecto_id: string | null;
  ongs: { logo_url: string | null } | null;
}

interface ProyectoRow {
  nombre: string;
}

interface QueryResult<T> {
  data: T | null;
  error: { message: string } | null;
}

interface MockRequest {
  method?: string;
  url?: string;
  headers: Record<string, string | undefined>;
  query: Record<string, string | undefined>;
}

interface MockResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string | undefined;
  setHeader: Mock<(name: string, value: string) => void>;
  status: Mock<(code: number) => MockResponse>;
  send: Mock<(payload: string) => MockResponse>;
}

type HandlerFn = (req: MockRequest, res: MockResponse) => Promise<MockResponse>;

const SAMPLE_INDEX_HTML = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="description"
      content="MATEO ekklesia - Plataforma de gestión financiera para iglesias y ministerios."
    />
    <meta property="og:title" content="MATEO ekklesia - Gestión Financiera para Iglesias" />
    <meta
      property="og:description"
      content="Transparencia financiera para tu iglesia."
    />
    <meta property="og:image" content="/mateo_logo.png" />
    <title>MATEO ekklesia - Gestión Financiera para Iglesias y Ministerios</title>
  </head>
  <body><div id="root"></div></body>
</html>`;

const {
  singleJornadaMock,
  singleProyectoMock,
  fromMock,
  createClientMock,
  sendServerlessLogMock,
  traceServerlessMock,
} = vi.hoisted(() => {
  const singleJornada = vi.fn<() => Promise<QueryResult<JornadaRow>>>();
  const singleProyecto = vi.fn<() => Promise<QueryResult<ProyectoRow>>>();

  const from = vi.fn((table: string) => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: table === 'proyectos' ? singleProyecto : singleJornada,
      })),
    })),
  }));

  const createClient = vi.fn(() => ({
    from,
  }));

  const sendServerlessLog = vi.fn<
    (level: string, message: string, attributes?: Record<string, unknown>) => Promise<void>
  >(async () => {});

  const traceServerless = vi.fn(
    async (_name: string, _req: MockRequest, fn: () => Promise<MockResponse>) => fn(),
  );

  return {
    singleJornadaMock: singleJornada,
    singleProyectoMock: singleProyecto,
    fromMock: from,
    createClientMock: createClient,
    sendServerlessLogMock: sendServerlessLog,
    traceServerlessMock: traceServerless,
  };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

vi.mock('./_telemetry.js', () => ({
  traceServerless: traceServerlessMock,
  sendServerlessLog: sendServerlessLogMock,
}));

function createMockRequest(overrides: Partial<MockRequest> = {}): MockRequest {
  return {
    method: 'GET',
    url: '/registro',
    headers: {
      host: 'mateo-ekklesia.com',
      ...overrides.headers,
    },
    query: {
      ...overrides.query,
    },
  };
}

function createMockResponse(): MockResponse {
  const headers: Record<string, string> = {};
  const res: MockResponse = {
    statusCode: 0,
    headers,
    body: undefined,
    setHeader: vi.fn((name: string, value: string) => {
      headers[name] = value;
    }),
    status: vi.fn((code: number) => {
      res.statusCode = code;
      return res;
    }),
    send: vi.fn((payload: string) => {
      res.body = payload;
      return res;
    }),
  };
  return res;
}

async function loadHandler(): Promise<HandlerFn> {
  const mod = (await import('./registro.js')) as { default: HandlerFn };
  return mod.default;
}

describe('api/registro serverless preview handler', () => {
  let fetchMock: Mock<
    (
      input: string | URL | Request,
      init?: RequestInit,
    ) => Promise<{
      ok: boolean;
      statusText: string;
      text: () => Promise<string>;
    }>
  >;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-test-key');

    fetchMock = vi.fn(async () => ({
      ok: true,
      statusText: 'OK',
      text: async () => SAMPLE_INDEX_HTML,
    }));
    vi.stubGlobal('fetch', fetchMock);

    singleJornadaMock.mockResolvedValue({ data: null, error: null });
    singleProyectoMock.mockResolvedValue({ data: null, error: null });
    sendServerlessLogMock.mockImplementation(async () => {});
    traceServerlessMock.mockImplementation(async (_name, _req, fn) => fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('injects dynamic meta tags and sets Cache-Control when jornadaId resolves from Supabase', async () => {
    singleJornadaMock.mockResolvedValueOnce({
      data: {
        nombre: 'Entrega Alimentos Marzo',
        proyecto_id: 'proj-1',
        ongs: { logo_url: '/logos/iglesia-central.png' },
      },
      error: null,
    });
    singleProyectoMock.mockResolvedValueOnce({
      data: { nombre: 'Comedor Solidario' },
      error: null,
    });

    const handler = await loadHandler();
    const req = createMockRequest({
      headers: { 'x-forwarded-host': 'app.mateo-ekklesia.com' },
      query: { jornadaId: 'jornada-123' },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(createClientMock).toHaveBeenCalledWith('https://example.supabase.co', 'anon-test-key');
    expect(fromMock).toHaveBeenCalledWith('jornadas');
    expect(fromMock).toHaveBeenCalledWith('proyectos');
    expect(fetchMock).toHaveBeenCalledWith('https://app.mateo-ekklesia.com/index.html');

    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toBe('text/html; charset=utf-8');
    expect(res.headers['Cache-Control']).toBe('public, s-maxage=60, stale-while-revalidate=300');

    expect(res.body).toContain(
      '<title>Formulario de Registro Entrega de Donación - Entrega Alimentos Marzo</title>',
    );
    expect(res.body).toContain(
      '<meta property="og:title" content="Formulario de Registro Entrega de Donación - Entrega Alimentos Marzo" />',
    );
    expect(res.body).toContain(
      '<meta name="description" content="Jornada: Entrega Alimentos Marzo | Proyecto: Comedor Solidario. Registra la entrega de beneficio de forma segura." />',
    );
    expect(res.body).toContain(
      '<meta property="og:description" content="Jornada: Entrega Alimentos Marzo | Proyecto: Comedor Solidario. Registra la entrega de beneficio de forma segura." />',
    );
    expect(res.body).toContain(
      '<meta property="og:image" content="https://app.mateo-ekklesia.com/logos/iglesia-central.png" />',
    );
  });

  it('preserves absolute og:image URLs and handles jornadas without proyecto_id', async () => {
    singleJornadaMock.mockResolvedValueOnce({
      data: {
        nombre: 'Jornada Médica',
        proyecto_id: null,
        ongs: { logo_url: 'https://cdn.example.org/ong-logo.png' },
      },
      error: null,
    });

    const handler = await loadHandler();
    const req = createMockRequest({
      query: { jornadaId: 'jornada-456' },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(fromMock).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain(
      '<meta property="og:description" content="Jornada: Jornada Médica. Registra la entrega de beneficio de forma segura." />',
    );
    expect(res.body).toContain(
      '<meta property="og:image" content="https://cdn.example.org/ong-logo.png" />',
    );
  });

  it('escapes HTML and attribute XSS payloads in jornadas.nombre, proyectos.nombre, and logo_url', async () => {
    const xssJornada = '<script>alert("xss")</script> & \'test\'';
    const xssProyecto = 'Proyecto "Alpha" & <img src=x onerror=\'boom()\'>';
    const xssLogoUrl = "https://cdn.example.com/logo.png?a=1&b=\"><script>alert('1')</script>";

    singleJornadaMock.mockResolvedValueOnce({
      data: {
        nombre: xssJornada,
        proyecto_id: 'proj-xss',
        ongs: { logo_url: xssLogoUrl },
      },
      error: null,
    });
    singleProyectoMock.mockResolvedValueOnce({
      data: { nombre: xssProyecto },
      error: null,
    });

    const handler = await loadHandler();
    const req = createMockRequest({
      query: { jornadaId: 'jornada-xss' },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    const body = res.body ?? '';

    expect(body).not.toContain('<script>');
    expect(body).not.toContain('</script>');
    expect(body).not.toContain('<img src=x');

    expect(body).toContain(
      '<title>Formulario de Registro Entrega de Donación - &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &#39;test&#39;</title>',
    );
    expect(body).toContain(
      '<meta property="og:title" content="Formulario de Registro Entrega de Donación - &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &#39;test&#39;" />',
    );
    expect(body).toContain(
      '<meta name="description" content="Jornada: &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &#39;test&#39; | Proyecto: Proyecto &quot;Alpha&quot; &amp; &lt;img src=x onerror=&#39;boom()&#39;&gt;. Registra la entrega de beneficio de forma segura." />',
    );
    expect(body).toContain(
      '<meta property="og:description" content="Jornada: &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &#39;test&#39; | Proyecto: Proyecto &quot;Alpha&quot; &amp; &lt;img src=x onerror=&#39;boom()&#39;&gt;. Registra la entrega de beneficio de forma segura." />',
    );
    expect(body).toContain(
      '<meta property="og:image" content="https://cdn.example.com/logo.png?a=1&amp;b=&quot;&gt;&lt;script&gt;alert(&#39;1&#39;)&lt;/script&gt;" />',
    );
  });

  it('uses default meta tags and skips Supabase query when jornadaId is omitted', async () => {
    const handler = await loadHandler();
    const req = createMockRequest({
      headers: { host: 'localhost:3000' },
      query: {},
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(fromMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/index.html');
    expect(res.statusCode).toBe(200);
    expect(res.headers['Cache-Control']).toBe('public, s-maxage=60, stale-while-revalidate=300');
    expect(res.body).toContain('<title>Formulario de Registro Entrega de Donación</title>');
    expect(res.body).toContain(
      '<meta property="og:image" content="http://localhost:3000/mateo_logo.png" />',
    );
  });

  it('gracefully skips Supabase initialization and query when Supabase env vars are missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    const handler = await loadHandler();
    const req = createMockRequest({
      query: { jornadaId: 'jornada-without-env' },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(createClientMock).not.toHaveBeenCalled();
    expect(fromMock).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.headers['Cache-Control']).toBe('public, s-maxage=60, stale-while-revalidate=300');
    expect(res.body).toContain('<title>Formulario de Registro Entrega de Donación</title>');
  });

  it('skips Supabase initialization when only VITE_SUPABASE_URL is provided without anon key', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    const handler = await loadHandler();
    const req = createMockRequest({
      query: { jornadaId: 'jornada-partial-env' },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(createClientMock).not.toHaveBeenCalled();
    expect(fromMock).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.headers['Cache-Control']).toBe('public, s-maxage=60, stale-while-revalidate=300');
  });

  it('falls back to default meta tags if Supabase query rejects', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    singleJornadaMock.mockRejectedValueOnce(new Error('Supabase timeout'));

    const handler = await loadHandler();
    const req = createMockRequest({
      query: { jornadaId: 'jornada-timeout' },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.headers['Cache-Control']).toBe('public, s-maxage=60, stale-while-revalidate=300');
    expect(res.body).toContain('<title>Formulario de Registro Entrega de Donación</title>');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('awaits sendServerlessLog before returning 500 when fetching index.html fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found',
      text: async () => '',
    });

    let resolveLog!: () => void;
    const deferredLog = new Promise<void>((resolve) => {
      resolveLog = resolve;
    });
    sendServerlessLogMock.mockReturnValueOnce(deferredLog);

    const handler = await loadHandler();
    const req = createMockRequest({ query: {} });
    const res = createMockResponse();

    const handlerPromise = handler(req, res);

    await vi.waitFor(() => {
      expect(sendServerlessLogMock).toHaveBeenCalledTimes(1);
    });

    expect(sendServerlessLogMock).toHaveBeenCalledWith(
      'ERROR',
      expect.stringContaining('Failed to fetch index.html'),
      expect.objectContaining({ stack: expect.any(String) }),
    );
    expect(res.status).not.toHaveBeenCalled();

    resolveLog();
    await handlerPromise;

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith('Internal Server Error');
    expect(res.statusCode).toBe(500);
    expect(res.body).toBe('Internal Server Error');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
