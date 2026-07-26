import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CreateOngWizard } from './CreateOngWizard';
import { api } from '../../services/api';

vi.mock('../../services/api', async () => {
  const actual: any = await vi.importActual('../../services/api');
  return {
    ...actual,
    isSimulationMode: true,
    api: {
      ...actual.api,
      createOng: vi.fn(),
    },
  };
});

describe('CreateOngWizard Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders Step 1 (ONG Legal Data) correctly', () => {
    render(
      <MemoryRouter>
        <CreateOngWizard />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Datos Legales de la Organización/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Fundación Manos de Esperanza/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/J-12345678-9/i)).toBeInTheDocument();
  });

  it('validates Step 1 required fields before moving to Step 2', async () => {
    render(
      <MemoryRouter>
        <CreateOngWizard />
      </MemoryRouter>,
    );

    const nextBtn = screen.getByText(/Siguiente: Administrador/i);
    fireEvent.click(nextBtn);

    // Should show error for empty NGO name
    expect(await screen.findByText(/ingresa el nombre legal/i)).toBeInTheDocument();
  });

  it('advances through steps and submits 14-day trial ONG creation', async () => {
    const mockCreatedOng = {
      id: 'ong-trial-123',
      nombre: 'Fundación Nueva Vida',
      rif_identificacion: 'J-99887766-0',
      plan: 'trial',
      estado: 'trial',
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    };

    (api.createOng as any).mockResolvedValue(mockCreatedOng);

    render(
      <MemoryRouter>
        <CreateOngWizard />
      </MemoryRouter>,
    );

    // Fill Step 1
    fireEvent.change(screen.getByPlaceholderText(/Fundación Manos de Esperanza/i), {
      target: { value: 'Fundación Nueva Vida' },
    });
    fireEvent.change(screen.getByPlaceholderText(/J-12345678-9/i), {
      target: { value: 'J-99887766-0' },
    });
    fireEvent.change(screen.getByPlaceholderText(/\+58 412 1234567/i), {
      target: { value: '+584140001122' },
    });

    fireEvent.click(screen.getByText(/Siguiente: Administrador/i));

    // Step 2
    expect(await screen.findByText(/Datos del Administrador Principal/i)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/María Rodríguez/i), {
      target: { value: 'Carlos Admin' },
    });
    fireEvent.change(screen.getByPlaceholderText(/direccion@fundacion.org/i), {
      target: { value: 'carlos@nuevavida.org' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Mínimo 6 caracteres/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Repite la contraseña/i), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByText(/Siguiente: Verificación/i));

    // Step 3
    expect(
      await screen.findByText(/Verificación de Seguridad y Confirmación/i),
    ).toBeInTheDocument();

    // Check legal declaration
    const checkLegal = screen.getByRole('checkbox');
    fireEvent.click(checkLegal);

    // Submit form
    fireEvent.click(screen.getByText(/Crear ONG e Iniciar Trial/i));

    await waitFor(() => {
      expect(api.createOng).toHaveBeenCalledWith({
        nombre: 'Fundación Nueva Vida',
        rif_identificacion: 'J-99887766-0',
        pais: 'Venezuela',
        telefono: '+584140001122',
        direccion: null,
        sitio_web: null,
        plan: 'trial',
        estado: 'trial',
      });
    });

    // Step 4 (Success screen)
    expect(await screen.findByText(/Organización Creada Exitosamente/i)).toBeInTheDocument();
    expect(screen.getByText(/Prueba Completa \(14 días\)/i)).toBeInTheDocument();
  });
});
