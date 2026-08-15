# AI Agent Collaboration & Multi-App Architecture Guide

> **Repository:** `enoc31/MATEO`
> **Target Audience:** AI Coding Assistants (Antigravity, Claude Code, Cursor, Codex, Gemini, ChatGPT) and Human Developers.

---

## 1. Dual-Product System Overview

This repository hosts **two active production applications** built on a unified codebase and connected to a single Supabase backend:

| Property                  | MATEO Humanitaria                         | MATEO ekklesia                         |
| ------------------------- | ----------------------------------------- | -------------------------------------- |
| **Git Production Branch** | `main`                                    | `product/iglesias`                     |
| **Deployed Domain**       | `mateo.app` (Vercel)                      | `www.mateo-ekklesia.com` (Vercel)      |
| **Target Sector**         | ONGs, Foundations, Humanitarian Aid       | Churches, Ministries, Religious Orgs   |
| **Backend Database**      | Supabase (`public.ongs` RLS Multi-tenant) | Supabase (Shared DB, RLS Multi-tenant) |

---

## 2. Commit Tagging & AI Identification Protocol

To ensure transparency and trace which AI agent introduced every code change, **ALL commits made by AI assistants MUST follow this standard format**:

```bash
[AI:<AGENT_NAME>] <type>(<scope>): <short description>
```

### Examples:

- `[AI:Antigravity] feat(landing): adapt landing page messaging to multi-currency concept`
- `[AI:ClaudeCode] fix(incomes): resolve BCV rate conversion rounding error`
- `[AI:Cursor] feat(members): implement 20-field church member registry form`
- `[AI:Codex] refactor(auth): improve session token refresh loop`

---

## 3. Git Branching & Synchronization Strategy

### Rule 1: Working Branch Isolation

**NEVER commit directly to `main` or `product/iglesias`.**
Every AI agent must work on an isolated feature branch named according to the target product:

- **For Humanitaria (ONGs / `main`):**
  `ai-<agent_name>/feat-<feature_name>`  
  _Example:_ `ai-claude/feat-pdf-reports`

- **For ekklesia (Churches / `product/iglesias`):**
  `ai-<agent_name>/ekklesia-<feature_name>`  
  _Example:_ `ai-antigravity/ekklesia-member-form`

### Rule 2: Code Synchronization via `cherry-pick`

- Do **NOT** automatically merge `main` into `product/iglesias` or viceversa.
- When a bug fix or shared feature needs to be shared between both products:
  1. Commit the change on the source product branch.
  2. Switch to the target product branch.
  3. Execute `git cherry-pick <commit-hash>`.

---

## 4. Module Vocabulary Mapping

When adding or modifying components in `product/iglesias`, strictly use the **Church / Religious Lexicon**:

| Concept              | MATEO Humanitaria (`main`)  | MATEO ekklesia (`product/iglesias`)        |
| -------------------- | --------------------------- | ------------------------------------------ |
| **Incomes**          | Ingresos y Donaciones       | Diezmos y Ofrendas                         |
| **Requisitions**     | Requisiciones               | Solicitudes de Compras                     |
| **Expenses**         | Cargar Gastos               | Gastos                                     |
| **Beneficiaries**    | Beneficiarios               | Miembros                                   |
| **Events**           | Jornadas Humanitarias       | Actividades y Eventos Ministeriales        |
| **Partidas Catalog** | Catálogo de Partidas        | Catálogo Ministerial                       |
| **User Roles**       | Director, Auxiliar de Campo | Pastor Principal, Servidor / Voluntario    |
| **Multi-currency**   | Conversión USD / VES        | Gestión Multi-moneda (USD, VES, COP, etc.) |

---

## 5. Technology Stack & Hard Constraints

- **Framework:** React 19 (Functional Components + Hooks).
- **Language:** TypeScript (`strict: true`). **DO NOT use `any`**.
- **Build Tool:** Vite (`npm run build` MUST pass cleanly with 0 TS errors before pushing).
- **Styling:** Vanilla CSS & design tokens in `src/index.css`.
- **Database / Auth:** Supabase JS SDK.
- **Module Boundaries:** Under `src/features/`, features must **NEVER** import directly from other features (`src/features/A` ❌ `src/features/B`). Promote shared code to `src/services/` or `src/components/`.

---

## 6. AI Agent Workflow Checklist

When taking on a task:

1. `git status` & `git branch` — Ensure you know which product (`main` vs `product/iglesias`) you are editing.
2. Checkout your AI feature branch (`ai-<agent>/...`).
3. Make contiguous, modular edits adhering to `ARCHITECTURE.md`.
4. Run `npm run build` — Verify zero TypeScript compilation errors.
5. Commit using the `[AI:<AGENT_NAME>]` tag.
6. Push to `origin <branch-name>` and inform the user.
