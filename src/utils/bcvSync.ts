import { api } from '../services/api';

const BCV_API_URL = 'https://rates.dolarvzla.com/bcv/current.json';

export const checkAndSyncBCVRate = async () => {
  try {
    // Consultamos la API externa en cada carga de la aplicación.
    // DolarVZLA ya devuelve en `data.current.date` la "Fecha Valor" (el día en que aplica).
    const res = await fetch(BCV_API_URL);
    if (!res.ok) throw new Error('No se pudo conectar a la API del BCV de dolarvzla');

    const data = await res.json();
    if (!data.current || !data.current.usd || !data.current.date) return;

    const rateValue = data.current.usd;
    const fechaAplica = data.current.date; // Ej: "2026-07-08"

    // Verificamos si ya tenemos esa tasa registrada en nuestra base de datos.
    const existingRate = await api.getTasaByDate(fechaAplica);

    // getTasaByDate puede devolver una tasa anterior si no encuentra la exacta.
    // Actualizamos si no existe la exacta, o si el valor es diferente (para corregir errores manuales).
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
