import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IncomeCategoriesTab } from './IncomeCategoriesTab';
import { financeApi, type CategoriaIngreso } from '../../services/financeApi';

vi.mock('../../services/financeApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/financeApi')>();
  return {
    ...actual,
    financeApi: {
      ...actual.financeApi,
      saveCategoriaIngreso: vi.fn(),
      deleteCategoriaIngreso: vi.fn(),
    },
  };
});

const sampleCategories: CategoriaIngreso[] = [
  {
    id: 'default-diezmo',
    ong_id: 'ong-1',
    slug: 'diezmo',
    nombre: 'Diezmo',
    descripcion: null,
    activa: true,
    orden: 0,
    isDefault: true,
  },
  {
    id: 'cat-custom-1',
    ong_id: 'ong-1',
    slug: 'fondo_juvenil',
    nombre: 'Fondo Juvenil',
    descripcion: 'Actividades de jóvenes',
    activa: true,
    orden: 10,
    isDefault: false,
  },
];

describe('IncomeCategoriesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(financeApi.saveCategoriaIngreso).mockResolvedValue({
      id: 'cat-new-1',
      ong_id: 'ong-1',
      slug: 'campamento',
      nombre: 'Campamento',
      descripcion: 'Retiro anual',
      activa: true,
      orden: 3,
    });
    vi.mocked(financeApi.deleteCategoriaIngreso).mockResolvedValue(undefined);
  });

  it('allows admin/treasurer to create, toggle, edit, and delete custom income categories', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const onFeedback = vi.fn();

    render(
      <IncomeCategoriesTab
        ongId="ong-1"
        categories={sampleCategories}
        onRefresh={onRefresh}
        onFeedback={onFeedback}
      />,
    );

    expect(screen.getByTestId('income-categories-tab')).toBeInTheDocument();
    expect(screen.getByText('Diezmo')).toBeInTheDocument();
    expect(screen.getByText('Fondo Juvenil')).toBeInTheDocument();

    // Create a custom category
    fireEvent.change(screen.getByLabelText(/Nombre de la categoría \*/i), {
      target: { value: 'Campamento' },
    });
    fireEvent.change(screen.getByLabelText(/Descripción \(opcional\)/i), {
      target: { value: 'Retiro anual' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Agregar Categoría/i }));

    await waitFor(() => {
      expect(financeApi.saveCategoriaIngreso).toHaveBeenCalledWith(
        expect.objectContaining({
          ong_id: 'ong-1',
          nombre: 'Campamento',
          descripcion: 'Retiro anual',
          activa: true,
        }),
      );
    });
    expect(onRefresh).toHaveBeenCalled();
    expect(onFeedback).toHaveBeenCalledWith(
      'Categoría "Campamento" creada correctamente.',
      'success',
    );

    // Deactivate a category
    fireEvent.click(screen.getByRole('button', { name: /Desactivar categoría Fondo Juvenil/i }));
    await waitFor(() => {
      expect(financeApi.saveCategoriaIngreso).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'cat-custom-1',
          slug: 'fondo_juvenil',
          activa: false,
        }),
      );
    });

    // Delete custom category (base categories have no delete button)
    expect(
      screen.queryByRole('button', { name: /Eliminar categoría Diezmo/i }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Eliminar categoría Fondo Juvenil/i }));
    await waitFor(() => {
      expect(financeApi.deleteCategoriaIngreso).toHaveBeenCalledWith('cat-custom-1');
    });
  });

  it('prevents deactivating the last remaining active category', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const onFeedback = vi.fn();

    render(
      <IncomeCategoriesTab
        ongId="ong-1"
        categories={[sampleCategories[0]]}
        onRefresh={onRefresh}
        onFeedback={onFeedback}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Desactivar categoría Diezmo/i }));
    expect(financeApi.saveCategoriaIngreso).not.toHaveBeenCalled();
    expect(onFeedback).toHaveBeenCalledWith(
      'Debe permanecer al menos una categoría de ingreso activa.',
      'error',
    );
  });
});
