'use client';

import { useEffect, useRef, useState } from 'react';

import classes from './Reveal.module.scss';

type RevealState = 'idle' | 'armed' | 'in';

type RevealProps = {
  readonly children: React.ReactNode;
  readonly className?: string;
};

/**
 * Wipes its children in the first time they reach the viewport.
 *
 * The untouched render is the finished, visible one: the hidden state is only
 * ever set on the client, and only for a block that starts below the fold, so no
 * content and no layout depends on this having run.
 */
export function Reveal({ children, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<RevealState>('idle');

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    // Already on screen at hydration: leave it alone rather than flash it.
    if (element.getBoundingClientRect().top < window.innerHeight * 0.92) {
      return;
    }

    setState('armed');

    const observer = new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting)) {
        setState('in');
        observer.disconnect();
      }
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    // The observer watches this wrapper, never the wiped child: a clip-path
    // makes IntersectionObserver report the element as not visible, which would
    // deadlock the reveal it is meant to trigger.
    <div ref={ref} className={className}>
      <div className={classes.wipe} data-reveal={state === 'idle' ? undefined : state}>
        {children}
      </div>
    </div>
  );
}
