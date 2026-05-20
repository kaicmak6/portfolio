'use client';
import { Anchor, Container, SimpleGrid, Text, Title } from '@mantine/core';
import { useTranslations } from 'next-intl';

import classes from './CertificationsSection.module.scss';

export function CertificationsSection() {
  const t = useTranslations('Certifications');
  const badges = t.raw('badges') as Array<{ title: string; issuer: string; image: string; link: string }>;

  if (!badges || badges.length === 0) {
    return null;
  }

  return (
    <Container size="lg" py="xl">
      <Title ta="center" className={classes.title}>
        {t('title')}
      </Title>

      <SimpleGrid
        cols={{ base: 1, sm: 2 }}
        spacing="lg"
        mt="xl"
        className={classes.grid}
      >
        {badges.map(cert => (
          <Anchor
            key={cert.title}
            href={cert.link}
            target="_blank"
            rel="noopener noreferrer"
            underline="never"
            className={classes.card}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cert.image}
              alt={cert.title}
              width={110}
              height={110}
              className={classes.badgeImage}
            />
            <div className={classes.info}>
              <Text fw={600} size="md" lh={1.3}>
                {cert.title}
              </Text>
              <Text size="sm" c="dimmed" lh={1.3}>
                {cert.issuer}
              </Text>
            </div>
          </Anchor>
        ))}
      </SimpleGrid>
    </Container>
  );
}
