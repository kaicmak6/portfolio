'use client';
import { Button, Container, Group, List, Text, ThemeIcon, Title } from '@mantine/core';
import { IconBrandGithub, IconCheck, IconMail } from '@tabler/icons-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { HtmlContent } from '@/components/atoms/HtmlContent';

import classes from './HeroBullets.module.scss';

export function HeroBullets() {
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
    <Container size="md">
      <div className={classes.inner}>
        <div className={classes.content}>
          <Title className={classes.title} mb="md">
            {t('title')}
          </Title>
          <HtmlContent
            content={t('description')}
            className="text-dimmed mt-md size-lg leading-relaxed"
          />

          <List
            mt="xl"
            spacing="md"
            size="md"
            maw={500}
            m="0 auto"
            icon={(
              <ThemeIcon size={20} radius="xl">
                <IconCheck size={12} stroke={1.5} />
              </ThemeIcon>
            )}
          >
            {features.map((feature, index) => (
              <List.Item
                key={index}
                styles={{
                  itemIcon: {
                    alignSelf: 'flex-start',
                  },
                  itemLabel: {
                    textAlign: 'left',
                  },
                }}
              >
                <b>{feature.title}</b>
                {' '}
                <HtmlContent content={feature.description} />
              </List.Item>
            ))}
          </List>

          <Group maw={500} mt="lg" ml="auto" mr="auto" gap="sm" className={classes.group}>
            <Button
              radius="xl"
              size="md"
              className={`${classes.control} ${classes.button}`}
              component="a"
              href={t('primary_button_link')}
              leftSection={<IconBrandGithub size={18} />}
            >
              {t('primary_button')}
            </Button>
            <Button
              variant="default"
              radius="xl"
              size="md"
              className={`${classes.control} ${classes.button}`}
              onClick={scrollToContact}
              leftSection={<IconMail size={18} />}
            >
              {t('secondary_button')}
            </Button>
          </Group>
        </div>
        <Image
          src={image}
          className={`${classes.image} ${classes.heroImage}`}
          alt=""
          width={400}
          height={300}
          priority
        />
      </div>
      {/* AWS & Cloudflare infrastructure showcase */}
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
              priority
            />
            <Text size="sm" fw={700} className={classes.infraLabel}>AWS</Text>
            <Text size="xs" c="dimmed" className={classes.infraDesc}>{t('infra_aws')}</Text>
          </div>
          <div className={classes.infraItem}>
            <Image
              src={t('infra_cf_logo')}
              alt="Cloudflare"
              width={100}
              height={60}
              className={classes.infraLogo}
              priority
            />
            <Text size="sm" fw={700} className={classes.infraLabel}>Cloudflare</Text>
            <Text size="xs" c="dimmed" className={classes.infraDesc}>{t('infra_cf')}</Text>
          </div>
        </div>
      </div>

    </Container>
  );
}
