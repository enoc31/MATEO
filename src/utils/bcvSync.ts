import { api } from '../services/api';

const BCV_PRIMARY_URL = 'https://rates.dolarvzla.com/bcv/current.json';
const BCV_SECONDARY_URL = 'https://ve.dolarapi.com/v1/dolares/oficial';

export const checkAndSyncBCVRate = async () => {
  try {
    let rateValue: number | null = null;
    let fechaAplica: string | null = null;

    // Intento 1: API DolarVZLA (Primary)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(BCV_PRIMARY_URL, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data?.current?.usd && data?.current?.date) {
          rateValue = Number(data.current.usd);
          fechaAplica = String(data.current.date);
        }
      }
    } catch (err) {
      console.warn('API Primaria BCV no disponible, probando API secundaria de respaldo...', err);
    }

    // Intento 2: API DolarApi (Secondary Fallback)
    if (!rateValue || !fechaAplica) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(BCV_SECONDARY_URL, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          const val = data.promedio || data.monto || data.usd;
          if (val) {
            rateValue = Number(val);
            const rawDate = data.fechaActualizacion || data.fecha;
            const dateObj = rawDate ? new Date(rawDate) : new Date();
            fechaAplica = dateObj.toISOString().split('T')[0];
          }
        }
      } catch (err) {
        console.warn('API Secundaria BCV no disponible:', err);
      }
    }

    if (!rateValue || !fechaAplica) return;

    // Verificamos si ya tenemos esa tasa registrada en nuestra base de datos.
    const existingRate = await api.getTasaByDate(fechaAplica);

    if (!existingRate || existingRate.fecha !== fechaAplica || existingRate.tasa !== rateValue) {
      console.log(`Sincronizando tasa BCV automática para ${fechaAplica}... Valor: ${rateValue}`);
      await api.upsertTasaBCV({
        fecha: fechaAplica,
        tasa: rateValue,
        fuente: 'bcv_api',
      });
    }
  } catch (error) {
    console.error('Error sincronizando la tasa BCV automáticamente:', error);
  }
};
