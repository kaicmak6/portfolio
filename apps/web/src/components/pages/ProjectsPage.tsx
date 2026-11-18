'use client';
import { Carousel } from '@mantine/carousel';
import { Badge, Button, Container, Flex, Group, Text, Title } from '@mantine/core';
import { IconArrowUpRight } from '@tabler/icons-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { HtmlContent } from '@/components/atoms/HtmlContent/HtmlContent';

import classes from './ProjectsPage.module.scss';

export function ProjectsPage() {
  const t = useTranslations('Projects');

  const projects = t.raw('items').map((item: { id: string; title: string; desc: string; metrics: string[]; images: string[]; tech: Array<{ emoji: string; label: string }>; demo: string; github: string; year?: string; status?: string }) => ({
    id: item.id,
    title: item.title,
    images: item.images,
    desc: item.desc,
    tech: item.tech,
    metrics: item.metrics,
    demo: item.demo,
    github: item.github,
    year: item.year,
    status: item.status,
  }));

  type Project = typeof projects[number];

  return (
    <Container size="lg" py="xl">
      <header className={classes.pageHeader}>
        <Title className={classes.pageTitle}>{t('title')}</Title>
      </header>

      <div className={classes.cases}>
        {projects.map((p: Project, index: number) => (
          <article key={p.id} id={p.id} className={classes.case}>
            <header className={classes.caseHead}>
              {/* The index is derived, so a case keeps a numbered marker even
                  when Directus supplies no year and status to sit beside it. */}
              <div className={classes.eyebrow}>
                <span className={classes.eyebrowItem}>{String(index + 1).padStart(2, '0')}</span>
                {p.year && <span className={classes.eyebrowItem}>{p.year}</span>}
                {p.status && <span className={classes.eyebrowItem}>{p.status}</span>}
              </div>

              <Title order={2} className={classes.caseTitle}>
                <HtmlContent content={p.title} />
              </Title>
            </header>

            <div className={classes.media}>
              <Carousel
                withIndicators={p.images.length > 1}
                withControls={false}
                height="100%"
                slideSize="100%"
                emblaOptions={{ loop: true }}
                className={classes.carousel}
              >
                {p.images.map((img: string, idx: number) => (
                  <Carousel.Slide key={idx}>
                    <Image
                      src={img}
                      width={1600}
                      height={1000}
                      alt={`${p.title} - Image ${idx + 1}`}
                      className={classes.carouselImage}
                    />
                  </Carousel.Slide>
                ))}
              </Carousel>
            </div>

            <div className={classes.body}>
              <Text component="div" className={classes.desc}>
                <HtmlContent content={p.desc} />
              </Text>

              <div className={classes.side}>
                {p.metrics.length > 0 && (
                  <dl className={classes.stats}>
                    {p.metrics.map((metric: string, idx: number) => (
                      <div key={idx} className={classes.stat}>
                        <dt className={classes.statIndex}>{String(idx + 1).padStart(2, '0')}</dt>
                        <dd className={classes.statValue}><HtmlContent content={metric} /></dd>
                      </div>
                    ))}
                  </dl>
                )}

                <Group gap={6} className={classes.tech}>
                  {p.tech.map((tech: { emoji: string; label: string }) => (
                    <Badge key={tech.label} variant="default" leftSection="▪">{tech.label}</Badge>
                  ))}
                </Group>

                <Flex className={classes.action}>
                  <Button
                    component="a"
                    href={p.demo}
                    target="_blank"
                    rel="noopener noreferrer"
                    rightSection={<IconArrowUpRight size={16} />}
                    className={classes.cta}
                  >
                    {t('view_production')}
                  </Button>
                </Flex>
              </div>
            </div>
          </article>
        ))}
      </div>
    </Container>
  );
}
