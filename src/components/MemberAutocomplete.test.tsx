import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemberAutocomplete } from './MemberAutocomplete';
import type { Beneficiary } from '../services/api';

const sampleMembers: Beneficiary[] = [
  {
    id: 'mem-1',
    jornada_id: '',
    nombre: 'Carlos',
    apellido: 'Pérez',
    cedula: 'V-12345678',
    sexo: 'M',
    fecha_nacimiento: '1990-01-01',
    url_firma: null,
    created_at: '',
  },
  {
    id: 'mem-2',
    jornada_id: '',
    nombre: 'María',
    apellido: 'Gómez',
    cedula: 'V-87654321',
    sexo: 'F',
    fecha_nacimiento: '1992-05-10',
    url_firma: null,
    created_at: '',
  },
];

describe('MemberAutocomplete', () => {
  it('filters members by name or cedula without using a native select dropdown', () => {
    const onSelect = vi.fn();
    render(
      <MemberAutocomplete
        id="test-member"
        label="Miembro vinculado *"
        members={sampleMembers}
        selectedMemberId=""
        onSelect={onSelect}
        required
      />,
    );

    const input = screen.getByLabelText(/Miembro vinculado \*/i);
    expect(input.tagName).toBe('INPUT');

    fireEvent.change(input, { target: { value: '123456' } });
    expect(screen.getByRole('option', { name: /Carlos Pérez/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /María Gómez/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('option', { name: /Carlos Pérez/i }));
    expect(onSelect).toHaveBeenCalledWith(sampleMembers[0]);
  });

  it('shows selected member badge and allows clearing selection', () => {
    const onSelect = vi.fn();
    render(
      <MemberAutocomplete
        id="test-member"
        label="Miembro vinculado *"
        members={sampleMembers}
        selectedMemberId="mem-1"
        onSelect={onSelect}
        required
      />,
    );

    expect(screen.getByTestId('test-member-selected')).toHaveTextContent(
      'Carlos Pérez (V-12345678)',
    );
    fireEvent.click(screen.getByRole('button', { name: /Cambiar miembro/i }));
    expect(onSelect).toHaveBeenCalledWith(null);
  });
});
