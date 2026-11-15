'use client';
import { Box, Container, Skeleton } from '@mantine/core';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import ExperienceLoading from './experience/loading';
import classes from './loading.module.scss';
import ProjectsLoading from './projects/loading';

const rule = '1px solid var(--hero-rule)';

/**
 * The group's boundary: it is the home page's fallback, and it is also what
 * paints first when a navigation enters `projects` or `experience` from here.
 * The pathname is already the destination's while it renders, so it hands the
 * other two routes their own fallback rather than inventing a second, slightly
 * different one — two shapes would mean a jump between the two loading states.
 */
export default function Loading() {
  const pathname = usePathname();

  if (pathname.endsWith('/projects')) {
    return <ProjectsLoading />;
  }

  if (pathname.endsWith('/experience')) {
    return <ExperienceLoading />;
  }

  return <HomeFirstScreen />;
}

/**
 * The home page's first screen, which is the whole of the home page's promise:
 * a full-bleed navy hero with the headline, the lede, the features column and
 * the portrait's place held open. The page below it is seven sections long and
 * this file cannot know that, so it reserves none of them.
 */
function HomeFirstScreen() {
  const bulletsT = useTranslations('HeroBullets');
  const features = bulletsT.raw('features') as Array<unknown>;

  return (
    <section className={classes.hero}>
      <Container size="lg" className={classes.container}>
        <div className={classes.headline}>
          <Skeleton className={classes.onInk} height="clamp(2.75rem, 6vw, 5rem)" width="58%" />
          <Skeleton className={classes.onInk} height="clamp(2.75rem, 6vw, 5rem)" width="34%" />

          <Box maw={606} mt="lg">
            <Skeleton className={classes.onInk} height={26} />
            <Skeleton className={classes.onInk} height={26} width="94%" mt={2} />
            <Skeleton className={classes.onInk} height={26} width="61%" mt={2} />
          </Box>
        </div>

        <div className={classes.columns}>
          <div>
            {features.map((_, index) => (
              <Box key={index} py="md" style={index === 0 ? undefined : { borderTop: rule }}>
                <Skeleton className={classes.onInk} height={10} width={128} />
                <Skeleton className={classes.onInk} height={26} mt={10} />
                <Skeleton className={classes.onInk} height={26} width="88%" mt={2} />
              </Box>
            ))}
          </div>

          <Skeleton className={`${classes.onInk} ${classes.media}`} />
        </div>
      </Container>
    </section>
  );
}
