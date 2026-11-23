// Transitional compatibility for the existing client while its routes are migrated.
// Only explicitly public values may be embedded in browser JavaScript.
const publicEnvironment = {
  VITE_APP_FRAMEWORK: 'next',
  VITE_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY,
  VITE_RECAPTCHA_SITE_KEY:
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? process.env.VITE_RECAPTCHA_SITE_KEY,
  VITE_OTEL_ENABLED: process.env.NEXT_PUBLIC_OTEL_ENABLED ?? process.env.VITE_OTEL_ENABLED,
  VITE_OTEL_SERVICE_NAME:
    process.env.NEXT_PUBLIC_OTEL_SERVICE_NAME ?? process.env.VITE_OTEL_SERVICE_NAME,
  VITE_OTEL_EXPORTER_OTLP_ENDPOINT:
    process.env.NEXT_PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT ??
    process.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT,
  PROD: process.env.NODE_ENV === 'production',
};

/** @type {import('next').NextConfig} */
const config = {
  typescript: { tsconfigPath: 'tsconfig.next.json' },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(self)' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [{ source: '/api/registro', destination: '/registro' }];
  },
  async redirects() {
    return [
      { source: '/register', destination: '/registro-ong', permanent: false },
      { source: '/wizard', destination: '/registro-ong', permanent: false },
      { source: '/app/beneficiaries', destination: '/app/miembros', permanent: false },
    ];
  },
  webpack(webpackConfig, { webpack }) {
    webpackConfig.plugins.push(
      new webpack.DefinePlugin({ 'import.meta.env': JSON.stringify(publicEnvironment) }),
    );
    return webpackConfig;
  },
};

export default config;
