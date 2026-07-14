# AI Harness Scorecard: MATEO

**Grade: A** (95.0/100) | Strong harness. AI-generated code has robust mechanical safeguards.

- **Repository**: `/home/runner/work/MATEO/MATEO`
- **Languages**: javascript, typescript
- **Assessed**: 2026-07-14 19:47 UTC
- **Checks**: 31/31 passed

## Summary

| Category                    | Weight | Score             | Checks |
| --------------------------- | ------ | ----------------- | ------ |
| Architectural Documentation | 20%    | 100% [##########] | 5/5    |
| Mechanical Constraints      | 25%    | 100% [##########] | 7/7    |
| Testing & Stability         | 25%    | 86% [#########-]  | 8/8    |
| Review & Drift Prevention   | 15%    | 100% [##########] | 6/6    |
| AI-Specific Safeguards      | 15%    | 90% [#########-]  | 5/5    |

## Architectural Documentation (100%)

### [PASS] Architecture Documentation (5/5)

_matklad ARCHITECTURE.md guide_

**Evidence**: Found: ARCHITECTURE.md

### [PASS] Agent Instructions (5/5)

_OpenAI Harness Engineering (2026)_

**Evidence**: Found: AGENTS.md

### [PASS] Architecture Decision Records (3/3)

_DORA 2025 Report - AI-accessible documentation_

**Evidence**: Found ADR directory: docs/adr

### [PASS] Module Boundary Documentation (4/4)

_matklad ARCHITECTURE.md - constraints as absences_

**Evidence**: Module boundary constraints found in ARCHITECTURE.md

### [PASS] API Documentation (3/3)

_DORA 2025 - AI-accessible documentation_

**Evidence**: API spec found: openapi.json

## Mechanical Constraints (100%)

### [PASS] CI Pipeline (3/3)

_DORA 2025 Report_

**Evidence**: CI detected: github, github

### [PASS] Linter Enforcement (4/4)

_OpenAI Harness Engineering - mechanical constraints_

**Evidence**: Blocking linter found in CI: eslint

### [PASS] Formatter Enforcement (3/3)

_OpenAI Harness Engineering - mechanical constraints_

**Evidence**: Formatter check found in CI: prettier\s+--check

### [PASS] Type Safety (3/3)

_SlopCodeBench - preventing subtle type errors_

**Evidence**: TypeScript strict mode enabled

### [PASS] Dependency Auditing (4/4)

_Blog: security infrastructure reliability_

**Evidence**: Blocking dependency audit in CI: npm\s+audit

### [PASS] Conventional Commits (2/2)

_DORA 2025 - working in small batches_

**Evidence**: Commit lint config found: .commitlintrc.json

### [PASS] Unsafe Code Policy (3/3)

_Blog: 80% problem in AI-generated code_

**Evidence**: ESLint unsafe pattern rules found

## Testing & Stability (86%)

### [PASS] Test Suite (3/3)

_Kent Beck - tests define what correct means_

**Evidence**: Tests present and executed in CI

### [PASS] Feature Matrix Testing (2/3)

_DORA 2025 - stability through comprehensive testing_

**Evidence**: Two test jobs found, consider adding more configurations

**Remediation**: Test with different feature flags, environments, or dependency versions.

### [PASS] Code Coverage (4/4)

_DORA 2025 - stability feedback loops_

**Evidence**: Coverage measurement in CI: coverage\.py|pytest-cov|--cov

### [PASS] Mutation Testing (2/4)

_SlopCodeBench - code that 'appears correct but is unreliable'_

**Evidence**: Mutation testing config found (stryker.conf.json)

**Remediation**: Add mutation testing to CI, even on a scheduled basis.

### [PASS] Property-Based Testing (3/3)

_Blog: catching edge cases in AI-generated code_

**Evidence**: Property-based testing library found in package.json

### [PASS] Fuzz Testing (3/3)

_Blog: 80% problem - catching what AI misses_

**Evidence**: Fuzz testing directory found: fuzz

### [PASS] Contract / Compatibility Tests (3/3)

_OpenAI Harness Engineering - mechanical constraints_

**Evidence**: Contract/compatibility tests found: src/services/**snapshots**/api.snapshot.test.ts.snap, src/services/api.snapshot.test.ts

### [PASS] Tests Block Merge (2/2)

_DORA 2025 - stability metrics_

**Evidence**: All test jobs are blocking: build-and-test, sonar

## Review & Drift Prevention (100%)

### [PASS] Code Review Required (4/4)

_OpenAI Harness Engineering - author/reviewer separation_

**Evidence**: CODEOWNERS file found: .github/CODEOWNERS

### [PASS] Scheduled CI Jobs (3/3)

_OpenAI Harness Engineering - garbage collection agents_

**Evidence**: Scheduled CI pipeline found

### [PASS] Stale Documentation Detection (2/2)

_OpenAI Harness Engineering - quality drift_

**Evidence**: TODO/FIXME scanning found in CI

### [PASS] PR/MR Template (2/2)

_DORA 2025 - working in small batches_

**Evidence**: PR/MR template found: .github/PULL_REQUEST_TEMPLATE.md

### [PASS] Automated Code Review (2/2)

_OpenAI Harness Engineering - separate authoring and reviewing agents_

**Evidence**: Automated review tool configured: .github/dependabot.yml

### [PASS] Documentation Sync Check (2/2)

_OpenAI Harness Engineering - curated knowledge base_

**Evidence**: Doc sync check found in CI: diff\s+.*\.md

## AI-Specific Safeguards (90%)

### [PASS] AI Usage Norms (4/4)

_DORA 2025 - clear organizational stance on AI use_

**Evidence**: AI usage norms found in AGENTS.md

### [PASS] Small Batch Enforcement (3/3)

_DORA 2025 - working in small batches_

**Evidence**: Small batch guidelines found in CONTRIBUTING.md

### [PASS] Design-Before-Code Culture (3/3)

_Blog: cognitive offloading guardrails_

**Evidence**: RFC/design document directory found: docs/rfcs

### [PASS] Error Handling Policy (2/3)

_Blog: AI agents deleting tests, using expect()_

**Evidence**: Error handling guidelines found in AGENTS.md

**Remediation**: Enforce error handling rules mechanically via lints, not just documentation.

### [PASS] Security-Critical Path Marking (2/2)

_Blog: 80% problem in security infrastructure_

**Evidence**: CODEOWNERS found: .github/CODEOWNERS

## References

- Blog: 80% problem - catching what AI misses
- Blog: 80% problem in AI-generated code
- Blog: 80% problem in security infrastructure
- Blog: AI agents deleting tests, using expect()
- Blog: catching edge cases in AI-generated code
- Blog: cognitive offloading guardrails
- Blog: security infrastructure reliability
- DORA 2025 - AI-accessible documentation
- DORA 2025 - clear organizational stance on AI use
- DORA 2025 - stability feedback loops
- DORA 2025 - stability metrics
- DORA 2025 - stability through comprehensive testing
- DORA 2025 - working in small batches
- DORA 2025 Report
- DORA 2025 Report - AI-accessible documentation
- Kent Beck - tests define what correct means
- OpenAI Harness Engineering (2026)
- OpenAI Harness Engineering - author/reviewer separation
- OpenAI Harness Engineering - curated knowledge base
- OpenAI Harness Engineering - garbage collection agents
- OpenAI Harness Engineering - mechanical constraints
- OpenAI Harness Engineering - quality drift
- OpenAI Harness Engineering - separate authoring and reviewing agents
- SlopCodeBench - code that 'appears correct but is unreliable'
- SlopCodeBench - preventing subtle type errors
- matklad ARCHITECTURE.md - constraints as absences
- matklad ARCHITECTURE.md guide

---

_Generated by [ai-harness-scorecard](https://github.com/markmishaev/ai-harness-scorecard)_
