'use client';
import '../loading.module.scss';

import { Box, Container, Skeleton } from '@mantine/core';
import { useTranslations } from 'next-intl';

import classes from './loading.module.scss';

const frame = '1px solid light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))';
const caseTitle = 'calc(clamp(1.75rem, 2.6vw, 2.25rem) * 1.14)';
const pageTitle = 'calc(clamp(2.5rem, 4.6vw, 3.75rem) * 1.03)';

/**
 * The projects route as it is: a ruled page head, then one numbered case after
 * another — a full-width figure over the description and its evidence. The old
 * fallback was a two-up grid of rounded cards, so both the grid and the corner
 * style changed when the content arrived. The case count comes from the same
 * translations the page enumerates, so it is the page's own length and not a
 * guess at it.
 */
export default function Loading() {
  const projectsT = useTranslations('Projects');
  const projects = projectsT.raw('items') as Array<unknown>;

  return (
    <Container size="lg" py="xl">
      <Box pb="md" mb={48} style={{ borderBottom: frame }}>
        <Skeleton height={pageTitle} width={520} />
      </Box>

      {projects.map((_, index) => (
        <div key={index} className={classes.case}>
          <div className={classes.head}>
            <Skeleton height={10} width={120} mb="sm" />
            <Skeleton height={caseTitle} />
            <Skeleton height={caseTitle} width="68%" />
          </div>

          <Skeleton style={{ aspectRatio: '16 / 10', height: 'auto', border: frame }} />

          <div className={classes.body}>
            <div>
              <Skeleton height={26} />
              <Skeleton height={26} width="96%" mt={8} />
              <Skeleton height={26} width="72%" mt={8} />
            </div>

            <div className={classes.side}>
              <div className={classes.stats}>
                {[0, 1, 2].map(stat => (
                  <div key={stat} className={classes.stat}>
                    <Skeleton height={10} width={28} />
                    <Skeleton height={14} width="72%" mt={8} />
                  </div>
                ))}
              </div>

              <div className={classes.tech}>
                {[0, 1, 2].map(tag => (
                  <Skeleton key={tag} height={22} width={88} />
                ))}
              </div>

              <Skeleton height={40} width={156} />
            </div>
          </div>
        </div>
      ))}
    </Container>
  );
}
