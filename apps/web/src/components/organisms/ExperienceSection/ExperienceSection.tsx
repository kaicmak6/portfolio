'use client';
import { Anchor, Box, Container, Text, ThemeIcon, Timeline, Title, useMantineTheme } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconBriefcase } from '@tabler/icons-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { HtmlContent } from '@/components/atoms/HtmlContent';

import classes from './ExperienceSection.module.scss';

export function ExperienceSection() {
  const t = useTranslations('Experience');
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);
  const jobs = t.raw('jobs') as Array<{ id: string; title: string; company: string; date: string; description: string; icon: string; badge_color: string }>;

  return (
    <Container size="lg" py="xl">
      <Title className={classes.title}>
        {t('title')}
      </Title>
      <Text c="dimmed" mt="xs" mb="xl" size="lg">
        {t('subtitle')}
      </Text>

      <Timeline
        active={Infinity}
        lineWidth={1}
        bulletSize={isMobile ? 34 : 40}
      >
        {jobs.map((job, index) => {
          return (
            <Timeline.Item
              key={index}
              bullet={(
                <ThemeIcon size={isMobile ? 34 : 40} variant="gradient" gradient={{ from: 'brand.8', to: 'brand.9', deg: 160 }} radius={0}>
                  <IconBriefcase size={isMobile ? 20 : 24} />
                </ThemeIcon>
              )}
              title={<Text size={isMobile ? 'sm' : 'md'} fw={700}>{job.title}</Text>}
            >
              <Text c="dimmed" size={isMobile ? 'sm' : 'md'}>
                {job.company}
                {' '}
                •
                {job.date}
              </Text>
              <Box><HtmlContent content={job.description} className="mt-sm pl-md" /></Box>
              <Anchor component={Link} href={`/experience#${job.id}`} size="sm" mt="sm" className={classes.viewDetails}>
                {t('view_details')}
              </Anchor>
            </Timeline.Item>
          );
        })}
      </Timeline>
    </Container>
  );
}
