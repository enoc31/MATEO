import { supabase } from '../supabaseClient';

export async function postAuthenticated<T>(
  path: string,
  input: unknown,
  fallback: string,
): Promise<T> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error('Inicia sesión para continuar.');
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session.access_token}`,
    },
    body: JSON.stringify(input),
  });
  const result: unknown = await response.json();
  if (!response.ok) {
    const message =
      result && typeof result === 'object' && 'error' in result && typeof result.error === 'string'
        ? result.error
        : fallback;
    throw new Error(message);
  }
  return result as T;
}
