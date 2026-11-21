import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MembersDataTable } from './MembersDataTable';
import type { Beneficiary } from '../../services/api';

const sampleMembers: Beneficiary[] = [
  {
    id: 'mem-1',
    jornada_id: 'jor-1',
    url_firma: null,
    created_at: '2026-11-21T00:00:00Z',
    nombre: 'Ricardo',
    apellido: 'Flores',
    cedula: 'V-21651947',
    sexo: 'Masculino',
    fecha_nacimiento: '1992-09-07',
    email: 'ricardo@iglesia.org',
    telefono: '0414-1234567',
    bautizado: true,
    cargo_eclesiastico: 'PASTOR / OBISPO O SIMILAR',
    areas_ministeriales: ['PROCLAMACIÓN'],
    direccion: 'Los Teques, Miranda',
    grado_instruccion: 'Universitario',
  },
  {
    id: 'mem-2',
    jornada_id: 'jor-1',
    url_firma: null,
    created_at: '2026-11-21T00:00:00Z',
    nombre: 'María',
    apellido: 'Gómez',
    cedula: 'V-18456123',
    sexo: 'Femenino',
    fecha_nacimiento: '1995-04-12',
    email: 'maria@iglesia.org',
    telefono: '0412-7654321',
    bautizado: false,
    cargo_eclesiastico: 'MIEMBRO GENERAL',
  },
];

describe('MembersDataTable', () => {
  const defaultProps = {
    members: sampleMembers,
    searchTerm: '',
    onSearchChange: vi.fn(),
    cargoFilter: 'todos',
    onCargoFilterChange: vi.fn(),
    bautizadoFilter: 'todos',
    onBautizadoFilterChange: vi.fn(),
    pageSize: 10,
    onPageSizeChange: vi.fn(),
    currentPage: 1,
    onPageChange: vi.fn(),
    onViewProfile: vi.fn(),
    onEditMember: vi.fn(),
  };

  it('renders rows, status pills, and summary count', () => {
    render(<MembersDataTable {...defaultProps} />);

    expect(screen.getByText('Ricardo Flores')).toBeInTheDocument();
    expect(screen.getByText('María Gómez')).toBeInTheDocument();
    expect(screen.getByText('PASTOR / OBISPO O SIMILAR')).toBeInTheDocument();
    expect(screen.getByText('1-2 de 2')).toBeInTheDocument();
  });

  it('filters rows by tab selection and expands row details', () => {
    render(<MembersDataTable {...defaultProps} />);

    // Cambiar a pestaña "Por Bautizar"
    fireEvent.click(screen.getByRole('tab', { name: 'Por Bautizar' }));
    expect(screen.queryByText('Ricardo Flores')).not.toBeInTheDocument();
    expect(screen.getByText('María Gómez')).toBeInTheDocument();

    // Volver a "Todos" y expandir detalle de Ricardo
    fireEvent.click(screen.getByRole('tab', { name: 'Todos' }));
    fireEvent.click(screen.getByRole('button', { name: /Ver detalle rápido de Ricardo/i }));
    expect(screen.getByText('Los Teques, Miranda')).toBeInTheDocument();
    expect(screen.getByText('PROCLAMACIÓN')).toBeInTheDocument();
  });

  it('triggers view profile and checkbox selection', () => {
    const onViewProfile = vi.fn();
    render(<MembersDataTable {...defaultProps} onViewProfile={onViewProfile} />);

    fireEvent.click(screen.getByRole('checkbox', { name: /Seleccionar a Ricardo Flores/i }));
    expect(screen.getByText('1 seleccionado(s)')).toBeInTheDocument();

    const viewButtons = screen.getAllByRole('button', { name: 'Ver más' });
    fireEvent.click(viewButtons[0]);
    expect(onViewProfile).toHaveBeenCalledWith(sampleMembers[0]);
  });

  it('filters rows by searchTerm, cargoFilter, and bautizadoFilter', () => {
    const { rerender } = render(<MembersDataTable {...defaultProps} searchTerm="María Gómez" />);
    expect(screen.getByText('María Gómez')).toBeInTheDocument();
    expect(screen.queryByText('Ricardo Flores')).not.toBeInTheDocument();

    rerender(
      <MembersDataTable
        {...defaultProps}
        searchTerm=""
        cargoFilter="PASTOR / OBISPO O SIMILAR"
        bautizadoFilter="todos"
      />,
    );
    expect(screen.getByText('Ricardo Flores')).toBeInTheDocument();
    expect(screen.queryByText('María Gómez')).not.toBeInTheDocument();

    rerender(
      <MembersDataTable
        {...defaultProps}
        searchTerm=""
        cargoFilter="todos"
        bautizadoFilter="no_bautizado"
      />,
    );
    expect(screen.getByText('María Gómez')).toBeInTheDocument();
    expect(screen.queryByText('Ricardo Flores')).not.toBeInTheDocument();
  });
});
