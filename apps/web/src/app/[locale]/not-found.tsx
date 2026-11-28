'use client';

import { Anchor, Container, Stack, Text, Title } from '@mantine/core';
import { useTranslations } from 'next-intl';

import { PortfolioLayout } from '@/components/layouts/PortfolioLayout';

/* A 404 is still the site: it wears the shell, so the two register controls in
   the header are the same controls the reader just used, and the language they
   picked still applies. It is mounted at `[locale]/`, not inside the `(unauth)`
   group, because an unmatched path belongs to no route group and would otherwise
   fall through to Next's bare default.

   It reads its strings on the client, not through `getTranslations`: a not-found
   boundary has no route params, so the server helper has no locale to resolve and
   throws, which turns the whole page into a client-rendered shell. */
export default function NotFound() {
  const t = useTranslations('NotFound');

  return (
    <PortfolioLayout>
      <Container size="lg" py="xl">
        <Stack gap="md" maw={560}>
          <Text size="xs" fw={600} tt="uppercase" c="dimmed" style={{ letterSpacing: '0.16em' }}>
            404
          </Text>
          <Title order={1} size="h2">
            {t('title')}
          </Title>
          <Text size="lg" c="dimmed">
            {t('description')}
          </Text>
          <Anchor href="/" size="sm" fw={600}>
            {t('back_home')}
          </Anchor>
        </Stack>
      </Container>
    </PortfolioLayout>
  );
}
