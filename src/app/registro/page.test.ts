import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateMetadata } from './page';

const query = vi.hoisted(() => vi.fn());
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: query }),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('registration link preview', () => {
  it('uses a safe default when no jornada is requested', async () => {
    const metadata = await generateMetadata({ searchParams: Promise.resolve({}) });
    expect(metadata.title).toBe('Formulario de Registro Entrega de Donación');
    expect(query).not.toHaveBeenCalled();
  });

  it('does not query Supabase in simulation mode', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://placeholder-url.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'placeholder-anon-key');
    const metadata = await generateMetadata({ searchParams: Promise.resolve({ jornadaId: 'j1' }) });
    expect(metadata.title).toBe('Formulario de Registro Entrega de Donación');
    expect(query).not.toHaveBeenCalled();
  });

  it('accepts the legacy jornada query parameter', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    const eq = vi.fn(() => ({ single: async () => ({ data: null, error: null }) }));
    query.mockReturnValue({ select: () => ({ eq }) });
    await generateMetadata({ searchParams: Promise.resolve({ jornadald: 'legacy-id' }) });
    expect(eq).toHaveBeenCalledWith('id', 'legacy-id');
  });

  it('returns default metadata when the preview lookup fails', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    query.mockImplementation(() => {
      throw new Error('unavailable');
    });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const metadata = await generateMetadata({
        searchParams: Promise.resolve({ jornadaId: 'j1' }),
      });
      expect(metadata.title).toBe('Formulario de Registro Entrega de Donación');
    } finally {
      log.mockRestore();
    }
  });

  it('includes the jornada, project and organization logo', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    query.mockImplementation((table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () =>
            table === 'jornadas'
              ? {
                  data: {
                    nombre: 'Jornada Norte',
                    proyecto_id: 'p1',
                    ongs: { logo_url: '/logo.png' },
                  },
                  error: null,
                }
              : { data: { nombre: 'Salud' }, error: null },
        }),
      }),
    }));
    const metadata = await generateMetadata({ searchParams: Promise.resolve({ jornadaId: 'j1' }) });
    expect(metadata.title).toBe('Formulario de Registro Entrega de Donación - Jornada Norte');
    expect(metadata.description).toContain('Proyecto: Salud');
    expect(metadata.openGraph).toMatchObject({ images: ['/logo.png'] });
  });
});
