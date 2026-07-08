import { api } from '../services/api';

const BCV_API_URL = 'https://rates.dolarvzla.com/bcv/current.json';

export const checkAndSyncBCVRate = async () => {
  try {
    const ahoraVE = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Caracas' }));
    const hora = ahoraVE.getHours();
    
    // Si no son las 5:00 PM (17:00) o más, no intentamos sincronizar.
    // El BCV suele publicar al final de la tarde.
    if (hora < 17) {
      return;
    }

    // Ya son más de las 5:00 PM. Consultamos la API externa.
    const res = await fetch(BCV_API_URL);
    if (!res.ok) throw new Error('No se pudo conectar a la API del BCV de dolarvzla');
    
    const data = await res.json();
    if (!data.current || !data.current.usd || !data.current.date) return;
    
    const yyyyHoy = ahoraVE.getFullYear();
    const mmHoy = String(ahoraVE.getMonth() + 1).padStart(2, '0');
    const ddHoy = String(ahoraVE.getDate()).padStart(2, '0');
    const fechaHoyStr = `${yyyyHoy}-${mmHoy}-${ddHoy}`;
    
    // Si la tasa devuelta por la API todavía no tiene la fecha de hoy, significa que el BCV
    // aún no ha actualizado, o es día feriado. No hacemos nada.
    if (data.current.date !== fechaHoyStr) {
      return;
    }
    
    const rateValue = data.current.usd;
    
    // La fecha en data.current.date podría venir como "2026-07-08".
    // Queremos que esta tasa aplique para el PRÓXIMO día hábil, ya que se publicó hoy en la tarde.
    const diaSemana = ahoraVE.getDay(); // 0=Dom, 1=Lun, ..., 5=Vie, 6=Sáb
    let diasASumar = 1;
    if (diaSemana === 5) diasASumar = 3; // Viernes -> Lunes
    if (diaSemana === 6) diasASumar = 2; // Sábado -> Lunes
    
    const fechaDest = new Date(ahoraVE);
    fechaDest.setDate(ahoraVE.getDate() + diasASumar);
    
    const yyyy = fechaDest.getFullYear();
    const mm = String(fechaDest.getMonth() + 1).padStart(2, '0');
    const dd = String(fechaDest.getDate()).padStart(2, '0');
    const fechaAplica = `${yyyy}-${mm}-${dd}`;
    
    // Verificamos si ya tenemos esa tasa registrada en nuestra base de datos.
    const existingRate = await api.getTasaByDate(fechaAplica);
    
    // getTasaByDate puede devolver una tasa anterior si no encuentra la exacta.
    // Solo actualizamos si la tasa devuelta NO es exactamente para fechaAplica, 
    // o si no existe del todo.
    if (!existingRate || existingRate.fecha !== fechaAplica) {
      console.log(`Sincronizando tasa BCV automática para ${fechaAplica}... Valor: ${rateValue}`);
      await api.upsertTasaBCV({
        fecha: fechaAplica,
        tasa: rateValue,
        fuente: 'bcv_api'
      });
    }
  } catch (error) {
    console.error('Error sincronizando la tasa BCV automáticamente:', error);
  }
};
