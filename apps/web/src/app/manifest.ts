import type { MetadataRoute } from 'next';

// The app is mounted at a sub-path everywhere it is served: the apex 302s to
// /__apex, portfolio.mak-cloud.com 302s to /portfolio, and BASE_PATH is /portfolio.
// So the install identity is that sub-path, not "/" as in the plain vite apps —
// start_url "/" at the apex would open a different application.
const BASE = process.env.BASE_PATH ?? '';
const ROOT = BASE || '/';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: ROOT,
    name: 'Kaius Mak · Enterprise Systems Portfolio',
    short_name: 'Kaius Mak',
    description:
      'Port and terminal operations, high-concurrency booking platforms, and the engineering structure that holds them at scale.',
    lang: 'en',
    dir: 'ltr',
    start_url: ROOT,
    scope: ROOT,
    display: 'standalone',
    background_color: '#f0f5fa',
    theme_color: '#001b3f',
    icons: [
      { src: `${ROOT}/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `${ROOT}/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `${ROOT}/icon-512-maskable.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
