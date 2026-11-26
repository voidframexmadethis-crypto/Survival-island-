import React from 'react';

type LinkHref =
  | string
  | URL
  | {
      pathname?: string;
      query?: Record<string, string | number | undefined>;
      hash?: string;
    };

type NextLinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: LinkHref;
  children?: React.ReactNode;
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
  shallow?: boolean;
  legacyBehavior?: boolean;
};

function toMobileHref(href: LinkHref): string {
  if (typeof href === 'string') {
    if (href === '/') return '#/';
    if (href.startsWith('/')) return `#${href}`;
    return href;
  }
  if (href instanceof URL) return href.toString();

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(href.query || {})) {
    if (value !== undefined) params.set(key, String(value));
  }
  const query = params.toString();
  return `#${href.pathname || '/'}${query ? `?${query}` : ''}${href.hash || ''}`;
}

export default function Link({
  href,
  children,
  prefetch: _prefetch,
  replace: _replace,
  scroll: _scroll,
  shallow: _shallow,
  legacyBehavior: _legacyBehavior,
  ...rest
}: NextLinkProps) {
  return (
    <a {...rest} href={toMobileHref(href)}>
      {children}
    </a>
  );
}
