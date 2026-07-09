import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// Edge Function: sync-tasa-bcv
// Llamada por pg_cron: Lun-Vie a las 21:05 UTC (17:05 VE)
//
// Lógica de fecha destino (regla BCV):
//   El BCV publica a las 5 PM la tasa del SIGUIENTE día hábil.
//   Lun → Mar | Mar → Mié | Mié → Jue | Jue → Vie | Vie → Lun
// ============================================================

/**
 * Calcula la fecha destino a partir de la fecha de publicación BCV.
 * El BCV publica la tasa hoy, pero es válida para mañana (o el lunes si es viernes).
 * @param hoy - Fecha actual en hora Venezuela
 * @returns string con formato 'YYYY-MM-DD'
 */
function calcularFechaDestino(hoy: Date): string {
  const diaSemana = hoy.getDay(); // 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb

  // Días a sumar para llegar al próximo día hábil
  // Viernes (5) → sumar 3 para llegar al lunes
  // Lunes-Jueves (1-4) → sumar 1 para llegar al día siguiente
  const diasASumar = diaSemana === 5 ? 3 : 1;

  const fechaDestino = new Date(hoy);
  fechaDestino.setDate(hoy.getDate() + diasASumar);

  // Formato YYYY-MM-DD usando UTC para evitar desfases de zona horaria
  const yyyy = fechaDestino.getFullYear();
  const mm = String(fechaDestino.getMonth() + 1).padStart(2, '0');
  const dd = String(fechaDestino.getDate()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
}

serve(async (_req) => {
  try {
    // 1. Hora actual en Venezuela (UTC-4)
    //    Usamos toLocaleString para obtener la hora local correcta
    const ahoraVE = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Caracas' }));

    // 2. Obtener tasa oficial desde la API BCV via dolarapi.com
    const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000), // timeout 10 segundos
    });

    if (!response.ok) {
      throw new Error(`dolarapi.com respondió HTTP ${response.status}`);
    }

    const data = await response.json();
    const tasa: number = data.promedio;

    if (!tasa || tasa <= 0) {
      throw new Error(`Tasa inválida recibida de la API: ${tasa}`);
    }

    // 3. Calcular la fecha para la que aplica esta tasa (próximo día hábil)
    const fechaDestino = calcularFechaDestino(ahoraVE);

    // 4. Conectar a Supabase con service_role (bypasea RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 5. Insertar la tasa — ignorar si ya existe para esa fecha
    //    (ON CONFLICT DO NOTHING vía ignoreDuplicates)
    const { error } = await supabase
      .from('tasas_bcv')
      .upsert(
        { fecha: fechaDestino, tasa, fuente: 'bcv_api' },
        { onConflict: 'fecha', ignoreDuplicates: true },
      );

    if (error) throw error;

    const mensaje = `[sync-tasa-bcv] ✅ OK → fecha: ${fechaDestino}, tasa: ${tasa} Bs/$`;
    console.log(mensaje);

    return new Response(JSON.stringify({ ok: true, fecha: fechaDestino, tasa }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    // Retornamos HTTP 200 aunque haya error para que pg_cron
    // no deshabilite el job por fallos ocasionales (ej: sin internet)
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[sync-tasa-bcv] ❌ ERROR: ${errorMsg}`);

    return new Response(JSON.stringify({ ok: false, error: errorMsg }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
