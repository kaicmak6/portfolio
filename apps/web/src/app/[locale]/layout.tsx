import '@mantine/core/styles.css';
import '@mantine/carousel/styles.css';
import '@/styles/global.css';

import { ColorSchemeScript, mantineHtmlProps, MantineProvider } from '@mantine/core';
import { GoogleAnalytics, GoogleTagManager } from '@next/third-parties/google';
import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider, useMessages } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import React from 'react';

import { GlobalClickTracker } from '@/components/atoms/GlobalClickTracker';
import { ServiceWorkerRegistrar } from '@/components/atoms/ServiceWorkerRegistrar';
import { cssVariablesResolver, theme } from '@/styles/theme';

// Vendored rather than fetched: `next/font/google` downloads the files at build
// time, so a build machine without reachability to fonts.googleapis.com cannot
// produce an image at all, and Turbopack 16 mis-resolves `next/font/local`.
// Declaring the faces and their variables by hand keeps both builds offline.
// Both files are variable woff2 (SIL OFL) served from `public/fonts`.
const fontFaceCss = `
@font-face{font-family:Inter;src:url('${process.env.BASE_PATH ?? ''}/fonts/Inter-Variable.260c81a4.woff2') format('woff2');font-weight:100 900;font-style:normal;font-display:swap}
@font-face{font-family:Outfit;src:url('${process.env.BASE_PATH ?? ''}/fonts/Outfit-Variable.fdf9c509.woff2') format('woff2');font-weight:100 900;font-style:normal;font-display:swap}
:root{--font-inter:Inter;--font-outfit:Outfit}
`;

const BASE_PATH = process.env.BASE_PATH ?? '';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  // Load metadata through the i18n system — works with both local JSON (dev)
  // and Directus CMS (production) as configured in src/libs/i18n.ts
  const [tIndex, tFavicon] = await Promise.all([
    getTranslations({ locale, namespace: 'Index' }),
    getTranslations({ locale, namespace: 'favicon' }),
  ]);

  // An `http:` CMS asset cannot be loaded from the page: Chrome upgrades it to
  // `https://`, which this container does not serve, and `img-src` admits only
  // the http origin. Fall back to the bundled same-origin copy of that icon.
  const faviconUrl = String(tFavicon('url'));
  const isInsecureRemote = faviconUrl.startsWith('http://');

  const resolvedFaviconUrl = isInsecureRemote
    ? `${process.env.BASE_PATH ?? ''}/favicon.png`
    : faviconUrl.startsWith('http')
      ? faviconUrl
      : `${process.env.BASE_PATH ?? ''}${faviconUrl}`;

  return {
    title: {
      default: tIndex('meta_title'),
      template: `%s | Kaius Mak`,
    },
    description: tIndex('meta_description'),
    icons: [
      {
        rel: 'icon',
        url: resolvedFaviconUrl,
        sizes: isInsecureRemote ? '96x96' : String(tFavicon('sizes')),
        type: isInsecureRemote ? 'image/png' : String(tFavicon('type')),
      },
      {
        rel: 'apple-touch-icon',
        url: `${BASE_PATH}/apple-touch-icon.png`,
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    manifest: `${BASE_PATH}/manifest.webmanifest`,
    // Home-screen install on iOS reads these, not the manifest.
    appleWebApp: {
      capable: true,
      title: 'Kaius Mak',
      statusBarStyle: 'default',
    },
    // Next 15+ emits only the modern `mobile-web-app-capable` for
    // `appleWebApp.capable`; older iOS looks for the Apple-prefixed name, so
    // declare it here as well.
    other: {
      'apple-mobile-web-app-capable': 'yes',
    },
    openGraph: {
      title: tIndex('meta_title'),
      description: tIndex('meta_description'),
      type: 'website',
      locale,
    },
  };
}

export const revalidate = 600; // Revalidate every 10 minutes to update metadata and content
export const dynamic = 'force-dynamic'; // Do not pre-render at build time

// The browser tint of an installed window, and the only place Next 16 still
// emits `<meta name="theme-color">`.
export const viewport: Viewport = {
  themeColor: '#0f1d2e',
};

export default function RootLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = React.use(props.params);
  setRequestLocale(locale);

  // Using internationalization in Client Components
  const messages = useMessages();

  // The `suppressHydrationWarning` in <html> is used to prevent hydration errors caused by `next-themes`.
  // Solution provided by the package itself: https://github.com/pacocoursey/next-themes?tab=readme-ov-file#with-app

  // The `suppressHydrationWarning` attribute in <body> is used to prevent hydration errors caused by Sentry Overlay,
  // which dynamically adds a `style` attribute to the body tag.
  return (
    <html lang={locale} {...mantineHtmlProps}>
      {process.env.NEXT_PUBLIC_GTM_ID && (
        <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_GTM_ID || ''} />
      )}
      {process.env.NEXT_PUBLIC_GA_ID && (
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID || ''} />
      )}
      <head>
        <ColorSchemeScript suppressHydrationWarning defaultColorScheme="light" />
        <style>{fontFaceCss}</style>
      </head>
      <body suppressHydrationWarning>
        {/* PRO: Dark mode support for Shadcn UI */}
        <NextIntlClientProvider
          locale={locale}
          messages={messages}
        >
          <MantineProvider
            defaultColorScheme="light"
            theme={theme}
            cssVariablesResolver={cssVariablesResolver}
          >
            {props.children}
          </MantineProvider>
        </NextIntlClientProvider>
        <GlobalClickTracker />
        <ServiceWorkerRegistrar basePath={BASE_PATH} />
      </body>
    </html>
  );
}
