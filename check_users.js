import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ydnylydulwjecdllbnev.supabase.co';
const supabaseKey = 'sb_publishable_ir2UA-esQVx-wDlUKnsjbA_25EdKXU0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
  const { data, error } = await supabase.from('usuarios_perfiles').select('*');
  if (error) {
    console.error('Error fetching users:', error);
  } else {
    console.log('--- USUARIOS EN LA BASE DE DATOS ---');
    console.log(JSON.stringify(data, null, 2));
  }
}

checkUsers();
