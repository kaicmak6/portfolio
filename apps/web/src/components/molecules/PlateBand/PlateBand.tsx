'use client';

import { Container } from '@mantine/core';
import Image from 'next/image';
import { useRef } from 'react';

import classes from './PlateBand.module.scss';

export type PlateBandProps = {
  readonly src: string;
  readonly width: number;
  readonly height: number;
  /** Mono label in the print grammar the rest of the page uses: `FIG. 01 · QUAY CRANE`. */
  readonly label: string;
  readonly caption: string;
  /** Which corner the tonal wedge rises from. Alternates down the page. */
  readonly align?: 'start' | 'end';
  readonly priority?: boolean;
};

/**
 * A full-bleed photographic plate at the page's one wide ratio, with a flat
 * navy wedge carrying its caption. The image is absolutely positioned inside
 * its own 16:9 box, so it can drift for depth without ever moving layout.
 */
export function PlateBand({
  src,
  width,
  height,
  label,
  caption,
  align = 'start',
  priority = false,
}: PlateBandProps) {
  const hostRef = useRef<HTMLElement>(null);

  // Pointer depth: two layers move at different rates. Bounded to a few pixels
  // and inert under reduced motion.
  const handleMove = (event: React.PointerEvent<HTMLElement>) => {
    const host = hostRef.current;
    if (!host || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const rect = host.getBoundingClientRect();
    host.style.setProperty('--px', `${((event.clientX - rect.left) / rect.width - 0.5) * 2}`);
    host.style.setProperty('--py', `${((event.clientY - rect.top) / rect.height - 0.5) * 2}`);
  };

  const handleLeave = () => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    host.style.removeProperty('--px');
    host.style.removeProperty('--py');
  };

  return (
    <section
      ref={hostRef}
      className={`${classes.band} ${align === 'end' ? classes.flip : ''}`}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
    >
      <div className={classes.plate} aria-hidden="true">
        <div className={classes.photo}>
          <Image
            src={src}
            alt=""
            width={width}
            height={height}
            sizes="100vw"
            priority={priority}
            // The optimizer resolves a local `src` against its own root, which
            // drops BASE_PATH and 404s; these plates are already 16-98KB webp.
            unoptimized
            className={classes.image}
          />
        </div>
      </div>
      <div className={classes.wedge} aria-hidden="true" />
      <Container size="lg" className={classes.inner}>
        <div className={classes.copy}>
          <span className={classes.label}>{label}</span>
          <p className={classes.caption}>{caption}</p>
        </div>
      </Container>
    </section>
  );
}
