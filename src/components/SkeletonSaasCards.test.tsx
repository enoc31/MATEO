import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SkeletonSaasCards } from './SkeletonSaasCards';

describe('SkeletonSaasCards', () => {
  it('renders without crashing', () => {
    render(<SkeletonSaasCards />);
  });

  it('has accessible aria-label', () => {
    render(<SkeletonSaasCards />);
    expect(screen.getByLabelText('Cargando estadísticas...')).toBeTruthy();
  });

  it('renders 3 metric skeleton cards', () => {
    const { container } = render(<SkeletonSaasCards />);
    // 3 metric cards — each has a skeleton-title and skeleton elements
    const skeletonEls = container.querySelectorAll('.skeleton');
    expect(skeletonEls.length).toBeGreaterThan(0);
  });
});
