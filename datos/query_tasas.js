import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ydnylydulwjecdllbnev.supabase.co';
const supabaseKey = 'sb_publishable_ir2UA-esQVx-wDlUKnsjbA_25EdKXU0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('tasas_bcv')
    .select('*')
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error fetching rates:', error);
  } else {
    console.log('Rates in database:');
    console.log(data);
  }
}

run();
