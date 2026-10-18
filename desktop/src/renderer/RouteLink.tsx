import type { AnchorHTMLAttributes } from 'react';
import { plainNavigation } from '@/lib/navigation';
import { navigate } from './useRoute';

export function RouteLink({ href, onClick, className = '', ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return <a {...props} href={href} className={`route-link ${className}`} style={{ color: 'inherit', textDecoration: 'none', ...props.style }} onClick={(event) => {
    onClick?.(event);
    if (plainNavigation(event, props.target) && !props.download) { event.preventDefault(); navigate(href); }
  }} />;
}
