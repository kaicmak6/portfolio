import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

import { AppConfig, isLocale } from '@/utils/AppConfig';

// A translated section replaces the English one wholesale, so a partial
// translation would silently blank the rest of that section. Merge one level
// deep: an untranslated key falls through to the English source.
function mergeMessages(base: Record<string, unknown>, override: Record<string, unknown>) {
  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const fallback = base[key];
    if (
      value && typeof value === 'object' && !Array.isArray(value)
      && fallback && typeof fallback === 'object' && !Array.isArray(fallback)
    ) {
      merged[key] = { ...fallback as Record<string, unknown>, ...value as Record<string, unknown> };
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

// NextJS Boilerplate uses Crowdin as the localization software.
// As a developer, you only need to take care of the English (or another default language) version.
// Other languages are automatically generated and handled by Crowdin.

// The localisation files are synced with Crowdin using GitHub Actions.
// By default, there are 3 ways to sync the message files:
// 1. Automatically sync on push to the `main` branch
// 2. Run manually the workflow on GitHub Actions
// 3. Every 24 hours at 5am, the workflow will run automatically

// Using internationalization in Server Components
export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;

  // Validate that the incoming `locale` parameter is valid
  if (!locale || !isLocale(locale)) {
    notFound();
  }

  if (process.env.NODE_ENV === 'development') {
    return {
      locale,
      messages: (await import(`../locales/${locale}.json`)).default,
    };
  } else if (process.env.NODE_ENV === 'production' && process.env.DIRECTUS_HOST) {
    const row = await fetch(`${process.env.DIRECTUS_HOST}/items/portfolio`).then((res) => {
      return res.json().then(result => result.data?.[0]?.content ?? {});
    }).catch((err) => {
      console.error('Failed to fetch messages from Directus', err);
      return {};
    });

    // English is authored in `Index`…`favicon`; every other locale sits beside it
    // under `translations[locale]`, so adding a language never touches the source.
    const { translations, ...englishMessages } = row as Record<string, unknown> & {
      translations?: Record<string, unknown>;
    };
    const localizedMessages = (translations?.[locale] ?? {}) as Record<string, unknown>;

    // Load fallback messages from locale file for missing keys
    let fallbackMessages: Record<string, unknown> = {};
    try {
      fallbackMessages = (await import(`../locales/${locale}.json`)).default;
    } catch {
      // Fallback file not available
    }

    // English is complete, so merging it *under* the locale file is what decides
    // the register: without this order a locale the CMS has no block for would
    // inherit every English key and its own file would never render. Precedence
    // is CMS, then the locale file, then English.
    const messages = locale === AppConfig.defaultLocale
      ? mergeMessages(fallbackMessages, englishMessages)
      : mergeMessages(
          mergeMessages(englishMessages, fallbackMessages),
          localizedMessages,
        );

    return { locale, messages };
  }
  return { locale, messages: {} };
});
