'use client';

import { ActionIcon, Text } from '@mantine/core';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useTransition } from 'react';

import { AppConfig } from '@/utils/AppConfig';

import classes from './HeaderTabs.module.scss';

const COOKIE = 'NEXT_LOCALE';
const ONE_YEAR = 60 * 60 * 24 * 365;

/* The URL carries no locale, so the choice lives in the cookie next-intl's
   middleware already reads. One button cycles the four registers in the order
   they are declared, showing the one you are in: a menu is four clicks to a
   place you revisit, and the cycle is one.

   The `<html lang>` follows the locale the provider actually switched to, not the
   one the click asked for: written eagerly it would label English text as
   Cantonese for as long as the refresh takes. */
export function LangToggle() {
  const t = useTranslations('HeaderTabs');
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const index = AppConfig.locales.findIndex(item => item.id === locale);
  const current = AppConfig.locales[index] ?? AppConfig.locales[0];
  const next = AppConfig.locales[(index + 1) % AppConfig.locales.length] ?? AppConfig.locales[0];

  const cycle = () => {
    document.cookie = `${COOKIE}=${next.id};path=/;max-age=${ONE_YEAR};SameSite=Lax`;
    startTransition(() => router.refresh());
  };

  return (
    <ActionIcon
      variant="default"
      size="lg"
      loading={pending}
      onClick={cycle}
      aria-label={`${t('language_label')}: ${current?.name}. ${next?.name}`}
      className={classes.themeToggle}
    >
      <Text component="span" size="sm" fw={700} aria-live="polite">
        {current?.face}
      </Text>
    </ActionIcon>
  );
}
