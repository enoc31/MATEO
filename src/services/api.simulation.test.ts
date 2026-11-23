import { afterEach, describe, expect, it, vi } from 'vitest';

describe('simulated organization lookup', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    localStorage.clear();
  });

  it('initializes the demo organization before a direct lookup', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://placeholder-url.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'placeholder-anon-key');
    localStorage.clear();
    const { api, isSimulationMode } = await import('./api');
    expect(isSimulationMode).toBe(true);
    expect(await api.getOngById('11111111-1111-1111-1111-111111111111')).toMatchObject({
      nombre: 'Convención Nacional Bautista de Venezuela',
    });
    expect(await api.getOngById('unknown')).toBeNull();
  });
});
