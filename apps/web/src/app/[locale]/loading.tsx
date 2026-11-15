'use client';
import { Box, Container, Grid, Skeleton } from '@mantine/core';
import { useTranslations } from 'next-intl';

const rule = '1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))';
const frame = '1px solid light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))';

/**
 * The home route's own shape, in hairline grey: left-aligned where the page is
 * left-aligned, ruled where the page is ruled. A centred stack of floating
 * cards would promise a layout the visitor does not get.
 */
export default function Loading() {
  const bulletsT = useTranslations('HeroBullets');
  const skillsT = useTranslations('Skills');
  const features = bulletsT.raw('features') as Array<unknown>;
  const categories = skillsT.raw('categories') as Array<unknown>;

  return (
    <Container size="lg" pt={48} pb={80}>
      <Box maw={900}>
        <Skeleton height={58} width="72%" />
        <Skeleton height={58} width="46%" mt={10} />
      </Box>

      <Box maw={606} mt="lg">
        <Skeleton height={14} />
        <Skeleton height={14} width="94%" mt={8} />
        <Skeleton height={14} width="61%" mt={8} />
      </Box>

      <Grid gutter={48} mt={48} pt={40} style={{ borderTop: rule }}>
        <Grid.Col span={{ base: 12, md: 7 }}>
          {features.map((_, index) => (
            <Box key={index} py="md" style={index === 0 ? undefined : { borderTop: rule }}>
              <Skeleton height={10} width={128} />
              <Skeleton height={13} mt={10} />
              <Skeleton height={13} width="88%" mt={6} />
            </Box>
          ))}
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Skeleton style={{ aspectRatio: '4 / 3', height: 'auto' }} />
        </Grid.Col>
      </Grid>

      <Box mt={48} p="lg" style={{ border: frame }}>
        <Skeleton height={12} width={148} />
        <Box maw={720} mt={12}>
          <Skeleton height={13} width="86%" />
          <Skeleton height={13} width="54%" mt={7} />
        </Box>
      </Box>

      <Box mt={80}>
        <Skeleton height={10} width={200} />
        <Skeleton height={38} width="64%" mt={14} />
        <Skeleton height={13} width="52%" mt={12} />
      </Box>

      <Grid gutter="lg" mt={40} pt={40} style={{ borderTop: rule }}>
        {categories.map((_, index) => (
          <Grid.Col key={index} span={{ base: 12, sm: 6, md: 4 }}>
            <Box p="lg" style={{ border: rule }}>
              <Skeleton height={16} width="52%" />
              <Skeleton height={11} mt={18} />
              <Skeleton height={11} width="76%" mt={7} />
            </Box>
          </Grid.Col>
        ))}
      </Grid>
    </Container>
  );
}
