'use client';
import type { MantineColorsTuple } from '@mantine/core';
import { createTheme, rem } from '@mantine/core';

// One hue, ten steps — Port of Rotterdam's ladder applied to Hutchison Ports'
// own sea blue and sky blue. A stepped ladder of a single hue is how every
// reference site escapes a monotone page; a second brand colour is not.
// shade 0 is the mid-tint register, shade 8 the primary, shade 9 the dark.
const brand: MantineColorsTuple = [
  '#f0f5fa',
  '#dfeaf4',
  '#a7c8e0',
  '#4fb4e2',
  '#009bde',
  '#0693ca',
  '#077ab7',
  '#2f4a70',
  '#002e6d',
  '#0f1d2e',
];

// Mantine derives --mantine-color-anchor from its own blue ramp and
// --mantine-color-dimmed from gray-6, and the brand ladder replaces neither:
// anchors rendered at brand-3 (2.3:1 on paper) and every c="dimmed" line at
// gray-6 (3.3:1). Both are pinned here instead of at each call site.
export const cssVariablesResolver = () => ({
  variables: {},
  light: {
    '--mantine-color-anchor': 'var(--mantine-color-brand-8)',
    '--mantine-color-dimmed': 'var(--mantine-color-gray-7)',
  },
  dark: {
    '--mantine-color-anchor': 'var(--mantine-color-brand-3)',
    '--mantine-color-dimmed': 'var(--mantine-color-gray-4)',
  },
});

export const theme = createTheme({
  primaryColor: 'brand',
  primaryShade: { light: 8, dark: 3 },
  // Square corners everywhere: the page is built out of hairlines and rules, and
  // a rounded control beside a square frame is the one mismatch the eye catches.
  defaultRadius: 0,
  // Pure black is the one tone the ladder has no step for. Mantine derives both
  // the body text colour and every `light-dark(black, white)` rule from these
  // two, so pointing black at the ladder's darkest step puts display type,
  // body text and the dark sections in the same family of ink. Pure white stays
  // white: it is the paper the page is printed on.
  black: '#0f1d2e',
  // Other components still ask for `indigo`; point it at the same ramp so the
  // palette stays navy everywhere without editing them.
  colors: { brand, indigo: brand },

  fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  // System monospace stack: JetBrains Mono is named but never loaded by
  // `next/font`, so every machine fell back to its own console face.
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',

  headings: {
    // Outfit is already loaded for the timeline titles; making it the display
    // face is what separates headings from body text at a glance. The weight is
    // 500, not 600: Outfit at display size carries itself, and a heavier cut
    // pulls the page back toward the black-and-bold register it left behind.
    fontFamily: 'var(--font-outfit), var(--font-inter), sans-serif',
    fontWeight: '500',
    sizes: {
      h1: { fontSize: 'clamp(2.75rem, 5.4vw, 4.5rem)', lineHeight: '1.02' },
      h2: { fontSize: 'clamp(2rem, 3.4vw, 2.75rem)', lineHeight: '1.1' },
      h3: { fontSize: rem(22), lineHeight: '1.25' },
    },
  },

  components: {
    Container: {
      defaultProps: { size: 'lg', px: 'md' },
    },

    Card: {
      defaultProps: { radius: 0, withBorder: true },
      styles: {
        root: {
          'transition': 'border-color 160ms ease',
          'backgroundColor': 'var(--mantine-color-body)',
          '&:hover': {
            borderColor: 'light-dark(var(--mantine-color-brand-5), var(--mantine-color-brand-4))',
          },
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        },
      },
    },

    Timeline: {
      styles: {
        itemTitle: { fontWeight: 700, fontSize: rem(18) },
        itemBullet: { borderWidth: rem(2) },
      },
    },

    Badge: {
      defaultProps: { variant: 'light', radius: 0 },
      styles: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          // padding: `${rem(4)} ${rem(8)}`,
        },
      },
    },

    Button: {
      defaultProps: { radius: 0, fw: 600 },
    },

    Title: {
      styles: {
        root: {
          letterSpacing: '-0.025em',
        },
      },
    },

    Carousel: {
      styles: {
        control: {
          'backgroundColor': 'var(--mantine-color-body)',
          'opacity': 0.8,
          '&:hover': { opacity: 1 },
        },
        indicator: {
          'width': rem(10),
          'borderRadius': 0,
          'transition': 'width 250ms ease',
          '&[data-active]': { width: rem(32) },
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        },
      },
    },
  },
});
