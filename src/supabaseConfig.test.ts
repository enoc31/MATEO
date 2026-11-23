import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  PLACEHOLDER_SUPABASE_ANON_KEY,
  PLACEHOLDER_SUPABASE_URL,
  resolveSupabaseConfig,
} from './supabaseConfig';

describe('Supabase configuration', () => {
  it('enables simulation if either credential is missing or a placeholder', () => {
    const urls = [undefined, '', PLACEHOLDER_SUPABASE_URL];
    const keys = [undefined, '', PLACEHOLDER_SUPABASE_ANON_KEY];
    for (const url of urls) {
      expect(resolveSupabaseConfig(url, 'valid-key').isSimulationMode).toBe(true);
    }
    for (const key of keys) {
      expect(resolveSupabaseConfig('https://example.supabase.co', key).isSimulationMode).toBe(true);
    }
    expect(resolveSupabaseConfig()).toEqual({
      url: PLACEHOLDER_SUPABASE_URL,
      anonKey: PLACEHOLDER_SUPABASE_ANON_KEY,
      isSimulationMode: true,
    });
  });

  it('preserves configured credentials and disables simulation', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((url) => url !== PLACEHOLDER_SUPABASE_URL),
        fc.string({ minLength: 1 }).filter((key) => key !== PLACEHOLDER_SUPABASE_ANON_KEY),
        (url, key) => {
          expect(resolveSupabaseConfig(url, key)).toEqual({
            url,
            anonKey: key,
            isSimulationMode: false,
          });
        },
      ),
    );
  });
});
