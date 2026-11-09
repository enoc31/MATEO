import { describe, it, expect } from 'vitest';
// @ts-expect-error cjs import
import mateoReporter from '../../scripts/mateo-commits-reporter.cjs';

const {
  getLatestValidCommit,
  analyzeCommit,
  correlateWithQaReviews,
  buildCommitReportMessage,
  QA_CHECKLIST_KNOWLEDGE,
} = mateoReporter;

describe('Mateo Commits Reporter', () => {
  it('QA_CHECKLIST_KNOWLEDGE contains the key categories from #qa-reviews', () => {
    expect(Array.isArray(QA_CHECKLIST_KNOWLEDGE)).toBe(true);
    const categoryNames = QA_CHECKLIST_KNOWLEDGE.map((c: { categoria: string }) => c.categoria);
    expect(categoryNames).toContain('Terminología y UI Global');
    expect(categoryNames).toContain('Formulario: Datos de Congregación y Administrador');
    expect(categoryNames).toContain('Registro y Gestión de Miembros');
    expect(categoryNames).toContain('Archivos, Imágenes y Fechas');
    expect(categoryNames).toContain('Integridad de Datos y Arquitectura');
    expect(categoryNames).toContain('Seguridad, Acceso y Autenticación');
  });

  it('getLatestValidCommit retrieves a valid git commit from the repository', () => {
    const commit = getLatestValidCommit();
    expect(commit).toBeDefined();
    expect(commit.isValid).toBe(true);
    expect(typeof commit.hash).toBe('string');
    expect(commit.hash.length).toBe(40);
    expect(typeof commit.shortHash).toBe('string');
    expect(typeof commit.author).toBe('string');
    expect(typeof commit.subject).toBe('string');
    expect(typeof commit.branch).toBe('string');
  }, 15000);

  it('analyzeCommit correctly parses a "fix" commit as a bug fix', () => {
    const mockCommit = {
      isValid: true,
      hash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      shortHash: 'a1b2c3d',
      author: 'Test Dev',
      date: '2026-10-25 20:00:00',
      subject: 'fix(auth): fix typescript types in test and handle timezone utc error',
      body: 'Resolves issue with date conversion',
      branch: 'main',
      stats: '1 file changed',
      filesChanged: ['src/features/auth/Login.tsx'],
    };

    const analysis = analyzeCommit(mockCommit);
    expect(analysis.type).toBe('fix');
    expect(analysis.scope).toBe('auth');
    expect(analysis.description).toContain('AUTH');
    expect(analysis.bugsFixed.length).toBeGreaterThan(0);
    expect(
      analysis.bugsFixed.some((b: string) => b.includes('TypeScript') || b.includes('UTC')),
    ).toBe(true);
  });

  it('analyzeCommit correctly parses a "feat" commit as a new feature', () => {
    const mockCommit = {
      isValid: true,
      hash: 'b1c2d3e4f5a6b1c2d3e4f5a6b1c2d3e4f5a6b1c2',
      shortHash: 'b1c2d3e',
      author: 'Test Dev',
      date: '2026-10-25 20:00:00',
      subject: 'feat(auth): enable password recovery and forgot password flow',
      body: 'Adds recovery email view and token processing',
      branch: 'product/iglesias',
      stats: '2 files changed',
      filesChanged: ['src/features/auth/ForgotPassword.tsx', 'src/features/saas/SaasLogin.tsx'],
    };

    const analysis = analyzeCommit(mockCommit);
    expect(analysis.type).toBe('feat');
    expect(analysis.scope).toBe('auth');
    expect(analysis.newFeatures.length).toBeGreaterThan(0);
    expect(
      analysis.newFeatures.some((f: string) => f.includes('recuperación de contraseñas')),
    ).toBe(true);
  });

  it('correlateWithQaReviews matches checklist requirements when commit keywords overlap', async () => {
    const mockCommit = {
      isValid: true,
      hash: 'c1d2e3f4a5b6c1d2e3f4a5b6c1d2e3f4a5b6c1d2',
      shortHash: 'c1d2e3f',
      author: 'Test Dev',
      date: '2026-10-25 20:00:00',
      subject: 'feat(beneficiaries): make cedula immutable and validate +58 phone',
      body: 'Ensures baptism and members registry compliance',
      branch: 'product/iglesias',
      stats: '3 files changed',
      filesChanged: ['src/features/beneficiaries/BeneficiaryForm.tsx'],
    };

    const analysis = analyzeCommit(mockCommit);
    const correlation = await correlateWithQaReviews(mockCommit, analysis);

    expect(correlation.solvesQaRequirement).toBe(true);
    expect(correlation.categories).toContain('Registro y Gestión de Miembros');
    expect(correlation.items.length).toBeGreaterThan(0);
  });

  it('correlateWithQaReviews gracefully reports non-overlapping commits', async () => {
    const mockCommit = {
      isValid: true,
      hash: 'd1e2f3a4b5c6d1e2f3a4b5c6d1e2f3a4b5c6d1e2',
      shortHash: 'd1e2f3a',
      author: 'Test Dev',
      date: '2026-10-25 20:00:00',
      subject: 'chore(build): update bundle size script',
      body: 'Minor build tweak',
      branch: 'main',
      stats: '1 file changed',
      filesChanged: ['scripts/bundle.js'],
    };

    const analysis = analyzeCommit(mockCommit);
    const correlation = await correlateWithQaReviews(mockCommit, analysis);

    expect(correlation.solvesQaRequirement).toBe(false);
    expect(correlation.summary).toContain('Relación con #qa-reviews');
  });

  it('buildCommitReportMessage creates formatted message with Slack Block Kit structure', async () => {
    const message = await buildCommitReportMessage();
    expect(message).toBeDefined();
    expect(message.text).toContain('Reporte Diario de Commits — Agente Mateo');
    expect(Array.isArray(message.blocks)).toBe(true);
    expect(message.blocks.length).toBeGreaterThanOrEqual(5);

    // Verify header block
    expect(message.blocks[0].type).toBe('header');
    expect(message.blocks[0].text.text).toContain('Reporte Diario de Commits — Agente Mateo');
  }, 15000);
});
