# ADR 0003: Introduce an authenticated financial BFF incrementally

## Status

Proposed in the Next.js migration pull request.

## Context

Financial operations need boundary validation and authorization without discarding existing Supabase tenant isolation or migrating every feature at once.

## Decision

Move internal income, expense registration and audit, and reconciliation through authenticated Next.js route handlers. Validate the user token, resolve the profile and tenant, check operation-specific roles, and use the user's token with the anonymous key for database operations. PostgreSQL RLS remains in force. Continue existing direct client operations for workflows not yet migrated.

Add tenant-reference validation for financial rows and perform reconciliation through a security-invoker function that updates the linked records atomically. These migrations require review and deployment to the target database; no remote application is implied by this ADR.

## Consequences

- The BFF adds validation and authorization while RLS provides a second layer of tenant isolation. Ordinary tenant operations do not require a service-role credential.
- The transition has two access paths, so BFF coverage cannot be assumed for all modules. Application services and persistence ports will be extracted as additional workflows move.
- Existing inconsistent tenant references must be reviewed before enabling the new checks. The reconciliation endpoint depends on the new database function.
- Expense-audit roles differ between the current UI and database policies. Keep database enforcement and resolve the discrepancy before changing permissions.
