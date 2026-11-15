'use client';
import { Box, Container, Grid, Skeleton } from '@mantine/core';
import { useTranslations } from 'next-intl';

const rule = '1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))';

/**
 * The projects route's shape: one title, a full-bleed rule, then the case rows
 * that alternate media and text. Same bars, same grid, no motion.
 */
export default function Loading() {
  const projectsT = useTranslations('Projects');
  const projects = projectsT.raw('items') as Array<unknown>;

  return (
    <Container size="lg" pt={48} pb={64}>
      <Skeleton height={46} width="42%" />

      <Box mt={32} pt={32} style={{ borderTop: rule }}>
        {projects.map((_, index) => (
          <Box key={index} pb={48} pt={index === 0 ? 0 : 48} style={index === 0 ? undefined : { borderTop: rule }}>
            <Grid gutter={48} align="flex-start">
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Skeleton style={{ aspectRatio: '16 / 10', height: 'auto' }} />
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Box pt="xs">
                  <Skeleton height={10} width={120} />
                  <Skeleton height={26} width="76%" mt={12} />
                  <Skeleton height={13} mt={18} />
                  <Skeleton height={13} width="92%" mt={7} />
                  <Skeleton height={13} width="64%" mt={7} />
                  <Box mt={19} pt="md" style={{ borderTop: rule }}>
                    <Skeleton height={10} width={104} />
                    <Skeleton height={10} width={88} mt={10} />
                  </Box>
                </Box>
              </Grid.Col>
            </Grid>
          </Box>
        ))}
      </Box>
    </Container>
  );
}
