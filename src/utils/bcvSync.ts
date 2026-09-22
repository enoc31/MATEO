import { api } from '../services/api';

/**
 * APIs públicas de tasa BCV ordenadas por disponibilidad y CORS.
 * Se intentan en secuencia hasta obtener un valor válido.
 */
const BCV_APIS = [
  {
    url: 'https://pydolarve.org/api/v1/dollar?page=bcv',
    parse: (data: Record<string, unknown>): { value: number; date: string } | null => {
      const monitors = data?.monitors as Record<string, unknown> | undefined;
      const usd = monitors?.usd as Record<string, unknown> | undefined;
      if (usd?.price && typeof usd.price === 'number' && usd.price > 0) {
        const rawDate =
          (usd.last_update as string) || (usd.updated_date as string) || new Date().toISOString();
        const dateObj = new Date(rawDate);
        const dateStr = isNaN(dateObj.getTime())
          ? new Date().toISOString().split('T')[0]
          : dateObj.toISOString().split('T')[0];
        return { value: Number(usd.price), date: dateStr };
      }
      return null;
    },
  },
  {
    url: 'https://ve.dolarapi.com/v1/dolares/oficial',
    parse: (data: Record<string, unknown>): { value: number; date: string } | null => {
      const val = data?.promedio ?? data?.monto ?? data?.usd;
      if (val && Number(val) > 0) {
        const rawDate = (data?.fechaActualizacion as string) || (data?.fecha as string);
        const dateObj = rawDate ? new Date(rawDate) : new Date();
        const dateStr = isNaN(dateObj.getTime())
          ? new Date().toISOString().split('T')[0]
          : dateObj.toISOString().split('T')[0];
        return { value: Number(val), date: dateStr };
      }
      return null;
    },
  },
  {
    url: 'https://rates.dolarvzla.com/bcv/current.json',
    parse: (data: Record<string, unknown>): { value: number; date: string } | null => {
      const current = data?.current as Record<string, unknown> | undefined;
      if (current?.usd && typeof current.usd === 'number' && current.usd > 0 && current?.date) {
        return { value: Number(current.usd), date: String(current.date) };
      }
      return null;
    },
  },
];

/**
 * Intenta obtener la tasa BCV actual desde múltiples fuentes públicas.
 * Retorna null si ninguna fuente está disponible (modo offline / CORS bloqueado).
 */
const fetchLiveBCVRate = async (): Promise<{ value: number; date: string } | null> => {
  for (const api of BCV_APIS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(api.url, {
        signal: controller.signal,
        mode: 'cors',
        cache: 'no-cache',
      });
      clearTimeout(timeoutId);
      if (!res.ok) continue;
      const data: Record<string, unknown> = await res.json();
      const result = api.parse(data);
      if (result && result.value > 0 && result.date) {
        console.info(`[BCV Sync] Tasa obtenida desde ${api.url}: ${result.value} (${result.date})`);
        return result;
      }
    } catch {
      // CORS o timeout — intentar siguiente API
    }
  }
  return null;
};

/**
 * Clave de localStorage para registrar la última sincronización exitosa.
 * Evita llamadas redundantes a la API si ya se sincronizó hoy.
 */
const SYNC_TIMESTAMP_KEY = 'bcv_last_sync_date';

/**
 * Función principal de sincronización de la tasa BCV.
 * - Verifica si ya se sincronizó hoy (evita llamadas redundantes).
 * - Consulta múltiples APIs en cascada.
 * - Persiste el valor nuevo en Supabase o localStorage.
 * - Devuelve la tasa vigente más reciente disponible (sin lanzar errores).
 */
export const checkAndSyncBCVRate = async (): Promise<void> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const lastSync = localStorage.getItem(SYNC_TIMESTAMP_KEY);

    // Si ya sincronizamos hoy, no volvemos a llamar a la API externa.
    if (lastSync === today) {
      console.info('[BCV Sync] Ya sincronizado hoy, omitiendo fetch externo.');
      return;
    }

    const result = await fetchLiveBCVRate();
    if (!result) {
      console.warn('[BCV Sync] No se pudo obtener la tasa BCV de ninguna fuente pública.');
      return;
    }

    // Validación básica: la tasa debe ser razonable (> 1 y < 100000)
    if (result.value <= 1 || result.value > 100_000) {
      console.warn(`[BCV Sync] Valor de tasa fuera de rango: ${result.value}. Se descarta.`);
      return;
    }

    await api.upsertTasaBCV({
      fecha: result.date,
      tasa: result.value,
      fuente: 'bcv_api',
    });

    // Marcar sincronización exitosa para hoy
    localStorage.setItem(SYNC_TIMESTAMP_KEY, today);
    console.info(`[BCV Sync] Tasa BCV sincronizada: ${result.value} Bs/$ (${result.date})`);
  } catch (error) {
    console.error('[BCV Sync] Error inesperado al sincronizar la tasa BCV:', error);
  }
};

/**
 * Fuerza una sincronización, ignorando el caché de "ya sincronizado hoy".
 * Útil para cuando el usuario refresca manualmente o al detectar datos corruptos.
 */
export const forceSyncBCVRate = async (): Promise<number | null> => {
  try {
    // Limpiar caché de sincronización para forzar un nuevo fetch
    localStorage.removeItem(SYNC_TIMESTAMP_KEY);
    await checkAndSyncBCVRate();

    // Retornar la tasa más reciente disponible después de sincronizar
    const allRates = await api.getTasasBCV();
    if (allRates && allRates.length > 0) {
      return allRates[0].tasa;
    }
    return null;
  } catch {
    return null;
  }
};
