import type {
  NextRequest,
} from 'next/server';
import createMiddleware from 'next-intl/middleware';

import { AllLocales, AppConfig } from './utils/AppConfig';

const intlMiddleware = createMiddleware({
  locales: AllLocales,
  localePrefix: AppConfig.localePrefix,
  defaultLocale: AppConfig.defaultLocale,
});

// The URL carries no locale, so the rendered HTML depends on the visitor's
// cookie or Accept-Language. A shared cache keys on the URL alone, so this HTML
// must not be stored by one: `Vary` cannot be relied on here, because Next sets
// it for its own RSC variants after this middleware returns. Content-addressed
// assets stay immutable; only the document is private.
function prefersDefaultLocale(request: NextRequest) {
  const cookie = request.cookies.get('NEXT_LOCALE')?.value;
  if (cookie) {
    return cookie === AppConfig.defaultLocale;
  }

  const base = (tag: string) => tag.split('-')[0] ?? tag;
  const tags = (request.headers.get('accept-language') ?? '')
    .split(',')
    .map(part => (part.split(';')[0] ?? '').trim().toLowerCase())
    .filter(Boolean);

  for (const tag of tags) {
    const match = AppConfig.locales.find(locale => locale.id.toLowerCase() === tag
      || base(locale.id.toLowerCase()) === base(tag));
    if (match) {
      return match.id === AppConfig.defaultLocale;
    }
  }

  return true;
}

export default function middleware(
  request: NextRequest,
) {
  const response = intlMiddleware(request);

  const cspHeader = process.env.CSP_HEADER || `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' ${process.env.NEXT_PUBLIC_URL}; connect-src 'self' ${process.env.NEXT_PUBLIC_URL}; frame-src 'self' ${process.env.NEXT_PUBLIC_URL}; img-src 'self' blob: data: ${process.env.NEXT_PUBLIC_URL}; style-src 'self' 'unsafe-inline'; base-uri 'self'; form-action 'self';`;

  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('Permissions-Policy', `xr-spatial-tracking=(self "https://challenges.cloudflare.com")`);
  response.headers.set(
    'Cache-Control',
    prefersDefaultLocale(request)
      ? 'private, no-cache, max-age=0, must-revalidate'
      : 'private, no-store',
  );

  return response;
}

export const config = {
  // Match all routes except static files, _next, and monitoring
  matcher: ['/((?!.+\\.[\\w]+$|_next|monitoring).*)', '/', '/(trpc)(.*)'],
};
