import { createPath, type NavLinkProps, type NavLinkRenderProps } from 'react-router-dom';

type Props = Pick<
  NavLinkProps,
  'to' | 'className' | 'style' | 'children' | 'onClick' | 'title' | 'end'
>;

export function NativeNavLink({ to, className, style, children, onClick, title, end }: Props) {
  const href = typeof to === 'string' ? to : createPath(to);
  const target = href.split(/[?#]/, 1)[0];
  const current = window.location.pathname;
  const isActive = current === target || (!end && current.startsWith(`${target}/`));
  const state: NavLinkRenderProps = { isActive, isPending: false, isTransitioning: false };
  return (
    <a
      href={href}
      title={title}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={typeof className === 'function' ? className(state) : className}
      style={typeof style === 'function' ? style(state) : style}
    >
      {typeof children === 'function' ? children(state) : children}
    </a>
  );
}
