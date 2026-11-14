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

  describe('filtrado de enlaces por rol', () => {
    const financeLinks = [
      {
        to: '/app/incomes',
        label: 'Diezmos y Ofrendas',
        description: 'Ingresos.',
        roles: ['administrador', 'director', 'auditor'],
      },
      {
        to: '/app/requisitions',
        label: 'Solicitudes de Gasto',
        description: 'Gastos.',
        roles: ['administrador', 'coordinador', 'director'],
      },
    ];

    const renderHub = (userRole?: string) =>
      render(
        <MemoryRouter>
          <ModuleHub
            title="Ingresos y Gastos"
            description="Finanzas."
            links={financeLinks}
            userRole={userRole}
          />
        </MemoryRouter>,
      );

    it('el coordinador no ve Diezmos y Ofrendas (no tiene acceso a esa pantalla)', () => {
      renderHub('coordinador');
      expect(screen.queryByRole('link', { name: /Diezmos y Ofrendas/ })).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Solicitudes de Gasto/ })).toBeInTheDocument();
    });

    it('el auditor no ve Solicitudes de Gasto (no tiene acceso a esa pantalla)', () => {
      renderHub('auditor');
      expect(screen.getByRole('link', { name: /Diezmos y Ofrendas/ })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /Solicitudes de Gasto/ })).not.toBeInTheDocument();
    });

    it('el administrador ve todos los enlaces', () => {
      renderHub('administrador');
      expect(screen.getAllByRole('link')).toHaveLength(2);
    });

    it('sin rol de usuario oculta los enlaces que exigen rol', () => {
      renderHub(undefined);
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });
});
