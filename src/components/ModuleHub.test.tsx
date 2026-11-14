import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ModuleHub } from './ModuleHub';

describe('ModuleHub', () => {
  it('muestra el título, la descripción y el aviso de estado', () => {
    render(
      <MemoryRouter>
        <ModuleHub
          title="Inventario"
          description="Bienes de la iglesia."
          statusNote="En desarrollo"
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Inventario' })).toBeInTheDocument();
    expect(screen.getByText('Bienes de la iglesia.')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('En desarrollo');
  });

  it('muestra los enlaces a las secciones existentes del módulo', () => {
    render(
      <MemoryRouter>
        <ModuleHub
          title="Contabilidad"
          description="Contabilidad de la iglesia."
          links={[
            {
              to: '/app/reconciliation',
              label: 'Conciliación Bancaria',
              description: 'Conciliar.',
            },
          ]}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /Conciliación Bancaria/ })).toHaveAttribute(
      'href',
      '/app/reconciliation',
    );
  });

  it('no muestra aviso de estado ni enlaces cuando no se indican', () => {
    render(
      <MemoryRouter>
        <ModuleHub title="Calendario" description="Actividades." />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
