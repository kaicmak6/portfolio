const localePrefix = 'never' as const;

// Four registers of one Chinese, plus English. The ids are BCP 47 tags because
// they are written straight into `<html lang>`, and the order is load-bearing:
// the middleware resolves an unknown `zh-*` tag to the first Chinese entry, so
// Cantonese stays the default for every zh visitor, as zh-HK was before.
export const AppConfig = {
  name: 'Kai Mak - Frontend Developer Portfolio',
  locales: [
    {
      id: 'en',
      name: 'English',
      face: 'EN',
    },
    {
      id: 'zh-Hant-HK',
      name: '香港廣東話',
      face: '粵',
    },
    {
      id: 'zh-Hant',
      name: '繁體中文',
      face: '繁',
    },
    {
      id: 'zh-Hans',
      name: '简体中文',
      face: '简',
    },
  ] as const,
  defaultLocale: 'en' as const,
  localePrefix,
};

export type LocaleId = (typeof AppConfig.locales)[number]['id'];

export const AllLocales: LocaleId[] = AppConfig.locales.map(locale => locale.id);

export const isLocale = (value: string): value is LocaleId =>
  (AllLocales as string[]).includes(value);
