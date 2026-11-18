'use client';

import { ActionIcon, useMantineColorScheme } from '@mantine/core';
import { IconMoon, IconSun } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

import classes from './HeaderTabs.module.scss';

export function ColorSchemeToggle() {
  const t = useTranslations('HeaderTabs');
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  return (
    <ActionIcon
      variant="default"
      onClick={() => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')}
      size="lg"
      aria-label={t('color_scheme_label')}
      className={classes.themeToggle}
    >
      {colorScheme === 'dark'
        ? (
            <IconSun size={20} />
          )
        : (
            <IconMoon size={20} />
          )}
    </ActionIcon>
  );
}
