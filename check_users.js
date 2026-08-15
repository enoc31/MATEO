import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ydnylydulwjecdllbnev.supabase.co';
const supabaseKey = 'sb_publishable_ir2UA-esQVx-wDlUKnsjbA_25EdKXU0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
  const { data: users, error } = await supabase.from('usuarios_perfiles').select(`
      id,
      email,
      nombre_completo,
      rol,
      aprobado,
      created_at,
      ong_id,
      ongs (
        id,
        nombre
      )
    `);

  if (error) {
    console.error('Error fetching users:', error);
  } else {
    console.log('--- TABLA: usuarios_perfiles (CON UNIÓN A ONGS) ---');
    console.table(users);
  }
}

checkUsers();
