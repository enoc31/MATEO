# AI Agent Instructions (AGENTS.md)

Welcome! You are an AI assistant helping developers build, optimize, and maintain the `ong-donation-audit` application. To ensure code quality, security, and stability, you must strictly adhere to the following project-specific guidelines.

## Tech Stack & Code Style

- **Framework**: React 19 (using functional components and hooks).
- **Language**: TypeScript (enforce strict typing; avoid the `any` type).
- **Build Tool**: Vite.
- **Styling**: Vanilla CSS (modular and scoped where possible) and UI styling rules in `src/index.css`.
- **Database / Auth**: Supabase JS SDK.
- **UI/UX Intelligence**: `ui-ux-pro-max` skill (located in `.agents/skills/ui-ux-pro-max/`). Use it for interface decisions, accessible financial data presentation, and interaction design.

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
- **End-to-End Tests (Playwright)**: Critical user flows are covered by Playwright specs under `e2e/` (`npm run test:e2e` headless, `npm run test:e2e:ui` interactive). Keep E2E specs isolated from `src/` unit tests and compatible with simulation mode.
- **Linter & Formatter**: Run `npm run lint` and `npm run format` before finalizing code edits. Ensure there are no warnings or errors.

## Git Branching, Pull Requests & Spec-Driven Workflow

- **No Direct Pushes to `main` or `develop`**: AI agents and developers must **never** commit or push directly to `main` (production) or `develop` (integration).
- **Short-Lived Working Branches**: Always create a descriptive branch from `develop` before making changes:
  - `feature/<short-name>` for new features or modules.
  - `fix/<short-name>` for bug fixes.
  - `chore/<short-name>` for tooling, CI, or documentation updates.
- **Spec Before Code**: Before implementing a new module or complex feature, use the `/grill-me` and `/to-spec` skills (`.agents/skills/grill-me/`, `.agents/skills/to-spec/`) to interview the user, resolve edge cases, and synthesize a clear specification.
- **Pull Request Flow & Merge Strategy**:
  1. Push the working branch to `origin` and open a Pull Request targeting `develop` (link related GitHub Issues with `Closes #N` when applicable).
  2. Ensure all CI checks (`build-and-test`, `sonar`, `e2e`) pass before merging.
  3. Merge `feature/*` → `develop` using **Squash and merge**, and delete the working branch after merging.
  4. Promote changes to production by opening a Pull Request from `develop` → `main` and merging with **Create a merge commit** (never Squash merge `develop` into `main`, so both branches keep a shared commit history).

## AI Agents Registry & Slack Synchronization Protocol

- **Mandatory Canvas Update**: Whenever a new AI agent, subagent, or automated service is created or added to this project:
  1. Register the new agent with its name, emoji, Role, and Key Functions in `scripts/sync-agents-canvas.cjs` (in `AGENTS_REGISTRY`).
  2. Execute `node scripts/sync-agents-canvas.cjs` to automatically synchronize and update the Slack Canvas tab **"Agentes y Funciones"** (Canvas ID: `F0CBW49L21K` in channel `#agents` / `C0CBV626CLB`).
  3. Inform the team in Slack or conversation summary about the updated documentation in the Canvas tab.
