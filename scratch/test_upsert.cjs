const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ydnylydulwjecdllbnev.supabase.co';
const supabaseKey = 'sb_publishable_ir2UA-esQVx-wDlUKnsjbA_25EdKXU0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  try {
    // 1. Obtener todas las tasas actuales
    console.log('Listando tasas actuales...');
    const { data: tasas, error: err1 } = await supabase.from('tasas_bcv').select('*');

    if (err1) {
      console.error('Error listando:', err1);
    } else {
      console.log('Tasas registradas:', tasas);
    }

    // 2. Intentar hacer un upsert normal con conflicto 'fecha' para ver si existe la vieja
    console.log('Probando upsert en fecha...');
    const { data: d2, error: err2 } = await supabase
      .from('tasas_bcv')
      .upsert([{ fecha: '2026-07-10', tasa: 690.5 }], { onConflict: 'fecha' });

    if (err2) {
      console.error('Error upsert fecha:', err2);
    } else {
      console.log('Éxito upsert fecha:', d2);
    }
  } catch (err) {
    console.error('Error catastrófico:', err);
  }
}

test();
