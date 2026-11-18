'use client';
import { Container, Text, Title } from '@mantine/core';
import { useTranslations } from 'next-intl';

import { Reveal } from '@/components/atoms/Reveal/Reveal';
import type { BadgeCardData } from '@/components/molecules/BadgeCardGrid/BadgeCardGrid';
import { BadgeCardGrid } from '@/components/molecules/BadgeCardGrid/BadgeCardGrid';

import classes from './PortfolioHeroSection.module.scss';

export type PortfolioHeroSectionProps = {
  readonly title?: string;
  readonly subtitle?: string;
  readonly cards?: BadgeCardData[];
  readonly cols?: number | { base: number; sm?: number; md?: number; lg?: number };
};

const DEFAULT_COLS = { base: 1, sm: 2, md: 3 } as const;

export function PortfolioHeroSection({
  title,
  subtitle,
  cards,
  cols = DEFAULT_COLS,
}: PortfolioHeroSectionProps) {
  const t = useTranslations('PortfolioHero');

  const defaultCards: BadgeCardData[] = t.raw('cards').map((card: { id: string; title: string; category: string; description: string; badges: string[]; images: string[]; emoji: string }, _index: number) => ({
    id: card.id,
    images: card.images,
    title: card.title,
    country: card.category,
    description: card.description,
    badges: card.badges.map((badge: string) => ({
      emoji: '▪',
      label: badge,
    })),
  }));

  return (
    <section className={classes.band}>
      <Container size="lg" className={classes.section}>
        <Reveal className={classes.intro}>
          <div className={classes.eyebrow}>{t('badge')}</div>
          <Title order={2} className={classes.title}>
            {title || t('title')}
          </Title>
          <Text className={classes.subtitle}>
            {subtitle || t('subtitle')}
          </Text>
        </Reveal>
        <div className={classes.grid}>
          <BadgeCardGrid cards={cards || defaultCards} cols={cols} spacing="lg" verticalSpacing="lg" />
        </div>
      </Container>
    </section>
  );
}
