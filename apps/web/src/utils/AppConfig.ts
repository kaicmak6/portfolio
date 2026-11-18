const localePrefix = 'never' as const;

export const AppConfig = {
  name: 'Kai Mak - Frontend Developer Portfolio',
  locales: [
    {
      id: 'en',
      name: 'English',
    },
    {
      id: 'zh-HK',
      name: '繁體中文',
    },
  ],
  defaultLocale: 'en',
  localePrefix,
};

export const AllLocales = AppConfig.locales.map(locale => locale.id);
