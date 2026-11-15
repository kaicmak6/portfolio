'use client';

import { ActionIcon, Menu, Text } from '@mantine/core';
import { IconCheck, IconLanguage } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';

import { AppConfig } from '@/utils/AppConfig';

import classes from './HeaderTabs.module.scss';

const COOKIE = 'NEXT_LOCALE';
const ONE_YEAR = 60 * 60 * 24 * 365;

/* The URL carries no locale, so the choice lives in the cookie next-intl's
   middleware already reads. `router.refresh()` re-renders the same URL through
   the server, which is what re-reads the cookie and re-mounts the message tree. */
export function LocaleToggle() {
  const t = useTranslations('HeaderTabs');
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (AppConfig.locales.length < 2) {
    return null;
  }

  const select = (next: string) => {
    if (next === locale) {
      return;
    }
    document.cookie = `${COOKIE}=${next};path=/;max-age=${ONE_YEAR};SameSite=Lax`;
    startTransition(() => router.refresh());
  };

  return (
    <Menu position="bottom-end" width={160} withinPortal>
      <Menu.Target>
        <ActionIcon
          variant="default"
          size="lg"
          loading={pending}
          aria-label={t('language_label')}
          className={classes.themeToggle}
        >
          <IconLanguage size={20} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        {AppConfig.locales.map(item => (
          <Menu.Item
            key={item.id}
            onClick={() => select(item.id)}
            leftSection={item.id === locale ? <IconCheck size={14} /> : <span style={{ width: 14 }} />}
            rightSection={(
              <Text size="xs" c="dimmed" ff="monospace">
                {item.id}
              </Text>
            )}
          >
            {item.name}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
