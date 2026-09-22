import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SkeletonOngGrid } from './SkeletonOngGrid';

describe('SkeletonOngGrid', () => {
  it('renders without crashing', () => {
    render(<SkeletonOngGrid />);
  });

  it('has accessible aria-label', () => {
    render(<SkeletonOngGrid />);
    expect(screen.getByLabelText('Cargando organizaciones...')).toBeTruthy();
  });

  it('renders 6 skeleton cards by default', () => {
    const { container } = render(<SkeletonOngGrid />);
    const ongCards = container.querySelectorAll('.skeleton-ong-card');
    expect(ongCards.length).toBe(6);
  });

  it('renders custom number of cards', () => {
    const { container } = render(<SkeletonOngGrid cards={3} />);
    const ongCards = container.querySelectorAll('.skeleton-ong-card');
    expect(ongCards.length).toBe(3);
  });

  it('each card contains a logo skeleton', () => {
    const { container } = render(<SkeletonOngGrid cards={4} />);
    const logos = container.querySelectorAll('.skeleton-logo');
    expect(logos.length).toBe(4);
  });
});
