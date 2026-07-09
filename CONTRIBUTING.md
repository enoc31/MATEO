# Contributing Guidelines (CONTRIBUTING.md)

Thank you for contributing to the `ong-donation-audit` project. To ensure a stable and scalable codebase, please follow these guidelines when creating pull requests (PRs) or committing changes.

## Conventional Commits

We enforce the Conventional Commits specification for all commit messages. This helps maintain a clean, readable Git history and supports automated changelog generation.

Format: `<type>(<scope>): <description>`

Common types:

- `feat`: A new feature for the user.
- `fix`: A bug fix for the user.
- `docs`: Changes to documentation (like `README.md` or `ARCHITECTURE.md`).
- `style`: Code formatting changes (semi-colons, spaces) that do not affect logic.
- `refactor`: Code changes that neither fix a bug nor add a feature (e.g., restructuring).
- `test`: Adding or updating tests.
- `chore`: Maintainance work (dependency updates, build configurations, CI updates).

Example: `feat(auth): add automatic session expiration redirect`

## Small Batch Size Policy (PR Limits)

- To keep code reviews effective and prevent bugs, keep pull requests small.
- **Maximum size limit**: A PR should ideally modify **fewer than 300 lines of code** (excluding auto-generated lockfiles or test assets).
- If your task requires major changes, split them into smaller, independent PRs (e.g., define database schema and api methods in PR 1, build UI components in PR 2).
- Large AI-generated PRs are harder to audit and are subject to immediate rejection.

## AI Co-Pilot & Agent Usage Norms

If you use AI coding assistants (like Cursor, Gemini, Claude, or Copilot):

1. **Design Before Coding**: Always plan out your design or architecture before writing code. Check [ARCHITECTURE.md](file:///c:/Users/gerar/Desktop/AppGravity/ONG-DONATION-AUDIT/ARCHITECTURE.md) to respect module boundaries.
2. **Review Generated Code**: Thoroughly read and test all code written by AI agents. Do not accept code you do not fully understand.
3. **Automated Checks**: You must run linting, formatting, and unit tests locally before pushing:
   ```bash
   npm run format
   npm run lint
   npm run test:coverage
   ```
4. **Self-Review Checklist**: Verify your changes against the checklist in the PR template.
