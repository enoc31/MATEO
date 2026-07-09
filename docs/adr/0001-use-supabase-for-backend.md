# ADR 0001: Use Supabase for Backend Services

## Status

Accepted

## Context

The `ong-donation-audit` application requires:

1. User Authentication (with role-based access control like administrative approvals).
2. A relational database to store donation details, expenses, exchange rates, and budgets.
3. Storage bucket functionality to save receipts and generated PDF/Excel audit reports.

Building a custom Node.js/Express/PostgreSQL backend from scratch would require substantial time, effort, and hosting configuration.

## Decision

We will use **Supabase** as our Backend-as-a-Service (BaaS) provider.

We will leverage:

- **Supabase Auth**: For user registration, login, and secure sessions.
- **Supabase Database**: PostgreSQL instance to host relational data.
- **Supabase Storage**: Bucket storage for receipts and generated documents.

## Consequences

- **Pros**:
  - Extremely fast prototyping and database setup.
  - Row Level Security (RLS) policies are natively enforced directly in PostgreSQL.
  - Built-in user authentication hooks.
  - Reduced administrative overhead for server maintenance.
- **Cons**:
  - Vendor lock-in to Supabase SDK and PostgreSQL features.
  - Local offline development requires Supabase CLI setup.
