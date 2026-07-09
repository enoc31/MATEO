const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ydnylydulwjecdllbnev.supabase.co';
const supabaseKey =
  process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ir2UA-esQVx-wDlUKnsjbA_25EdKXU0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  try {
    // Intentar un upsert de prueba
    console.log('Insertando tasa de prueba...');
    const { data, error } = await supabase
      .from('tasas_bcv')
      .upsert([{ fecha: '2026-07-10', tasa: 690.5 }], { onConflict: 'ong_id,fecha' });

    if (error) {
      console.error('Error de Supabase:', error);
    } else {
      console.log('Éxito:', data);
    }
  } catch (err) {
    console.error('Error catastrófico:', err);
  }
}

test();
