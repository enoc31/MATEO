## Description

Provide a brief description of the changes introduced by this pull request and the problems they solve.

## Linked Issues

Fixes # (issue number)

## Type of Change

- [ ] `feat` (new feature)
- [ ] `fix` (bug fix)
- [ ] `docs` (documentation change)
- [ ] `refactor` (code refactoring)
- [ ] `style` (formatting/linting)
- [ ] `test` (adding/updating tests)
- [ ] `chore` (maintenance, dependencies)

## Quality Gates Checklist

Before submitting this PR, please check all the following:

- [ ] **Small Batch Size**: This PR changes fewer than 300 lines of code (excluding lockfiles/dependencies).
- [ ] **Lint & Format**: Running `npm run lint` and `npm run format:check` reports 0 errors and 0 warnings.
- [ ] **Tests**: Running `npm run test:coverage` completes successfully and coverage has not decreased.
- [ ] **Type Safety**: The project builds successfully with no TypeScript errors (`tsc -b`).
- [ ] **Module Boundaries**: Changes adhere to the constraints defined in `ARCHITECTURE.md` (no cross-feature imports).
- [ ] **Documentation Sync**: Relevant documentation (`README.md`, `ARCHITECTURE.md`, or `AGENTS.md`) has been updated to reflect these changes.
- [ ] **Security**: No hardcoded API keys/credentials, and any database schema change includes Row Level Security (RLS) policies.
