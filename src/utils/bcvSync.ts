import { api } from '../services/api';
import { getCaracasDateParts } from './formatters';

export interface LiveBcvRateEntry {
  date: string;
  value: number;
}

export interface LiveBcvSyncResult {
  latestRate: number;
  latestDate: string;
  syncedCount: number;
  source: string;
}

function extractIsoDate(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const match = raw.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function isValidRate(val: number): boolean {
  return Number.isFinite(val) && val > 1 && val < 100_000;
}

/**
 * Consulta la tasa BCV en vivo intentando primero el endpoint del servidor (/api/tasas/live)
 * para evitar bloqueos CORS y luego haciendo fallback directo a APIs públicas activas.
 */
export async function fetchLiveBCVRates(
  includeHistory = false,
): Promise<{ rates: LiveBcvRateEntry[]; history: LiveBcvRateEntry[]; source: string } | null> {
  // 1. Intentar primero el endpoint server-side de Next.js (/api/tasas/live)
  if (typeof window !== 'undefined' && window.location?.origin?.startsWith('http')) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);
      const res = await fetch(`/api/tasas/live${includeHistory ? '?history=1' : ''}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = (await res.json()) as {
          ok?: boolean;
          source?: string;
          rates?: LiveBcvRateEntry[];
          history?: LiveBcvRateEntry[];
        };
        if (data?.ok && Array.isArray(data.rates) && data.rates.length > 0) {
          return {
            rates: data.rates.filter((r) => Boolean(r.date) && isValidRate(Number(r.value))),
            history: Array.isArray(data.history)
              ? data.history.filter((r) => Boolean(r.date) && isValidRate(Number(r.value)))
              : [],
            source: data.source || '/api/tasas/live',
          };
        }
      }
    } catch {
      // Fallback a APIs públicas directas
    }
  }

  // 2. Fallback directo a rates.dolarvzla.com (incluye tasa vigente y tasa del siguiente día hábil)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch('https://rates.dolarvzla.com/bcv/current.json', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = (await res.json()) as {
        current?: { date?: unknown; usd?: unknown };
        previous?: { date?: unknown; usd?: unknown };
      };
      const rates: LiveBcvRateEntry[] = [];
      const currDate = extractIsoDate(data?.current?.date);
      const currUsd = Number(data?.current?.usd);
      if (currDate && isValidRate(currUsd)) {
        rates.push({ date: currDate, value: currUsd });
      }
      const prevDate = extractIsoDate(data?.previous?.date);
      const prevUsd = Number(data?.previous?.usd);
      if (prevDate && isValidRate(prevUsd) && !rates.some((r) => r.date === prevDate)) {
        rates.push({ date: prevDate, value: prevUsd });
      }

      let history: LiveBcvRateEntry[] = [];
      if (includeHistory) {
        try {
          const year = new Date().getFullYear();
          const histRes = await fetch(`https://rates.dolarvzla.com/bcv/${year}/list.json`, {
            signal: AbortSignal.timeout(6000),
          });
          if (histRes.ok) {
            const rawHist = (await histRes.json()) as unknown;
            const items = Array.isArray(rawHist)
              ? rawHist
              : rawHist && typeof rawHist === 'object'
                ? Object.values(rawHist as Record<string, unknown>)
                : [];
            history = items
              .map((item) => {
                if (!item || typeof item !== 'object') return null;
                const rec = item as { date?: unknown; usd?: unknown };
                const d = extractIsoDate(rec.date);
                const v = Number(rec.usd);
                return d && isValidRate(v) ? { date: d, value: v } : null;
              })
              .filter((x): x is LiveBcvRateEntry => Boolean(x))
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 45);
          }
        } catch {
          // Continuar con las tasas live si falla el histórico
        }
      }

      if (rates.length > 0) {
        return { rates, history, source: 'rates.dolarvzla.com' };
      }
    }
  } catch {
    // Intentar siguiente fuente
  }

  // 3. Fallback directo a ve.dolarapi.com
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
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
        getCaracasDateParts().dateString;
      if (isValidRate(val)) {
        return {
          rates: [{ date: dateStr, value: val }],
          history: [],
          source: 've.dolarapi.com',
        };
      }
    }
  } catch {
    // Ninguna API disponible
  }

  return null;
}

const SYNC_TIMESTAMP_KEY = 'bcv_last_sync_date';

/**
 * Sincroniza la tasa BCV en segundo plano (máximo una vez al día por navegador).
 */
export const checkAndSyncBCVRate = async (): Promise<void> => {
  try {
    const today = getCaracasDateParts().dateString;
    const lastSync = localStorage.getItem(SYNC_TIMESTAMP_KEY);

    if (lastSync === today) {
      return;
    }

    const fetched = await fetchLiveBCVRates(false);
    if (!fetched || fetched.rates.length === 0) {
      console.warn('[BCV Sync] No se pudo obtener la tasa BCV de ninguna fuente.');
      return;
    }

    await api.bulkUpsertTasasBCV(
      fetched.rates.map((r) => ({
        fecha: r.date,
        tasa: r.value,
        fuente: 'bcv_api' as const,
      })),
    );

    localStorage.setItem(SYNC_TIMESTAMP_KEY, today);
    console.info(
      `[BCV Sync] Tasa BCV sincronizada desde ${fetched.source}: ${fetched.rates[0].value} Bs/$ (${fetched.rates[0].date})`,
    );
  } catch (error) {
    console.error('[BCV Sync] Error al sincronizar la tasa BCV:', error);
  }
};

/**
 * Sincroniza la tasa vigente y el histórico reciente (usado por el botón de TasasManager).
 * Lanza error si falla el guardado en Supabase para que el usuario reciba feedback real.
 */
export const syncLiveBCVWithHistory = async (): Promise<LiveBcvSyncResult | null> => {
  localStorage.removeItem(SYNC_TIMESTAMP_KEY);
  const fetched = await fetchLiveBCVRates(true);
  if (!fetched || (fetched.rates.length === 0 && fetched.history.length === 0)) {
    return null;
  }

  const combined = [...fetched.history, ...fetched.rates];
  const saved = await api.bulkUpsertTasasBCV(
    combined.map((r) => ({
      fecha: r.date,
      tasa: r.value,
      fuente: 'bcv_api' as const,
    })),
  );

  const today = getCaracasDateParts().dateString;
  localStorage.setItem(SYNC_TIMESTAMP_KEY, today);

  const sorted = [...combined].sort((a, b) => b.date.localeCompare(a.date));
  const latest = sorted[0];

  return {
    latestRate: latest.value,
    latestDate: latest.date,
    syncedCount: saved.length || combined.length,
    source: fetched.source,
  };
};

/**
 * Fuerza una sincronización inmediata desde el header o controles rápidos.
 * Retorna la tasa actualizada o null si no se pudo obtener.
 */
export const forceSyncBCVRate = async (): Promise<number | null> => {
  try {
    localStorage.removeItem(SYNC_TIMESTAMP_KEY);
    const fetched = await fetchLiveBCVRates(false);
    if (!fetched || fetched.rates.length === 0) {
      return null;
    }

    await api.bulkUpsertTasasBCV(
      fetched.rates.map((r) => ({
        fecha: r.date,
        tasa: r.value,
        fuente: 'bcv_api' as const,
      })),
    );

    const today = getCaracasDateParts().dateString;
    localStorage.setItem(SYNC_TIMESTAMP_KEY, today);

    const sorted = [...fetched.rates].sort((a, b) => b.date.localeCompare(a.date));
    return sorted[0].value;
  } catch (error) {
    console.error('[BCV Sync] Error en forceSyncBCVRate:', error);
    throw error;
  }
};
