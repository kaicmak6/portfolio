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

export default function middleware(
  request: NextRequest,
) {
  const response = intlMiddleware(request);

  const cspHeader = process.env.CSP_HEADER || `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' ${process.env.NEXT_PUBLIC_URL}; connect-src 'self' ${process.env.NEXT_PUBLIC_URL}; frame-src 'self' ${process.env.NEXT_PUBLIC_URL}; img-src 'self' blob: data: ${process.env.NEXT_PUBLIC_URL}; style-src 'self' 'unsafe-inline'; base-uri 'self'; form-action 'self';`;

  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('Permissions-Policy', `xr-spatial-tracking=(self 'https://challenges.cloudflare.com')`);
  response.headers.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400, stale-if-error=86400');

  return response;
}

export const config = {
  // Match all routes except static files, _next, and monitoring
  matcher: ['/((?!.+\\.[\\w]+$|_next|monitoring).*)', '/', '/(trpc)(.*)'],
};
