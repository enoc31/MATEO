import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req, res) {
  // Obtener el ID de la jornada desde la query string
  const jornadaId = req.query.jornadaId || req.query.jornadald;

  let title = 'Formulario de Registro Entrega de Donación';
  let description =
    'Plataforma integral de gestión humanitaria para ONGs. Control presupuestario, auditoría y transparencia financiera.';
  let ogImage = '/mateo_logo.png';

  if (jornadaId) {
    try {
      // 1. Obtener detalles de la jornada y el logo de la ONG asociada
      const { data: jornada, error: jError } = await supabase
        .from('jornadas')
        .select('nombre, proyecto_id, ongs(logo_url)')
        .eq('id', jornadaId)
        .single();

      if (!jError && jornada) {
        const jornadaNombre = jornada.nombre;
        let proyectoNombre = '';

        // 2. Obtener el nombre del proyecto si está asociado
        if (jornada.proyecto_id) {
          const { data: proyecto, error: pError } = await supabase
            .from('proyectos')
            .select('nombre')
            .eq('id', jornada.proyecto_id)
            .single();
          if (!pError && proyecto) {
            proyectoNombre = proyecto.nombre;
          }
        }

        // Obtener el logo de la ONG si está disponible
        if (jornada.ongs && jornada.ongs.logo_url) {
          ogImage = jornada.ongs.logo_url;
        }

        // Armar título y descripción personalizados para la vista previa de WhatsApp
        title = `Formulario de Registro Entrega de Donación - ${jornadaNombre}`;
        if (proyectoNombre) {
          description = `Jornada: ${jornadaNombre} | Proyecto: ${proyectoNombre}. Registra la entrega de beneficio de forma segura.`;
        } else {
          description = `Jornada: ${jornadaNombre}. Registra la entrega de beneficio de forma segura.`;
        }
      }
    } catch (err) {
      console.error('Error fetching Supabase data for link preview:', err);
    }
  }

  try {
    // Determinar protocolo y host actual de forma dinámica
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
    const indexUrl = `${protocol}://${host}/index.html`;

    // Descargar el index.html compilado estático para conservar los hashes del build
    const fetchRes = await fetch(indexUrl);
    if (!fetchRes.ok) {
      throw new Error(`Failed to fetch index.html from ${indexUrl}: ${fetchRes.statusText}`);
    }
    let html = await fetchRes.text();

    // Reemplazar dinámicamente las etiquetas meta de index.html
    html = html
      // Título principal
      .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
      // og:title
      .replace(
        /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
        `<meta property="og:title" content="${title}" />`,
      )
      // description
      .replace(
        /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
        `<meta name="description" content="${description}" />`,
      )
      // og:description
      .replace(
        /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
        `<meta property="og:description" content="${description}" />`,
      );

    // Asegurar que la URL de la imagen sea absoluta para que la cargue WhatsApp
    let ogImageUrl = ogImage;
    if (ogImage && !ogImage.startsWith('http')) {
      ogImageUrl = `${protocol}://${host}${ogImage.startsWith('/') ? '' : '/'}${ogImage}`;
    }
    html = html.replace(
      /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/,
      `<meta property="og:image" content="${ogImageUrl}" />`,
    );

    // Retornar el HTML con cabecera correcta
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (err) {
    console.error('Error rendering dynamic registration preview:', err);
    return res.status(500).send('Internal Server Error');
  }
}
