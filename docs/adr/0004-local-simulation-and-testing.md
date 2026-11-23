# ADR 0004: Use localStorage simulation for browser tests

## Status

Proposed in the Next.js migration pull request.

## Context

Developers need a repeatable local workflow and a browser safety net without a hosted backend. Replacing the production backend is outside this decision.

## Decision

Use the existing seeded localStorage simulation for local development without backend configuration and for Playwright. Build the Next.js application with placeholder configuration for the browser suite and block external requests in simulated flows. Use disposable PostgreSQL for focused database tests when required; consider SQLite for future local test needs if simulation is insufficient.

## Consequences

- Browser tests are fast, isolated and cover UI navigation and simulated workflows, but do not test production authentication, RLS or persistent database behavior.
- The PostgreSQL reconciliation test uses a minimal fixture schema and test policies; it does not establish equivalence with production RLS. The optional local Supabase suite is available for fuller integration coverage.
- Production continues to use the existing backend. A database-backed local development adapter has not been implemented and is not required by this decision.
