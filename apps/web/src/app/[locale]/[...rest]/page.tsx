import { notFound } from 'next/navigation';

/* An unmatched path has to reach `[locale]/not-found.tsx`, and Next only renders a
   segment's own `not-found.tsx` for a route that segment matched. This catch-all
   is that route: it matches anything under a locale and immediately throws, so the
   404 keeps the shell, the header, and the reader's register. */
export default function CatchAll(): never {
  notFound();
}
