'use client';
import '../loading.module.scss';

import { Box, Container, Group, Skeleton, Stack, Timeline } from '@mantine/core';
import { useTranslations } from 'next-intl';

/**
 * The experience route: a centred title, the two timelines — work, then
 * education — and the download at the foot. The timelines are drawn rather than
 * faked as a column of bars, because they are most of the page's shape.
 */
export default function Loading() {
  const expT = useTranslations('ExperiencePage');
  const jobs = expT.raw('jobs') as Array<unknown>;

  return (
    <Container size="lg" py="xl">
      <Skeleton height="calc(clamp(2.75rem, 5.4vw, 4.5rem) * 1.02)" width="26%" mx="auto" mb="lg" />

      <Stack gap="xl">
        <div>
          <Skeleton height="calc(clamp(2rem, 3.4vw, 2.75rem) * 1.1)" width="34%" mb="md" />
          <Timeline active={Infinity} lineWidth={4} bulletSize={48}>
            {jobs.map((_, index) => (
              <Timeline.Item key={index} bullet={<Skeleton height={40} width={40} />}>
                <Skeleton height={20} width="42%" />
                <Skeleton height={14} width="30%" mt={10} />
                <Skeleton height={22} width={96} mt={10} />
                <Box mt="xs">
                  <Skeleton height={14} mt={12} />
                  <Skeleton height={14} width="92%" mt={6} />
                  <Skeleton height={14} width="68%" mt={6} />
                </Box>
              </Timeline.Item>
            ))}
          </Timeline>
        </div>

        <div>
          <Skeleton height="calc(clamp(2rem, 3.4vw, 2.75rem) * 1.1)" width="22%" mb="md" />
          <Timeline active={Infinity} lineWidth={4} bulletSize={48}>
            <Timeline.Item bullet={<Skeleton height={40} width={40} />}>
              <Skeleton height={20} width="38%" />
              <Skeleton height={14} width="26%" mt={10} />
              <Box mt="xs">
                <Skeleton height={14} mt={12} />
                <Skeleton height={14} width="74%" mt={6} />
              </Box>
            </Timeline.Item>
          </Timeline>
        </div>

        <Group justify="center" mt="xl">
          <Skeleton height={48} width={188} />
        </Group>
      </Stack>
    </Container>
  );
}
