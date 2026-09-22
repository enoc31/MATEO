import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SkeletonTable } from './SkeletonTable';

describe('SkeletonTable', () => {
  it('renders without crashing with default props', () => {
    render(<SkeletonTable />);
  });

  it('has accessible aria-label', () => {
    render(<SkeletonTable />);
    expect(screen.getByLabelText('Cargando tabla...')).toBeTruthy();
  });

  it('renders the correct number of rows by default (6)', () => {
    const { container } = render(<SkeletonTable rows={6} />);
    // Each row has a skeleton-avatar div when showAvatar is true
    const avatars = container.querySelectorAll('.skeleton-avatar');
    expect(avatars.length).toBe(6);
  });

  it('renders custom number of rows', () => {
    const { container } = render(<SkeletonTable rows={3} />);
    const avatars = container.querySelectorAll('.skeleton-avatar');
    expect(avatars.length).toBe(3);
  });

  it('does not render avatar when showAvatar is false', () => {
    const { container } = render(<SkeletonTable rows={4} showAvatar={false} />);
    const avatars = container.querySelectorAll('.skeleton-avatar');
    expect(avatars.length).toBe(0);
  });
});
