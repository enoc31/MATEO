export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface LiveBcvRateEntry {
  date: string;
  value: number;
}

export interface LiveBcvResponse {
  ok: true;
  source: string;
  rates: LiveBcvRateEntry[];
  history?: LiveBcvRateEntry[];
}

function extractIsoDate(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const match = raw.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

async function fetchFromDolarVzlaCurrent(): Promise<LiveBcvResponse | null> {
  const res = await fetch('https://rates.dolarvzla.com/bcv/current.json', {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(6000),
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    current?: { date?: unknown; usd?: unknown };
    previous?: { date?: unknown; usd?: unknown };
  };
  const rates: LiveBcvRateEntry[] = [];
  const currDate = extractIsoDate(data?.current?.date);
  const currUsd = Number(data?.current?.usd);
  if (currDate && Number.isFinite(currUsd) && currUsd > 1 && currUsd < 100_000) {
    rates.push({ date: currDate, value: currUsd });
  }
  const prevDate = extractIsoDate(data?.previous?.date);
  const prevUsd = Number(data?.previous?.usd);
  if (
    prevDate &&
    Number.isFinite(prevUsd) &&
    prevUsd > 1 &&
    prevUsd < 100_000 &&
    !rates.some((r) => r.date === prevDate)
  ) {
    rates.push({ date: prevDate, value: prevUsd });
  }
  if (rates.length === 0) return null;
  return { ok: true, source: 'rates.dolarvzla.com', rates };
}

async function fetchFromDolarApi(): Promise<LiveBcvResponse | null> {
  const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(6000),
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    promedio?: unknown;
    monto?: unknown;
    usd?: unknown;
    fechaActualizacion?: unknown;
    fecha?: unknown;
  };
  const val = Number(data?.promedio ?? data?.monto ?? data?.usd);
  const dateStr =
    extractIsoDate(data?.fechaActualizacion) ||
    extractIsoDate(data?.fecha) ||
    new Date().toISOString().split('T')[0];
  if (!Number.isFinite(val) || val <= 1 || val >= 100_000) return null;
  return {
    ok: true,
    source: 've.dolarapi.com',
    rates: [{ date: dateStr, value: val }],
  };
}

async function fetchDolarVzlaHistory(year: number): Promise<LiveBcvRateEntry[]> {
  try {
    const res = await fetch(`https://rates.dolarvzla.com/bcv/${year}/list.json`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    const rawItems = Array.isArray(data)
      ? data
      : data && typeof data === 'object'
        ? Object.values(data as Record<string, unknown>)
        : [];
    const parsed: LiveBcvRateEntry[] = [];
    for (const item of rawItems) {
      if (!item || typeof item !== 'object') continue;
      const rec = item as { date?: unknown; usd?: unknown };
      const dateStr = extractIsoDate(rec.date);
      const usdVal = Number(rec.usd);
      if (dateStr && Number.isFinite(usdVal) && usdVal > 1 && usdVal < 100_000) {
        parsed.push({ date: dateStr, value: usdVal });
      }
    }
    return parsed.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 45);
  } catch {
    return [];
  }
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const includeHistory = url.searchParams.get('history') === '1';

  let result: LiveBcvResponse | null = null;
  try {
    result = await fetchFromDolarVzlaCurrent();
  } catch {
    // Fallback a ve.dolarapi.com
  }

  if (!result) {
    try {
      result = await fetchFromDolarApi();
    } catch {
      // Sin fuentes disponibles
    }
  }

  if (!result) {
    return Response.json(
      { ok: false, error: 'No se pudo consultar la tasa BCV desde las fuentes externas.' },
      { status: 502 },
    );
  }

  if (includeHistory) {
    const year = new Date().getFullYear();
    const history = await fetchDolarVzlaHistory(year);
    if (history.length > 0) {
      result.history = history;
    }
  }

  return Response.json(result, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
  });
}
