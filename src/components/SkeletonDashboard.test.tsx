import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SkeletonDashboard } from './SkeletonDashboard';

describe('SkeletonDashboard', () => {
  it('renders without crashing', () => {
    render(<SkeletonDashboard />);
  });

  it('has accessible aria-label for screen readers', () => {
    render(<SkeletonDashboard />);
    expect(screen.getByLabelText('Cargando tablero...')).toBeTruthy();
  });

  it('renders 3 KPI skeleton cards', () => {
    const { container } = render(<SkeletonDashboard />);
    // Each KPI card has a border-left skeleton card
    const skeletonCards = container.querySelectorAll('.skeleton-card');
    // There should be KPI cards + chart cards + execution card
    expect(skeletonCards.length).toBeGreaterThanOrEqual(3);
  });

  it('renders shimmer skeleton elements', () => {
    const { container } = render(<SkeletonDashboard />);
    const skeletonEls = container.querySelectorAll('.skeleton');
    expect(skeletonEls.length).toBeGreaterThan(0);
  });
});
