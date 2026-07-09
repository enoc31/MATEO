# Security Policy (SECURITY.md)

## Vulnerability Reporting

If you discover a security vulnerability within this project, please do **NOT** open a public issue. Instead, report it privately to the project administrator or email `security@ongdonationaudit.org`. We aim to respond and address all valid reports within 48 hours.

## Security-Critical Paths

The following files and directories are designated as **Security-Critical Paths**. Any modifications to these paths must undergo strict manual code reviews with a security focus:

1. **Database Access Control & Client Init**:
   - [src/supabaseClient.ts](file:///c:/Users/gerar/Desktop/AppGravity/ONG-DONATION-AUDIT/src/supabaseClient.ts): Configures client tokens and initialization.
   - `supabase/migrations/` / database schemas: Defines Row Level Security (RLS) policies. RLS must always be enabled on all tables.
2. **Session and Authentication Context**:
   - [src/context/AuthContext.tsx](file:///c:/Users/gerar/Desktop/AppGravity/ONG-DONATION-AUDIT/src/context/AuthContext.tsx): Manages sessions, user roles, and login/registration flows.
3. **Sensitive API Operations**:
   - [src/services/api.ts](file:///c:/Users/gerar/Desktop/AppGravity/ONG-DONATION-AUDIT/src/services/api.ts): Methods that handle user roles, permissions, administrative approvals, and transaction details.

## Dependency Security & Audits

- We run security checks on project dependencies as part of our integration pipeline.
- Developers should run `npm audit` locally before adding or upgrading dependencies.
- Any dependency with a high or critical vulnerability must be updated or replaced immediately.
