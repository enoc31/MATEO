import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SkeletonMembers } from './SkeletonMembers';

describe('SkeletonMembers', () => {
  it('renders without crashing with default props (cards view)', () => {
    render(<SkeletonMembers />);
    expect(screen.getByLabelText('Cargando tarjetas de miembros...')).toBeTruthy();
  });

  it('renders correctly in list view mode', () => {
    render(<SkeletonMembers viewMode="list" />);
    expect(screen.getByLabelText('Cargando directorio de miembros...')).toBeTruthy();
  });

  it('renders custom count of card skeletons', () => {
    const { container } = render(<SkeletonMembers viewMode="cards" count={4} />);
    const cardSkeletons = container.querySelectorAll('.skeleton-card');
    expect(cardSkeletons.length).toBe(4);
  });

  it('renders custom count of list row skeletons', () => {
    const { container } = render(<SkeletonMembers viewMode="list" count={5} />);
    const avatarSkeletons = container.querySelectorAll('.skeleton-avatar');
    expect(avatarSkeletons.length).toBe(5);
  });
});
