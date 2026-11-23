export const PLACEHOLDER_SUPABASE_URL = 'https://placeholder-url.supabase.co';
export const PLACEHOLDER_SUPABASE_ANON_KEY = 'placeholder-anon-key';

/** Resolve the same configuration for the client and simulation-mode decision. */
export function resolveSupabaseConfig(url?: string, anonKey?: string) {
  return {
    url: url || PLACEHOLDER_SUPABASE_URL,
    anonKey: anonKey || PLACEHOLDER_SUPABASE_ANON_KEY,
    isSimulationMode: !(
      url &&
      url !== PLACEHOLDER_SUPABASE_URL &&
      anonKey &&
      anonKey !== PLACEHOLDER_SUPABASE_ANON_KEY
    ),
  };
}

export const supabaseConfig = resolveSupabaseConfig(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
