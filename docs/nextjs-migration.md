# Next.js migration: current state

Next.js is the application development and production build (`npm run dev` and `npm run build`). Public routes and authenticated workspace routes use the App Router, including fallbacks for unmatched paths. Some React Router compatibility wrappers remain in shared components. The pull-request deployment uses Next.js; verify integration behavior before merging or promoting to production.

Internal income and expense registration and bank reconciliation use authenticated Next.js route handlers in the Next.js build. The handlers verify the Supabase user, resolve the organization and role, and use the user's token for database access so RLS remains active. Reconciliation uses a database transaction so both records change together. Simulation retains its existing browser-local behavior.

## Local verification

- `npm run build` and `npm run build:next`
- `npm run test:e2e` builds Next.js with simulation settings and runs Playwright against the production server; `npm run test:e2e:next` exercises the development server.
- `npm run build:next` followed by `npm run test:e2e:next:production`
- `npm run test:postgres` runs the reconciliation migration against a disposable PostgreSQL container, with a minimal test schema and tenant policies. It does not validate the production schema or policies.
- For the complete database schema and RLS tests, start an isolated local Supabase stack, then run `supabase test db --local` and `npm run test:integration:local`. The integration runner refuses non-local Supabase URLs.
- `npm run test:mutation:finance` measures the income and expense input-validation tests. Review surviving mutants; the command does not enforce a score threshold.

## Deployment prerequisites

- Playwright runs in simulation using browser-local data; it does not exercise database persistence or authorization. Configure public Supabase values and server-only OTLP credentials for deployments that use those integrations.
- The Next.js Slack webhook requires `SLACK_SIGNING_SECRET` and `SLACK_BOT_TOKEN` as server-side environment variables. The previous hard-coded bot token was committed to repository history and must be revoked or rotated; removing it from the current files does not revoke it.
- Before applying `20261123000000_enforce_tenant_references.sql` remotely, run the read-only `database/audit_tenant_references.sql` against staging and review any inconsistencies. Existing rows are not rewritten; future inserts and changes to the protected reference columns must satisfy the new checks.
- Retain the previous Vercel deployment for rollback and validate the migration against staging before changing production routing or environment settings.

## Remaining decisions and work

- Confirm which church roles may approve and reject expenses. Existing UI roles and database update policies differ; the BFF retains RLS enforcement rather than granting additional access.
- Agree business recovery objectives before choosing and testing a backup and recovery mechanism. Subscription entitlements, trial enforcement, plan limits, broader module migration, monitoring and cost tracking remain roadmap work.
- Complete staging verification of callbacks, uploads, telemetry, Slack, representative financial records and cross-tenant behavior. Neither database migration has been applied remotely as part of this work.
