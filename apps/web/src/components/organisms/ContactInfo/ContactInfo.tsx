'use client';
import { ActionIcon, Button, Container, CopyButton, Text, Title } from '@mantine/core';
import {
  IconArrowUpRight,
  IconBrandLinkedin,
  IconBrandWhatsapp,
  IconCheck,
  IconCopy,
  IconMail,
} from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

import classes from './ContactInfo.module.scss';

const iconMap: Record<string, React.ComponentType<any>> = {
  mail: IconMail,
  whatsapp: IconBrandWhatsapp,
  linkedin: IconBrandLinkedin,
};

export function ContactInfo() {
  const t = useTranslations('ContactInfo');

  const email = t('email');
  const phone = t('phone');
  const linkedin = t('linkedin');
  const icons = t.raw('icons') as { email: string; phone: string; linkedin: string };

  const EmailIcon = iconMap[icons.email] ?? IconMail;
  const PhoneIcon = iconMap[icons.phone] ?? IconBrandWhatsapp;
  const LinkedinIcon = iconMap[icons.linkedin] ?? IconBrandLinkedin;

  // The stored value is a full URL; the row shows the address without the
  // scheme, so a 47-character href never becomes the label.
  const linkedinLabel = linkedin.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

  return (
    <Container size="lg" py="xl" id="contact">
      <Title className={classes.title}>
        {t('title')}
      </Title>
      <Text c="dimmed" mt="xs" size="lg" maw={600}>
        {t('subtitle')}
      </Text>

      <div className={classes.body}>
        <div className={classes.primary}>
          <Button
            component="a"
            href={`mailto:${email}`}
            size="md"
            radius={0}
            h={44}
            leftSection={<EmailIcon size={18} />}
          >
            {email}
          </Button>
          <CopyButton value={email}>
            {({ copied, copy }) => (
              <ActionIcon
                variant="default"
                size={44}
                radius={0}
                onClick={copy}
                aria-label={copied ? t('copied') : email}
              >
                {copied ? <IconCheck size={17} /> : <IconCopy size={17} />}
              </ActionIcon>
            )}
          </CopyButton>
        </div>

        <ul className={classes.list}>
          <li className={classes.item}>
            <PhoneIcon size={15} />
            <a href={`https://wa.me/${phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
              {phone}
              <IconArrowUpRight size={14} aria-hidden />
            </a>
          </li>
          <li className={classes.item}>
            <LinkedinIcon size={15} />
            <a href={linkedin} target="_blank" rel="noopener noreferrer">
              {linkedinLabel}
              <IconArrowUpRight size={14} aria-hidden />
            </a>
          </li>
        </ul>
      </div>
    </Container>
  );
}
