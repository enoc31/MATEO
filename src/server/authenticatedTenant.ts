import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type TenantAuth =
  { response: Response } | { supabase: SupabaseClient; userId: string; ongId: string };

/** Authenticate with the user's token so PostgreSQL continues to enforce RLS. */
export async function authenticatedTenant(
  request: Request,
  allowedRoles: ReadonlySet<string>,
): Promise<TenantAuth> {
  const match = /^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization') || '');
  if (!match)
    return { response: Response.json({ error: 'Autenticación requerida' }, { status: 401 }) };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key)
    return { response: Response.json({ error: 'Servicio no configurado' }, { status: 503 }) };

  try {
    const token = match[1];
    const supabase = createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: auth, error: authError } = await supabase.auth.getUser(token);
    if (authError || !auth.user)
      return { response: Response.json({ error: 'Sesión inválida' }, { status: 401 }) };
    const { data: profile, error: profileError } = await supabase
      .from('usuarios_perfiles')
      .select('ong_id, rol, aprobado')
      .eq('id', auth.user.id)
      .single();
    if (
      profileError ||
      !profile ||
      !profile.ong_id ||
      !allowedRoles.has(profile.rol) ||
      (profile.aprobado === false && !['administrador', 'admin_iglesia'].includes(profile.rol))
    ) {
      return { response: Response.json({ error: 'Acceso denegado' }, { status: 403 }) };
    }
    return { supabase, userId: auth.user.id, ongId: profile.ong_id };
  } catch {
    return {
      response: Response.json(
        { error: 'Servicio de autenticación no disponible' },
        { status: 503 },
      ),
    };
  }
}
