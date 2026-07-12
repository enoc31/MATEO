import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateProjectModal } from './CreateProjectModal';
import { api } from '../../services/api';

vi.mock('../../services/api', () => ({
  api: {
    getDonantes: vi.fn(),
    createDonante: vi.fn(),
  },
  isSimulationMode: true,
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    profile: { ong_id: 'ong-test-cnbv', rol: 'administrador', aprobado: true },
    activeOng: { nombre: 'ONG Test', logo_url: null },
    user: null,
    loading: false,
    authError: null,
    logout: vi.fn(),
    refreshProfile: vi.fn(),
  }),
}));

describe('CreateProjectModal (Donor Registration)', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();

    (api.getDonantes as any).mockResolvedValue([
      {
        id: 'don-1',
        nombre: 'Donante Existente 1',
        tipo: 'nacional',
        pais: 'Venezuela',
        activo: true,
      },
      {
        id: 'don-2',
        nombre: 'Donante Existente 2',
        tipo: 'extranjero',
        pais: 'Estados Unidos',
        activo: true,
      },
    ]);
  });

  it('renders default list of donors and allows selection', async () => {
    render(<CreateProjectModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    // Wait for the donors to load
    await waitFor(() => {
      expect(screen.getByText('Donante Existente 1')).toBeInTheDocument();
      expect(screen.getByText('Donante Existente 2')).toBeInTheDocument();
    });

    // Select the first donor
    const donor1Button = screen.getByText('Donante Existente 1').closest('button');
    expect(donor1Button).toBeInTheDocument();
    await userEvent.click(donor1Button!);

    // Check that selected donor message appears
    expect(screen.getByText(/Financiado por:/i)).toBeInTheDocument();
    expect(screen.getAllByText('Donante Existente 1').length).toBeGreaterThanOrEqual(1);
  });

  it('toggles the inline donor form when clicking "+ Nuevo Donante"', async () => {
    render(<CreateProjectModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    // Wait for donors load
    await screen.findByText('Donante Existente 1');

    // Find and click the "+ Nuevo Donante" button
    const addNewBtn = screen.getByRole('button', { name: /Nuevo Donante/i });
    expect(addNewBtn).toBeInTheDocument();
    await userEvent.click(addNewBtn);

    // Form should show header
    expect(screen.getByText('Registrar Nuevo Donante')).toBeInTheDocument();

    // Inputs should be visible
    expect(screen.getByLabelText(/Nombre del Donante/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tipo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/País/i)).toBeInTheDocument();

    // Clicking cancel should hide the form and show the donor list again
    const cancelBtn = screen.getByRole('button', { name: /Cancelar creación de donante/i });
    await userEvent.click(cancelBtn);

    expect(screen.queryByText('Registrar Nuevo Donante')).not.toBeInTheDocument();
    expect(screen.getByText('Donante Existente 1')).toBeInTheDocument();
  });

  it('shows validation error if donor name is missing', async () => {
    render(<CreateProjectModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    await screen.findByText('Donante Existente 1');

    const addNewBtn = screen.getByRole('button', { name: /Nuevo Donante/i });
    await userEvent.click(addNewBtn);

    // Try to save empty donor
    const saveBtn = screen.getByRole('button', { name: /Guardar Donante/i });
    await userEvent.click(saveBtn);

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/El nombre del donante es obligatorio/i)).toBeInTheDocument();
    });

    expect(api.createDonante).not.toHaveBeenCalled();
  });

  it('successfully creates and selects a new local donor', async () => {
    const mockNewDonor = {
      id: 'don-new-123',
      nombre: 'Nuevo Donante Organico',
      tipo: 'nacional',
      pais: 'Venezuela',
      activo: true,
    };
    (api.createDonante as any).mockResolvedValue(mockNewDonor);

    render(<CreateProjectModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    await screen.findByText('Donante Existente 1');

    const addNewBtn = screen.getByRole('button', { name: /Nuevo Donante/i });
    await userEvent.click(addNewBtn);

    // Fill in donor form
    const nameInput = screen.getByLabelText(/Nombre del Donante/i);
    await userEvent.type(nameInput, 'Nuevo Donante Organico');

    const saveBtn = screen.getByRole('button', { name: /Guardar Donante/i });
    await userEvent.click(saveBtn);

    // Check api call — now includes ong_id as second arg (defense-in-depth)
    await waitFor(() => {
      expect(api.createDonante).toHaveBeenCalledWith(
        {
          nombre: 'Nuevo Donante Organico',
          tipo: 'nacional',
          pais: 'Venezuela',
          contacto: undefined,
          email: undefined,
          activo: true,
        },
        'ong-test-cnbv',
      );
    });

    // Form should hide, new donor should be in the list, and select message should show it selected
    await waitFor(() => {
      expect(screen.queryByText('Registrar Nuevo Donante')).not.toBeInTheDocument();
      expect(screen.getAllByText('Nuevo Donante Organico').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Financiado por:/i)).toBeInTheDocument();
    });
  });

  it('successfully creates and selects an extranjero donor with custom country', async () => {
    const mockNewDonor = {
      id: 'don-ext-123',
      nombre: 'USA Donor Agency',
      tipo: 'extranjero',
      pais: 'Estados Unidos',
      contacto: 'Alice',
      email: 'alice@usa.gov',
      activo: true,
    };
    (api.createDonante as any).mockResolvedValue(mockNewDonor);

    render(<CreateProjectModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    await screen.findByText('Donante Existente 1');

    const addNewBtn = screen.getByRole('button', { name: /Nuevo Donante/i });
    await userEvent.click(addNewBtn);

    // Fill form
    const nameInput = screen.getByLabelText(/Nombre del Donante/i);
    await userEvent.type(nameInput, 'USA Donor Agency');

    // Change type to extranjero
    const tipoSelect = screen.getByLabelText(/Tipo/i);
    fireEvent.change(tipoSelect, { target: { value: 'extranjero' } });

    // Change country to Estados Unidos
    const paisSelect = screen.getByLabelText(/País/i);
    fireEvent.change(paisSelect, { target: { value: 'Estados Unidos' } });

    // Fill optional contact fields
    const contactoInput = screen.getByPlaceholderText('Ej: John Doe');
    await userEvent.type(contactoInput, 'Alice');

    const emailInput = screen.getByPlaceholderText('Ej: john.doe@agency.org');
    await userEvent.type(emailInput, 'alice@usa.gov');

    const saveBtn = screen.getByRole('button', { name: /Guardar Donante/i });
    await userEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.createDonante).toHaveBeenCalledWith(
        {
          nombre: 'USA Donor Agency',
          tipo: 'extranjero',
          pais: 'Estados Unidos',
          contacto: 'Alice',
          email: 'alice@usa.gov',
          activo: true,
        },
        'ong-test-cnbv',
      );
    });
  });
});
