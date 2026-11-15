'use client';
import { Button, Container, Group, Text, Title } from '@mantine/core';
import { IconBrandGithub, IconMail } from '@tabler/icons-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { HtmlContent } from '@/components/atoms/HtmlContent';

import classes from './HeroBullets.module.scss';

export function HeroBullets({ plateSrc = '/ops/terminal-fog.af04348a.webp' }: { plateSrc?: string }) {
  const t = useTranslations('HeroBullets');
  const image = t('image');
  const features = t.raw('features') as Array<{ title: string; description: string }>;

  const scrollToContact = () => {
    const contactElement = document.getElementById('contact');
    if (contactElement) {
      contactElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <section className={classes.hero}>
        {/* The plate is the hero's ground, not a panel in it: it covers the
            section edge to edge and the scrim above it is the only thing that
            decides where type sits, so legibility never depends on which part
            of the photograph happens to fall behind a line. */}
        <div className={classes.plate} aria-hidden="true">
          <Image
            src={plateSrc}
            alt=""
            width={1138}
            height={640}
            sizes="100vw"
            priority
            unoptimized
            className={classes.plateImage}
          />
        </div>
        <div className={classes.scrim} aria-hidden="true" />

        <Container size="lg" className={classes.container}>
          <div className={classes.inner}>
            <div className={classes.headline}>
              <Title order={1} className={classes.title}>
                {t('title')}
              </Title>
              <div className={classes.lede}>
                <HtmlContent content={t('description')} />
              </div>
            </div>

            <div className={classes.columns}>
              <div className={classes.content}>
                <ul className={classes.features}>
                  {features.map((feature, index) => (
                    <li key={index} className={classes.feature}>
                      <b className={classes.featureTitle}>{feature.title}</b>
                      <div className={classes.featureBody}>
                        <HtmlContent content={feature.description} />
                      </div>
                    </li>
                  ))}
                </ul>

                <Group gap="sm" className={classes.group}>
                  <span
                    className={classes.magnet}
                    onPointerMove={(event) => {
                      const element = event.currentTarget;
                      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                        const rect = element.getBoundingClientRect();
                        element.style.setProperty('--magnet-x', `${((event.clientX - rect.left) / rect.width - 0.5) * 10}px`);
                        element.style.setProperty('--magnet-y', `${((event.clientY - rect.top) / rect.height - 0.5) * 8}px`);
                      }
                    }}
                    onPointerLeave={(event) => {
                      event.currentTarget.style.removeProperty('--magnet-x');
                      event.currentTarget.style.removeProperty('--magnet-y');
                    }}
                  >
                    <Button
                      size="md"
                      component="a"
                      href={t('primary_button_link')}
                      leftSection={<IconBrandGithub size={18} />}
                      className={classes.ctaPrimary}
                    >
                      {t('primary_button')}
                    </Button>
                  </span>
                  <Button
                    variant="default"
                    size="md"
                    onClick={scrollToContact}
                    leftSection={<IconMail size={18} />}
                    className={classes.ctaGhost}
                  >
                    {t('secondary_button')}
                  </Button>
                </Group>
              </div>

              <div className={classes.media}>
                <Image
                  src={image}
                  className={classes.heroImage}
                  alt=""
                  width={1024}
                  height={1024}
                  sizes="(max-width: 62em) 420px, 464px"
                  priority
                />
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* AWS & Cloudflare infrastructure showcase: the paper beat immediately
          under the dark hero, so the page changes register twice in one screen. */}
      <div className={classes.infraBand}>
        <Container size="lg" className={classes.infraBandInner}>
          <div className={classes.infraShowcase}>
            <div className={classes.infraShowcaseTitle}>{t('infra_title')}</div>
            <div className={classes.infraShowcaseRow}>
              <div className={classes.infraItem}>
                <Image
                  src={t('infra_aws_logo')}
                  alt="AWS"
                  width={100}
                  height={60}
                  className={classes.infraLogo}
                />
                <Text size="sm" fw={600} className={classes.infraLabel}>AWS</Text>
                <Text size="xs" className={classes.infraDesc}>{t('infra_aws')}</Text>
              </div>
              <div className={classes.infraItem}>
                <Image
                  src={t('infra_cf_logo')}
                  alt="Cloudflare"
                  width={100}
                  height={60}
                  className={classes.infraLogo}
                />
                <Text size="sm" fw={600} className={classes.infraLabel}>Cloudflare</Text>
                <Text size="xs" className={classes.infraDesc}>{t('infra_cf')}</Text>
              </div>
            </div>
          </div>
        </Container>
      </div>
    </>
  );
}
