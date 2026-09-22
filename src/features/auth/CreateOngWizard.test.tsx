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

    expect(screen.getByText(/1\. Datos Fundamentales del Templo/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Ej\. Iglesia Evangélica Bautista Central/i),
    ).toBeInTheDocument();
  });

  it('validates Step 1 required fields before moving to Step 2', async () => {
    render(
      <MemoryRouter>
        <CreateOngWizard />
      </MemoryRouter>,
    );

    const nextBtn = screen.getByText(/Siguiente: Identificación Legal/i);
    fireEvent.click(nextBtn);

    // Should show error for empty NGO name
    expect(
      await screen.findByText(/Por favor ingresa el nombre de la Iglesia/i),
    ).toBeInTheDocument();
  });

  it('advances through steps and submits 14-day trial ONG creation', async () => {
    const mockCreatedOng = {
      id: 'ong-trial-123',
      nombre: 'Iglesia Evangélica Nueva Vida',
      rif_identificacion: 'En Proceso de Registro',
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
    fireEvent.change(screen.getByPlaceholderText(/Ej\. Iglesia Evangélica Bautista Central/i), {
      target: { value: 'Iglesia Evangélica Nueva Vida' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Ej\. Av\. Andrés Bello/i), {
      target: { value: 'Calle Principal #12' },
    });
    fireEvent.change(screen.getByPlaceholderText(/\+58 412 1234567/i), {
      target: { value: '+584140001122' },
    });

    fireEvent.click(screen.getByText(/Siguiente: Identificación Legal/i));

    // Step 2
    expect(await screen.findByText(/Identificación Legal & Administrador/i)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/María Rodríguez/i), {
      target: { value: 'Carlos Admin' },
    });
    fireEvent.change(screen.getByPlaceholderText(/pastor@iglesia.org/i), {
      target: { value: 'carlos@nuevavida.org' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Mínimo 6 caracteres/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Repite la contraseña/i), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByText(/Siguiente: Identidad & Verificación/i));

    // Step 3
    expect(await screen.findByText(/3\. Identidad Eclesiástica/i)).toBeInTheDocument();

    // Check legal declaration
    const checkLegal = screen.getByRole('checkbox');
    fireEvent.click(checkLegal);

    // Submit form
    fireEvent.click(screen.getByText(/Registrar Iglesia e Iniciar Trial/i));

    await waitFor(() => {
      expect(api.createOng).toHaveBeenCalledWith({
        nombre: 'Iglesia Evangélica Nueva Vida',
        rif_identificacion: 'En Proceso de Registro',
        tipo_organizacion: 'ekklesia',
        direccion:
          'Calle Principal #12, Parroquia Candelaria, Municipio Libertador, Estado Distrito Capital, Venezuela',
        telefono: '+584140001122',
        logoUrl: null,
        pais: 'Venezuela',
        plan: 'trial',
        estado: 'trial',
      });
    });

    // Step 4 (Success screen)
    expect(await screen.findByText(/¡Iglesia Registrada con Éxito!/i)).toBeInTheDocument();
    expect(screen.getByText(/Prueba Completa \(14 días\)/i)).toBeInTheDocument();
  });
});
