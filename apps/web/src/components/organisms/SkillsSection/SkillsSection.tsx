'use client';
import { Badge, Card, Container, Group, SimpleGrid, Text, ThemeIcon, Title } from '@mantine/core';
import { IconActivity, IconCode, IconFileText, IconServer, IconUsers } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

import classes from './SkillsSection.module.scss';

const iconMap: Record<string, React.ComponentType<any>> = {
  'code': IconCode,
  'server': IconServer,
  'file-text': IconFileText,
  'activity': IconActivity,
  'users': IconUsers,
};

// The Directus category objects carry no icon key, so every card used to fall
// back to the same `</>` mark. Follow the order the categories are authored in.
const iconOrder = ['code', 'server', 'users'];

export function SkillsSection() {
  const t = useTranslations('Skills');
  const categories = t.raw('categories') as Array<{ title: string; skills: Array<{ emoji: string; label: string }> }>;

  return (
    <Container size="lg" py="xl">
      <Title className={classes.title}>
        {t('title')}
      </Title>
      <Text c="dimmed" mt="xs" mb="xl" size="lg">
        {t('subtitle')}
      </Text>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
        {categories.map((category, index) => {
          const IconComponent = iconMap[iconOrder[index] ?? ''] || IconCode;
          return (
            <Card key={category.title} p="lg" radius={0} withBorder className={classes.card}>
              <Group mb="md" gap="sm" wrap="nowrap">
                <ThemeIcon size={34} variant="default" radius={0}>
                  <IconComponent size={18} />
                </ThemeIcon>
                <Text fw={600} size="lg">
                  {category.title}
                </Text>
              </Group>
              <Group gap={6} wrap="wrap">
                {category.skills.map(skill => (
                  <Badge key={skill.label} variant="default" leftSection="▪">
                    {skill.label}
                  </Badge>
                ))}
              </Group>
            </Card>
          );
        })}
      </SimpleGrid>
    </Container>
  );
}
