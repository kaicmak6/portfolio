import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import withBundleAnalyzer from '@next/bundle-analyzer';
import { withSentryConfig } from '@sentry/nextjs';
import createJiti from 'jiti';
import withNextIntl from 'next-intl/plugin';

// const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const jiti = createJiti(fileURLToPath(import.meta.url));

jiti('./src/libs/Env'); // Initialize environment variables

const withNextIntlConfig = withNextIntl('./src/libs/i18n.ts');

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

// Get IMAGE_DOMAINS for image configuration
const imageDomains = process.env.IMAGE_DOMAINS ? process.env.IMAGE_DOMAINS.split(',') : [];
const imageRemotePatterns = imageDomains.map((entry) => {
  const raw = entry.trim();
  const parsed = /^(https?):\/\/([^/:]+)(?::(\d+))?$/.exec(raw);
  if (parsed) {
    return { protocol: parsed[1], hostname: parsed[2], port: parsed[3] ?? '', pathname: '/**' };
  }
  const withPort = /^([^/:]+):(\d+)$/.exec(raw);
  if (withPort) {
    return { protocol: 'https', hostname: withPort[1], port: withPort[2], pathname: '/**' };
  }
  return { protocol: 'https', hostname: raw, pathname: '/**' };
});

/** @type {import('next').NextConfig} */
export default withSentryConfig(
  bundleAnalyzer(
    withNextIntlConfig({
      // output: 'standalone',
      // cacheHandler: require.resolve('@trieb.work/nextjs-turbo-redis-cache'),
      basePath: process.env.BASE_PATH,
      assetPrefix: process.env.BASE_PATH && process.env.NEXT_PUBLIC_URL ? `${process.env.NEXT_PUBLIC_URL}${process.env.BASE_PATH || ''}` : undefined,
      // Note: 'standalone' output is NOT used because we have a custom Fastify server
      // that integrates Next.js via getRequestHandler(). The standalone output
      // creates a separate server.js that cannot be integrated into a custom server.
      poweredByHeader: false,
      reactStrictMode: true,

      // The `/ops` plate filenames and the `/fonts` faces carry a content hash,
      // so they can be cached for a year: a new file arrives as a new URL.
      async headers() {
        return [
          {
            source: '/ops/:path*',
            headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
          },
          {
            source: '/fonts/:path*',
            headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
          },
          // A service worker script is cached harder than any other file, and a
          // stale one outlives the deploy that replaced it.
          // The wider scope is needed because the canonical root is `/portfolio`
          // with no trailing slash, one character outside the default `/portfolio/`.
          {
            source: '/sw.js',
            headers: [
              { key: 'Cache-Control', value: 'no-cache' },
              { key: 'Service-Worker-Allowed', value: process.env.BASE_PATH ?? '/' },
            ],
          },
        ];
      },

      serverExternalPackages: ['@electric-sql/pglite'],
      sassOptions: {
        implementation: 'sass-embedded',
        loadPaths: [__dirname],
        additionalData: `@use "_mantine" as *;`,
      },

      images: {
        // @ts-expect-error - Next.js type inference issue with remotePatterns
        remotePatterns: imageRemotePatterns,
        // Directus runs on a LAN address when self-hosted; Next refuses private-IP
        // upstreams unless allowed. Opt in per environment, never by default.
        dangerouslyAllowLocalIP: process.env.IMAGE_ALLOW_LOCAL_IP === 'true',
        formats: ['image/avif', 'image/webp'],

        deviceSizes: [576, 768, 992, 1200, 1408, 1920],

        minimumCacheTTL: 300, // 5 minutes

        dangerouslyAllowSVG: false,
        contentDispositionType: 'attachment',
        contentSecurityPolicy: 'default-src \'self\'; script-src \'none\'; sandbox;',
      },

      // Pass filtered environment variables from parent process (Fastify server)
      // env: getFilteredEnv(),

      webpack: (config) => {
        config.resolve.alias = {
          ...config.resolve.alias,
          '@': resolve(__dirname, 'src'),
        };
        return config;
      },
    }),
  ),
  {
    org: 'nextjs-boilerplate-org',
    project: 'nextjs-boilerplate',
    silent: !process.env.CI,
    widenClientFileUpload: true,
    tunnelRoute: '/monitoring',
    sourcemaps: {
      disable: true,
    },
    disableLogger: true,
    automaticVercelMonitors: true,
    telemetry: false,
  },
);
