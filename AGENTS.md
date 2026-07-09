# AI Agent Instructions (AGENTS.md)

Welcome! You are an AI assistant helping developers build, optimize, and maintain the `ong-donation-audit` application. To ensure code quality, security, and stability, you must strictly adhere to the following project-specific guidelines.

## Tech Stack & Code Style

- **Framework**: React 19 (using functional components and hooks).
- **Language**: TypeScript (enforce strict typing; avoid the `any` type).
- **Build Tool**: Vite.
- **Styling**: Vanilla CSS (modular and scoped where possible) and UI styling rules in `src/index.css`.
- **Database / Auth**: Supabase JS SDK.

## Module Boundaries & Import Rules

- Adhere to the rules in [ARCHITECTURE.md](file:///c:/Users/gerar/Desktop/AppGravity/ONG-DONATION-AUDIT/ARCHITECTURE.md).
- **No Cross-Feature Imports**: A feature under `src/features/A` must **never** import from `src/features/B`.
- Promote shared logic to `src/services/` or `src/utils/` and shared UI to `src/components/`.

## Error Handling Policy

- **No Silent Failures**: Never write empty `catch` blocks.
- **User Feedback**: Always provide user-facing feedback for async operations (e.g., loading states, error alerts/notifications).
- **Graceful Degradation**: If an API call fails, handle it gracefully by falling back to safe defaults and displaying descriptive, user-friendly messages.

## Unsafe Code Policy

- **Type Safety**: Avoid using `as any` or `any`. Define interfaces or types for all API payloads and database entities.
- **Dangerous Properties**: Do not use `dangerouslySetInnerHTML` unless rendering sanitized content, and even then, document the security review.
- **React Hooks Rules**: React Hooks must be called unconditionally at the top level of functions. Never call hooks inside loops, conditions, or nested functions.

## Testing & Quality Expectations

- **Unit & Integration Tests**: Every new feature or API method must be accompanied by tests in Vitest and React Testing Library.
- **Test Locations**: Group test files adjacent to the files they test (e.g., `Login.test.tsx` next to `Login.tsx`).
- **Linter & Formatter**: Run `npm run lint` and `npm run format` before finalizing code edits. Ensure there are no warnings or errors.
