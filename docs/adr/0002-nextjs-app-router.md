# ADR 0002: Use Next.js App Router for the application

## Status

Proposed in the Next.js migration pull request.

## Context

The application began as a React/Vite SPA deployed on Vercel. We need equivalent routes and existing browser workflows while providing server-side entry points for selected operations.

## Decision

Use Next.js App Router for the application and Vercel build. Preserve existing URLs, client components, styles and simulation behavior during migration. Remove the Vite application entry point and SPA fallback. Vitest continues to use Vite internally for test transforms; some React Router compatibility wrappers remain in shared components.

## Consequences

- App Router provides route handlers and server-rendered registration metadata alongside client-side screens.
- Existing browser-dependent workflows remain client components; this is not a wholesale rewrite into server components.
- `NEXT_PUBLIC_*` values are public build-time configuration. The temporary compatibility mapping in `next.config.mjs` permits existing `VITE_*` configuration; server credentials must not be included in it.
- Browser simulation tests cover route behavior, but do not prove parity of production integrations. PR preview and release checks are still needed.
