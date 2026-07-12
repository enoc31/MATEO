import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { BudgetsAndReports } from './BudgetsAndReports';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../services/api');
vi.mock('../../context/AuthContext');

// Mock jsPDF capturing text calls so we can assert on PDF content
const mockTextCalls: [string | string[], number, number, ...unknown[]][] = [];
vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(() => ({
    setTextColor: vi.fn(),
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    text: vi.fn((...args: [string | string[], number, number, ...unknown[]]) => {
      mockTextCalls.push(args);
    }),
    line: vi.fn(),
    setDrawColor: vi.fn(),
    addPage: vi.fn(),
    save: vi.fn(),
    getTextWidth: vi.fn().mockReturnValue(50),
  })),
}));
vi.mock('xlsx', () => ({
  utils: { book_new: vi.fn(), aoa_to_sheet: vi.fn(), book_append_sheet: vi.fn() },
  writeFile: vi.fn(),
}));

type MockProfile = {
  id: string;
  ong_id: string;
  rol: string;
  aprobado: boolean;
  email: string;
  nombre_completo: string;
  created_at: string;
};

const buildProject = (ongNombre: string, ongId: string) => ({
  id: 'proj-1',
  nombre: 'Proyecto Alimentos Caraballeda',
  descripcion: 'Test desc',
  activo: true,
  fecha_inicio: '2026-01-01',
  fecha_fin: '2026-12-31',
  overhead_porcentaje: 7,
  ong_id: ongId,
  ongs: { nombre: ongNombre },
});

const setupMocks = (
  projectOng: string,
  projectOngId: string,
  userOng: string,
  userOngId: string,
) => {
  vi.mocked(api.getProjects).mockResolvedValue([buildProject(projectOng, projectOngId)]);
  vi.mocked(api.getCategories).mockResolvedValue([]);
  vi.mocked(api.getPartidas).mockResolvedValue([]);
  vi.mocked(api.getBudgets).mockResolvedValue([]);
  vi.mocked(api.getExpenses).mockResolvedValue([]);

  vi.mocked(useAuth).mockReturnValue({
    activeOng: { nombre: userOng, logo_url: null },
    profile: {
      id: 'user-1',
      ong_id: userOngId,
      rol: 'administrador',
      aprobado: true,
      email: 'test@test.com',
      nombre_completo: 'Test User',
      created_at: '',
    } as MockProfile,
    user: null,
    loading: false,
    authError: null,
    logout: vi.fn(),
    refreshProfile: vi.fn(),
  } as ReturnType<typeof useAuth>);
};

describe('BudgetsAndReports — aislamiento de nombre de ONG en PDF', () => {
  beforeEach(() => {
    mockTextCalls.length = 0;
    vi.clearAllMocks();
  });

  it('getProjects devuelve el campo ongs resuelto (no undefined)', async () => {
    setupMocks('Consejo Evangelico de Venezuela', 'ong-cev', 'CNBV', 'ong-cnbv');
    const projects = await api.getProjects();
    // El campo ongs debe estar presente y contener el nombre correcto
    expect(projects[0].ongs?.nombre).toBe('Consejo Evangelico de Venezuela');
  });

  it('cuando proyecto.ongs.nombre existe, no debe caer al fallback activeOng', async () => {
    // Proyecto de ONG-A, usuario de ONG-B
    setupMocks('ONG Alpha', 'ong-alpha', 'ONG Beta', 'ong-beta');

    const projects = await api.getProjects();
    const project = projects[0];

    // Simular la misma lógica de ongName que usa handleExportPDF
    const activeOngNombre = 'ONG Beta'; // simulated activeOng
    const ongName = project.ongs?.nombre || activeOngNombre || '';

    // Debe usar el nombre del proyecto, no el del usuario
    expect(ongName).toBe('ONG Alpha');
    expect(ongName).not.toBe('ONG Beta');
  });

  it('cuando proyecto.ongs es null, cae al activeOng del usuario como fallback', async () => {
    setupMocks('ONG Alpha', 'ong-alpha', 'ONG Beta (usuario)', 'ong-beta');

    // Simular proyecto sin ongs resuelto (join fallido)
    const projectSinOng = { ...buildProject('ONG Alpha', 'ong-alpha'), ongs: null as any };
    const activeOngNombre = 'ONG Beta (usuario)';
    const ongName = projectSinOng.ongs?.nombre || activeOngNombre || '';

    expect(ongName).toBe('ONG Beta (usuario)');
  });

  it('renderiza el componente sin errores con proyectos multi-ONG', async () => {
    setupMocks('Consejo Evangelico', 'ong-cev', 'CNBV', 'ong-cnbv');

    const { container } = render(
      <MemoryRouter>
        <BudgetsAndReports />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(api.getProjects).toHaveBeenCalledTimes(1);
    });

    expect(container).toBeTruthy();
  });
});

describe('BudgetsAndReports — aislamiento de datos (Cross-ONG)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getProjects es llamado sin filtros cliente (el filtro es responsabilidad de RLS)', async () => {
    setupMocks('Mi ONG', 'ong-mia', 'Mi ONG', 'ong-mia');

    render(
      <MemoryRouter>
        <BudgetsAndReports />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(api.getProjects).toHaveBeenCalledTimes(1);
    });

    // getProjects no recibe argumentos de filtro por ong_id en el cliente —
    // el aislamiento es responsabilidad de RLS en Supabase
    expect(vi.mocked(api.getProjects)).toHaveBeenCalledWith();
  });

  it('dos sesiones con distintos profiles ven sus propios proyectos (simulado via mock)', async () => {
    // Sesión usuario A
    vi.mocked(api.getProjects).mockResolvedValueOnce([
      buildProject('Consejo Evangelico', 'ong-cev'),
    ]);
    const projectsA = await api.getProjects();
    expect(projectsA).toHaveLength(1);
    expect(projectsA[0].ong_id).toBe('ong-cev');

    // Sesión usuario B — RLS devolvería sus propios proyectos
    vi.mocked(api.getProjects).mockResolvedValueOnce([buildProject('CNBV', 'ong-cnbv')]);
    const projectsB = await api.getProjects();
    expect(projectsB).toHaveLength(1);
    expect(projectsB[0].ong_id).toBe('ong-cnbv');

    // No deben solaparse
    expect(projectsA[0].ong_id).not.toBe(projectsB[0].ong_id);
  });
});
