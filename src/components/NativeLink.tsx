import type { ComponentPropsWithoutRef } from 'react';

export const NativeLink = ({
  to,
  ...props
}: {
  to: string;
} & Omit<ComponentPropsWithoutRef<'a'>, 'href'>) => <a href={to} {...props} />;
