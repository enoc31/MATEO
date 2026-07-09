# Architecture Documentation

## Overview

This project, `ong-donation-audit`, is a React single-page application (SPA) built on Vite and TypeScript. It integrates with Supabase as its Backend-as-a-Service (BaaS) for user authentication, database storage, and file storage.

The primary objective of the application is to audit donations, manage incomes, budgets, requisitions, beneficiaries, and reconciliation for a non-governmental organization (NGO).

## Directory Structure

The codebase is structured under the `src` directory as follows:

```
src/
├── assets/         # Static assets (images, icons, etc.)
├── components/     # Shared presentation components (Layout, UI elements, modals)
├── context/        # Shared React contexts (AuthContext, NotificationContext)
├── features/       # Feature-specific modules containing pages, components, and logic
│   ├── audit/           # Audit tracking and verification
│   ├── auth/            # Login, user registration, and session management
│   ├── beneficiaries/   # Beneficiary management and registration forms
│   ├── budgets/         # Budgets and expense report views
│   ├── dashboard/       # Administrative dashboard with charts and KPIs
│   ├── incomes/         # Income and donation registration
│   ├── landing/         # Public-facing landing page
│   ├── mobile-entry/    # Mobile-optimized views for quick entry
│   ├── reconciliation/  # Bank reconciliations
│   ├── requisitions/    # Requisitions and payout requests
│   ├── tasas/           # Currency exchange rate tracking (USD/VES)
│   └── users/           # User management and approvals
├── services/       # Services for API access and storage interaction
│   ├── api.ts           # Supabase client wrapper and main API operations
│   └── storage.ts       # Supabase bucket storage integrations
└── utils/          # Pure helper functions, formatting, and mathematical utilities
```

## Module Boundary Constraints

To maintain scalability, clean imports, and prevent dependency cycles, the project enforces the following boundary constraints:

1. **Feature Isolation**: Files inside a specific feature directory (e.g., `src/features/auth/`) must **never** import from another feature directory (e.g., `src/features/incomes/`). Any sharing of UI components or helper logic must be promoted to `src/components/`, `src/services/`, or `src/utils/`.
2. **Context and Services**: Business logic and database operations are encapsulated in `src/services/` and `src/context/`. Components and features should invoke these services rather than writing direct Supabase queries.
3. **Utility Purity**: Files in `src/utils/` must be pure functions. They must not import from contexts, services, components, or features.
4. **Shared Components Purity**: Components in `src/components/` must be generic and reusable. They should not depend on specific features or have direct imports from `src/features/*`.

## API & Database Integration

- **Supabase**: All interactions with the database are routed through the `api` service (`src/services/api.ts`) using the Supabase JavaScript SDK.
- **State Management**: React state is managed locally in components, through URL routing, or globally via React Contexts (`src/context/AuthContext.tsx`).
