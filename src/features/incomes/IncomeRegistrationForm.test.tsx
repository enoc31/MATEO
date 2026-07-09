import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { IncomeRegistrationForm } from './IncomeRegistrationForm';
import { api } from '../../services/api';

vi.mock('../../services/api', () => ({
  api: {
    getProjects: vi.fn(),
    getDonantes: vi.fn(),
    getBankTransactions: vi.fn(),
    getTasasBCV: vi.fn(),
    getTasaByDate: vi.fn(),
    saveDonacion: vi.fn(),
  }
}));

describe('Income Math & Validation (IncomeRegistrationForm.tsx)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    
    // Mocks por defecto
    (api.getProjects as any).mockResolvedValue([{ id: 'p1', nombre: 'Proyecto Test', activo: true }]);
    (api.getDonantes as any).mockResolvedValue([{ id: 'd1', nombre_institucion: 'Donante Test' }]);
    (api.getBankTransactions as any).mockResolvedValue([]);
    (api.getTasasBCV as any).mockResolvedValue([{ fecha: '2023-01-01', tasa: 40 }]);
  });

  it('calculates USD value correctly based on BCV rate when VES is selected', async () => {
    // Configuramos una tasa del BCV específica de 40 Bs/$
    (api.getTasaByDate as any).mockResolvedValue({ tasa: 40 });

    render(
      <MemoryRouter>
        <IncomeRegistrationForm />
      </MemoryRouter>
    );

    // Esperamos que termine de cargar
    await waitFor(() => {
      expect(screen.queryByText(/Cargando datos/i)).not.toBeInTheDocument();
    });

    // Seleccionamos Moneda = VES (es un botón, no un select)
    const vesButton = screen.getByText(/Bolívares \(VES\)/i);
    fireEvent.click(vesButton);

    // Introducimos un monto de 400 Bs
    // Hay dos spinbuttons (el monto y la tasa manual), agarramos el primero
    const spinbuttons = screen.getAllByRole('spinbutton');
    const montoInput = spinbuttons[0];
    await userEvent.type(montoInput, '400');

    // Dado que la tasa BCV es 40, el equivalente en USD debería ser $10.00
    // En el componente se muestra "Equivalente: USD 10,00" o similar por el Intl.NumberFormat('es-VE')
    await waitFor(() => {
      expect(screen.getByText(/10[.,]00/)).toBeInTheDocument();
    });
  });

  it('blocks submission if required fields are missing', async () => {
    render(<MemoryRouter><IncomeRegistrationForm /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.queryByText(/Cargando datos/i)).not.toBeInTheDocument();
    });

    // Intentar guardar sin haber rellenado nada
    const saveButton = screen.getByRole('button', { name: /Guardar y Finalizar Ingreso/i });
    fireEvent.click(saveButton);

    // Como es tipo 'button' (o 'submit' prevenido por validaciones en el componente),
    // comprobamos que el API NO fue llamado
    expect(api.saveDonacion).not.toHaveBeenCalled();
  });
});
