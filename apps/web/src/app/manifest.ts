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
    // Plain and factual: an installed app's description is read by someone
    // deciding what the icon is, so it carries no idiom that only parses in
    // English — a zh-HK reader still sees this one string.
    description:
      'Portfolio of Kaius Mak, an enterprise web engineer in Hong Kong. Port and terminal systems, airline booking platforms, and the engineering teams behind them.',
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
