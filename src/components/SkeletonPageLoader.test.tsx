import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SkeletonPageLoader } from './SkeletonPageLoader';

describe('SkeletonPageLoader', () => {
  it('renders without crashing', () => {
    render(<SkeletonPageLoader />);
  });

  it('has accessible aria-label', () => {
    render(<SkeletonPageLoader />);
    expect(screen.getByLabelText('Cargando módulo...')).toBeTruthy();
  });

  it('renders skeleton elements', () => {
    const { container } = render(<SkeletonPageLoader />);
    const skeletonEls = container.querySelectorAll('.skeleton');
    expect(skeletonEls.length).toBeGreaterThan(0);
  });

  it('renders the page loader container', () => {
    const { container } = render(<SkeletonPageLoader />);
    const loader = container.querySelector('.skeleton-page-loader');
    expect(loader).toBeTruthy();
  });
});
