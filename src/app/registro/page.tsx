import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { resolveSupabaseConfig } from '../../supabaseConfig';
import RegistrationShell from './registration-shell';

type RegistrationSearch = { jornadaId?: string | string[]; jornadald?: string | string[] };

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<RegistrationSearch>;
}): Promise<Metadata> {
  const search = await searchParams;
  const value = search.jornadaId || search.jornadald;
  const jornadaId = Array.isArray(value) ? value[0] : value;
  let title = 'Formulario de Registro Entrega de Donación';
  let description =
    'Plataforma integral de gestión humanitaria para ONGs. Control presupuestario, auditoría y transparencia financiera.';
  let image = '/mateo_logo.png';
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (jornadaId && url && key && !resolveSupabaseConfig(url, key).isSimulationMode) {
    try {
      const supabase = createClient(url, key, {
        auth: { persistSession: false },
        global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
      });
      const { data: jornada, error } = await supabase
        .from('jornadas')
        .select('nombre, proyecto_id, ongs(logo_url)')
        .eq('id', jornadaId)
        .single();
      if (!error && jornada) {
        title = `Formulario de Registro Entrega de Donación - ${jornada.nombre}`;
        let proyectoNombre = '';
        if (jornada.proyecto_id) {
          const { data: proyecto } = await supabase
            .from('proyectos')
            .select('nombre')
            .eq('id', jornada.proyecto_id)
            .single();
          proyectoNombre = proyecto?.nombre || '';
        }
        const ong = Array.isArray(jornada.ongs) ? jornada.ongs[0] : jornada.ongs;
        image = ong?.logo_url || image;
        description = proyectoNombre
          ? `Jornada: ${jornada.nombre} | Proyecto: ${proyectoNombre}. Registra la entrega de beneficio de forma segura.`
          : `Jornada: ${jornada.nombre}. Registra la entrega de beneficio de forma segura.`;
      }
    } catch (error) {
      console.error('Error fetching Supabase data for registration preview:', error);
    }
  }
  return { title, description, openGraph: { title, description, images: [image] } };
}

export default function RegistrationPage() {
  return <RegistrationShell />;
}
