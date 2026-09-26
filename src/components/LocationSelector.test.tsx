import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LocationSelector } from './LocationSelector';

describe('LocationSelector Component', () => {
  it('renders Estado, Municipio, Parroquia selects and address detail input', () => {
    const onChangeEstado = vi.fn();
    const onChangeMunicipio = vi.fn();
    const onChangeParroquia = vi.fn();
    const onChangeDireccionDetalle = vi.fn();

    render(
      <LocationSelector
        estado="Distrito Capital"
        municipio="Libertador"
        parroquia="Candelaria"
        direccionDetalle="Av. Urdaneta, Edif. Centro"
        onChangeEstado={onChangeEstado}
        onChangeMunicipio={onChangeMunicipio}
        onChangeParroquia={onChangeParroquia}
        onChangeDireccionDetalle={onChangeDireccionDetalle}
      />,
    );

    expect(screen.getByDisplayValue('Distrito Capital')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Libertador')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Candelaria')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Av. Urdaneta, Edif. Centro')).toBeInTheDocument();
  });

  it('updates municipality and parish when state changes', () => {
    const onChangeEstado = vi.fn();
    const onChangeMunicipio = vi.fn();
    const onChangeParroquia = vi.fn();
    const onChangeDireccionDetalle = vi.fn();

    render(
      <LocationSelector
        estado="Distrito Capital"
        municipio="Libertador"
        parroquia="Candelaria"
        direccionDetalle=""
        onChangeEstado={onChangeEstado}
        onChangeMunicipio={onChangeMunicipio}
        onChangeParroquia={onChangeParroquia}
        onChangeDireccionDetalle={onChangeDireccionDetalle}
      />,
    );

    const estadoSelect = screen.getByDisplayValue('Distrito Capital');
    fireEvent.change(estadoSelect, { target: { value: 'Miranda' } });

    expect(onChangeEstado).toHaveBeenCalledWith('Miranda');
    expect(onChangeMunicipio).toHaveBeenCalledWith('Baruta');
    expect(onChangeParroquia).toHaveBeenCalledWith('Baruta');
  });
});
