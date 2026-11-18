'use client';

import { Container } from '@mantine/core';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef } from 'react';

import classes from './OperationsBand.module.scss';

/* One band, two panes: a container terminal and an airport approach. The band is
   the page's dark register — port operations and night approaches are literally
   night work, so the ink is inverted rather than tinted, and the only colour is
   the approach-light accent.

   The terminal is drawn in elevation, which is how a ship-to-shore gantry is
   always drawn — the boom stays horizontal and the trolley is unmistakable. The
   approach is one-point perspective. Both use the same four-value ink ramp, the
   same stroke weights, and the same ground line, so they read as two views of
   one display rather than two illustrations. */

type Variant = 'terminal' | 'approach';

type Tone = 0 | 1 | 2 | 3;

type Weight = 1 | 1.5 | 2.5;

type Ramp = readonly [string, string, string, string];

/* Canvas coordinates, y pointing down. */
type XY = readonly [number, number];

type Line = { a: XY; b: XY; tone: Tone; weight: Weight; accent?: boolean };

type HotLine = Line & { alpha: number };

type Ink = { lines: Line[]; hot: HotLine[]; fills: Array<{ path: Path2D; alpha: number }> };

const createInk = (): Ink => ({ lines: [], hot: [], fills: [] });

/* The shared ground line: the quay edge and the runway threshold both sit here,
   which is what makes the two panes read as one drawing. */
const GROUND = 0.87;

/* Two loops, both quoted in the pane head: the crane works a twenty-second
   cycle, the approach fires for six seconds and holds for three. */
const CYCLE = 20;
const FLASH_S = 1.6;
const APPROACH_RUN = 6;
const APPROACH_HOLD = 3;
const LAMPS = 8;

/* One horizontal pixel of drag is this many seconds of timeline, so a full
   twenty-second cycle is a comfortable arm movement across the band. */
const SCRUB_PX_PER_S = 45;

/* ------------------------------------------------------------------ terminal */

/* Elevation, in container-width units. x along the berth, y up from the quay,
   which is negated once at the end so the canvas can draw it directly. */
const QUAY_TO = 20.8;

/* The water's surface. The hull's shell sits in this level and the wave
   strokes fill the berth below it, so the berth reads as water rather than as
   a shadow line under a platform. */
const WATER_Y = -1.15;
const WAVE_Y = [-1.38, -1.6, -1.82, -2.04, -2.26] as const;

const TIER_H = 1.15;
const LEG_FRONT = 2.6;
const LEG_BACK = 7.6;
const CRANE_H = 9.8;
const GIRDER_Y = CRANE_H + 2.2;
const BOOM_TIP = -8;
const BOOM_Y = CRANE_H - 0.4;
const BOOM_AFT = LEG_BACK + 2;
const STACK_W = 4.6;
const BAY = 1.5;
const STACK_DX = 0.55;
const STACK_DY = 0.42;

/* The vessel alongside: stern aft at the left, bow forward at the right, her
   working length under the boom — the relation a berth reader checks first. Her
   hull is shallow against a long waterline, her deck steps up at the forecastle
   and falls to the transom, and the accommodation and funnel stand over the
   after deck: a low long hull with boxes on the deck is the silhouette of a
   laden box ship, while a deep short hull with one flat deck and one rake is the
   silhouette of a barge. */
const BOW = -15.5;
const STEM_RAKE = 1.7;
const STERN = -2;
const DECK_Y = 1.95;
const SHEER = 1.25;
const FORECASTLE = BOW + 2.5;
const HOUSE_AFT = STERN - 2.6;
const HOUSE_FWD = STERN;
const HOUSE_H = 3.1;
const COAMING = 0.24;

/* Both drawings are laid out in the same units and fitted to the same share of
   the pane width, so the pair lands at one size on one ground line and their
   captions share one inset. The fit pins each subject's left edge to INSET, so a
   caption set to the same inset starts exactly where its drawing starts,
   whichever constraint ends up sizing it. */
const INSET = 1.5;
const HEADROOM = 30;
const FAR_Y = 10.5;

const terminalInk = (t: number): Ink => {
  const ink = createInk();
  const add = (x1: number, y1: number, x2: number, y2: number, tone: Tone, weight: Weight = 1, accent = false) =>
    ink.lines.push({ a: [x1, -y1], b: [x2, -y2], tone, weight, accent });

  /* Water is a plane, not a rule under a line. The level runs from the stem's
     foot to the quay's face, and five broken strokes below it carry the surface
     in front of the ship, so the waterline, the quay's face and the hull are
     three different lines around one plane instead of one line with a shadow
     under it. Nothing is drawn under the quay, because land is not water, and
     nothing runs forward of the bow, because the caption is anchored to that
     bow and not to a wave that happens to reach furthest. */
  add(BOW + STEM_RAKE, WATER_Y, 0, WATER_Y, 2, 1.5);
  /* Five broken levels of surface, running the full width of the water from
     ahead of the stem to the quay's face, so the water is the plane the ship
     sits in and the berth is part of it. The breaks are staggered, so the level
     reads as a surface rather than as a ruled stripe. */
  add(BOW + 0.55, WAVE_Y[0], -0.1, WAVE_Y[0], 1);
  add(BOW + 0.7, WAVE_Y[1], -0.1, WAVE_Y[1], 0);
  add(BOW + 0.5, WAVE_Y[2], -0.1, WAVE_Y[2], 1);
  add(BOW + 0.85, WAVE_Y[3], -0.1, WAVE_Y[3], 0);
  add(BOW + 0.6, WAVE_Y[4], -0.1, WAVE_Y[4], 0);
  /* Two heavier crests riding the top level, so the plane has articulation and
     not only rules. They stop short of the berth edge, as a crest would. */
  add(BOW + 2.2, WAVE_Y[0], BOW + 5.6, WAVE_Y[0], 2, 1.5);
  add(BOW + 6.6, WAVE_Y[1], BOW + 9.4, WAVE_Y[1], 2, 1.5);

  /* A berthed box ship: a raked stem, a deck that steps up at the forecastle and
     falls to the transom, hatch coamings carrying deck stow between, and the
     accommodation and funnel over the after deck. Each of those is a word a
     berth reader looks for, and their absence is what makes a hull read as a
     barge. */
  /* The hull is ONE outline, written as a point list so a rectangle cannot be
     drawn by accident: bow head, forecastle deck, the step to the main deck, the
     transom, the waterline aft, the stem's foot, then back up the rake. */
  const bowHead: XY = [BOW, DECK_Y + SHEER];
  const fcDeck: XY = [FORECASTLE, DECK_Y + SHEER];
  const fcFoot: XY = [FORECASTLE, DECK_Y];
  const sternDeck: XY = [STERN, DECK_Y];
  const sternFoot: XY = [STERN, WATER_Y];
  const stemFoot: XY = [BOW + STEM_RAKE, WATER_Y];
  const edge = (a: XY, b: XY) => add(a[0], a[1], b[0], b[1], 3, 1.5);
  edge(bowHead, fcDeck);
  edge(fcDeck, fcFoot);
  edge(fcFoot, sternDeck);
  edge(sternDeck, sternFoot);
  edge(sternFoot, stemFoot);
  edge(stemFoot, bowHead);
  /* The foremast on the raised deck. Two short lines, and the forward end stops
     being a deck line that happens to end: it is the top of a ship. */
  const mastX = BOW + 0.6;
  add(mastX, DECK_Y + SHEER, mastX, DECK_Y + SHEER + 1.8, 3, 1.5);
  add(mastX - 0.45, DECK_Y + SHEER + 1.45, mastX + 0.45, DECK_Y + SHEER + 1.45, 2);

  /* The hull is a mass, not an outline: the same wash the stacks carry on
     their top faces, over the whole side, so the ship reads as a solid body in
     the water instead of as a wireframe box. */
  const hull = new Path2D();
  hull.moveTo(bowHead[0], -bowHead[1]);
  for (const p of [fcDeck, fcFoot, sternDeck, sternFoot, stemFoot]) {
    hull.lineTo(p[0], -p[1]);
  }
  hull.closePath();
  ink.fills.push({ path: hull, alpha: 0.14 });

  /* Hatch coamings carrying deck stow: the boxes the spreader works over. The
     stow is what makes a box ship read as one — a coaming with nothing in it is
     an open hold, and a ship whose deck is bare reads as a barge under tow.
     Bays are spaced near a container's own length, so the stow reads as rows of
     boxes rather than as a row of chimneys. */
  const hatch = (x0: number, x1: number, tiers: number) => {
    const sill = DECK_Y + COAMING;
    add(x0, DECK_Y, x0, sill, 3, 1.5);
    add(x0, sill, x1, sill, 3, 1.5);
    add(x1, sill, x1, DECK_Y, 3, 1.5);
    if (tiers === 0) {
      return;
    }
    const top = sill + tiers * TIER_H;
    add(x0, sill, x0, top, 3, 1.5);
    add(x1, sill, x1, top, 3, 1.5);
    add(x0, top, x1, top, 3, 1.5);
    for (let tier = 1; tier < tiers; tier += 1) {
      add(x0, sill + tier * TIER_H, x1, sill + tier * TIER_H, 1);
    }
    /* No vertical seam inside a run: two tiers of one hold are a long, low mass,
       and a seam at a 1.5-unit pitch would cut it into cells taller than they are
       wide — which reads as windows rather than as deck stow. */
    /* Solid, like the yard stacks: deck stow is a mass of boxes, and an unfilled
       outline of one reads as an empty hold frame. */
    const stow = new Path2D();
    stow.rect(x0, -top, x1 - x0, top - sill);
    ink.fills.push({ path: stow, alpha: 0.1 });
  };
  hatch(-12.8, -8.8, 2);
  hatch(-8.4, -4.8, 2);

  /* Accommodation and funnel over the after deck: the superstructure is the
     signature of the aft end, and it puts the house where a reader expects it —
     a tall block against the transom, two window rules, and one funnel above. */
  const houseTop = DECK_Y + HOUSE_H;
  add(HOUSE_AFT, DECK_Y, HOUSE_AFT, houseTop, 3, 1.5);
  add(HOUSE_FWD, DECK_Y, HOUSE_FWD, houseTop, 3, 1.5);
  add(HOUSE_AFT, houseTop, HOUSE_FWD, houseTop, 3, 1.5);
  add(HOUSE_AFT, houseTop - 0.75, HOUSE_FWD, houseTop - 0.75, 3, 1.5);
  add(HOUSE_AFT, houseTop - 1.5, HOUSE_FWD, houseTop - 1.5, 1);
  add(HOUSE_AFT + 0.85, houseTop, HOUSE_AFT + 0.85, houseTop + 1.65, 3, 1.5);
  add(HOUSE_FWD - 0.55, houseTop, HOUSE_FWD - 0.55, houseTop + 1.65, 3, 1.5);
  add(HOUSE_AFT + 0.85, houseTop + 1.65, HOUSE_FWD - 0.55, houseTop + 1.65, 3, 1.5);
  const house = new Path2D();
  house.rect(HOUSE_AFT, -houseTop, HOUSE_FWD - HOUSE_AFT, houseTop - DECK_Y);
  ink.fills.push({ path: house, alpha: 0.14 });

  /* Quay: coping, its face down to the water at the berth edge, bollards. */
  add(0, 0, QUAY_TO, 0, 3, 1.5);
  add(0, 0, 0, WATER_Y, 3, 1.5);
  for (let x = 0.6; x < QUAY_TO; x += 3.4) {
    add(x, 0, x, 0.5, 1);
  }

  /* A container stack: front face, a shallow oblique top and right face so the
     block has depth without tilting the crane, one seam per tier. */
  const stack = (x: number, tiers: number, flash: number) => {
    const w = STACK_W;
    const h = tiers * TIER_H;
    const x1 = x + w;

    add(x, h, x1, h, 3);
    add(x1, h, x1 + STACK_DX, h - STACK_DY, 2);
    add(x1 + STACK_DX, h - STACK_DY, x, h - STACK_DY, 2);
    add(x, 0, x, h, 3);
    add(x1, 0, x1, h, 3);
    add(x1, 0, x1 + STACK_DX, -STACK_DY, 2);
    add(x1 + STACK_DX, -STACK_DY, x1 + STACK_DX, h - STACK_DY, 2);
    add(x, 0, x1, 0, 3);

    for (let tier = 1; tier < tiers; tier += 1) {
      const y = tier * TIER_H;
      add(x, y, x1, y, 1);
      add(x1, y, x1 + STACK_DX, y - STACK_DY, 1);
    }

    /* Vertical bay seams on the front face: what makes a stack read as boxes of
       containers rather than as a long shed. */
    for (let bay = BAY; bay < w; bay += BAY) {
      add(x + bay, 0, x + bay, h, 0);
    }

    const top = new Path2D();
    top.moveTo(x, -h);
    top.lineTo(x1, -h);
    top.lineTo(x1 + STACK_DX, -(h - STACK_DY));
    top.lineTo(x, -(h - STACK_DY));
    top.closePath();
    ink.fills.push({ path: top, alpha: 0.1 });

    if (flash > 0.05) {
      const outline: ReadonlyArray<readonly [XY, XY]> = [
        [[x, -h], [x1, -h]],
        [[x1, -h], [x1 + STACK_DX, -(h - STACK_DY)]],
        [[x1 + STACK_DX, -(h - STACK_DY)], [x, -(h - STACK_DY)]],
        [[x, -(h - STACK_DY)], [x, -h]],
      ];
      for (const [a, b] of outline) {
        ink.hot.push({ a, b, tone: 3, weight: 2.5, alpha: flash, accent: true });
      }
    }
  };

  /* Two blocks drawn to one convention: same width, same tiers, same seams, so
     the yard reads as one yard. The far block flashes while a move lands; the
     near block keeps one landed container in the accent at rest, so this pane
     is never all ladder and the accent always means the same thing. */
  const lead = Math.sin(Math.min((t % CYCLE) / FLASH_S, 1) * Math.PI) * 0.9;
  stack(9.4, 4, 0);
  stack(15.4, 4, lead);

  /* One container, one bay wide, seated on the near stack's top border rather
     than floating over it: its bottom edge is the stack's own top line and its
     width is the bay pitch, so it reads as a box that has just landed. */
  const stackTop = 4 * TIER_H;
  const accentTo = 9.55 + BAY;
  add(9.55, stackTop, accentTo, stackTop, 3, 1.5, true);
  add(9.55, stackTop + TIER_H, accentTo, stackTop + TIER_H, 3, 1.5, true);
  add(9.55, stackTop, 9.55, stackTop + TIER_H, 3, 1.5, true);
  add(accentTo, stackTop, accentTo, stackTop + TIER_H, 3, 1.5, true);

  /* Ship-to-shore gantry: two legs up to a flat top girder, the portal beam at
     the sill, and the boom reaching out over the water. The girder is flat, not
     pitched — a pitched apex reads as a building roof, and a port reader is the
     first person who sees this pane. */
  for (const lx of [LEG_FRONT, LEG_BACK]) {
    add(lx, 0, lx, GIRDER_Y, 3);
  }
  add(LEG_FRONT, CRANE_H, LEG_BACK, CRANE_H, 3, 1.5);

  /* Top girder, slightly overhanging each leg, and the short backstay running
     from its landward end down to the aft end of the boom. */
  add(LEG_FRONT - 0.6, GIRDER_Y, LEG_BACK + 0.6, GIRDER_Y, 3, 2.5);
  add(LEG_BACK + 0.6, GIRDER_Y, BOOM_AFT, BOOM_Y, 2);

  /* Boom: upper and lower chord with hangers between, running from the landward
     end out past the quay edge. */
  add(BOOM_AFT, BOOM_Y, BOOM_TIP, BOOM_Y, 3, 1.5);
  add(LEG_BACK, BOOM_Y - 1.5, BOOM_TIP + 0.8, BOOM_Y - 1.5, 2);
  add(BOOM_TIP, BOOM_Y, BOOM_TIP + 0.8, BOOM_Y - 1.5, 3, 1.5);
  for (let x = LEG_BACK - 1.1; x > BOOM_TIP + 0.9; x -= 1.5) {
    add(x, BOOM_Y, x, BOOM_Y - 1.5, 1);
  }

  /* Machinery house: inside the portal, clear of the boom and of the girder. */
  add(LEG_FRONT + 0.7, CRANE_H - 1.55, LEG_BACK - 0.7, CRANE_H - 1.55, 3, 1.5);
  add(LEG_BACK - 0.7, CRANE_H - 1.55, LEG_BACK - 0.7, CRANE_H - 0.3, 3);
  add(LEG_BACK - 0.7, CRANE_H - 0.3, LEG_FRONT + 0.7, CRANE_H - 0.3, 3, 1.5);
  add(LEG_FRONT + 0.7, CRANE_H - 0.3, LEG_FRONT + 0.7, CRANE_H - 1.55, 3);

  /* Trolley: a block on the boom, a rope, a spreader, and a container on the
     spreader. Travel is eased on the square so the spreader stands out over the
     decks through most of the cycle and swings in over the quay quickly: the
     gantry is berthed to work the ship, not to serve the yard. */
  const swing = 0.5 - 0.5 * Math.cos((t / CYCLE) * Math.PI * 2);
  const travel = swing * swing;
  const outboard = BOOM_TIP + 1;
  const inboard = LEG_BACK - 0.8;
  const tx = outboard + travel * (inboard - outboard);
  const hoist = BOOM_Y - 2;
  const boxY = hoist - TIER_H;

  add(tx - 0.55, BOOM_Y, tx + 0.55, BOOM_Y, 3, 1.5);
  add(tx - 0.55, BOOM_Y - 0.7, tx + 0.55, BOOM_Y - 0.7, 3, 1.5);
  add(tx - 0.55, BOOM_Y, tx - 0.55, BOOM_Y - 0.7, 3);
  add(tx + 0.55, BOOM_Y, tx + 0.55, BOOM_Y - 0.7, 3);
  add(tx, BOOM_Y - 0.7, tx, hoist, 3);
  add(tx - 1.5, hoist, tx + 1.5, hoist, 3, 2.5);
  add(tx - 1.5, hoist, tx - 1.5, hoist - 0.25, 2);
  add(tx + 1.5, hoist, tx + 1.5, hoist - 0.25, 2);

  /* The load: one tier of container, hung on the spreader. */
  add(tx - 1.5, hoist - 0.25, tx - 1.5, boxY, 3);
  add(tx + 1.5, hoist - 0.25, tx + 1.5, boxY, 3);
  add(tx - 1.5, boxY, tx + 1.5, boxY, 3, 1.5);
  add(tx - 0.5, hoist - 0.25, tx - 0.5, boxY, 1);
  add(tx + 0.5, hoist - 0.25, tx + 0.5, boxY, 1);

  const load = new Path2D();
  load.moveTo(tx - 1.5, -(hoist - 0.25));
  load.lineTo(tx + 1.5, -(hoist - 0.25));
  load.lineTo(tx + 1.5, -boxY);
  load.lineTo(tx - 1.5, -boxY);
  load.closePath();
  ink.fills.push({ path: load, alpha: 0.14 });

  return ink;
};

/* Both drawings are laid out in the same units, and each is fitted to the same
   share of the pane width, so the pair lands at one size on one ground line and
   both captions start at the same inset. The scale is also capped by the height
   above the ground line, so neither drawing can crowd the pane's top edge. */
const fitInk = (ink: Ink, w: number, h: number): Ink => {
  let minX = Infinity;
  let maxX = -Infinity;
  let maxUp = 0;
  let maxDown = 0;
  const measure = (line: Line) => {
    minX = Math.min(minX, line.a[0], line.b[0]);
    maxX = Math.max(maxX, line.a[0], line.b[0]);
    maxUp = Math.max(maxUp, -line.a[1], -line.b[1]);
    maxDown = Math.max(maxDown, line.a[1], line.b[1]);
  };
  for (const line of ink.lines) {
    measure(line);
  }
  for (const line of ink.hot) {
    measure(line);
  }

  const span = maxX - minX;
  const scale = Math.min(
    (w - INSET * 2) / span,
    (h * GROUND - HEADROOM) / maxUp,
    (h * (1 - GROUND) - 4) / Math.max(maxDown, 0.001),
  );
  const ox = INSET - minX * scale;
  const oy = h * GROUND;

  const map = ([px, py]: XY): XY => [ox + px * scale, oy + py * scale];

  /* Fills are in pre-fit coordinates, so they have to be rebuilt rather than
     moved; both are simple boxes and the transform is affine. */
  const fills = ink.fills.map(({ path, alpha }) => {
    const moved = new Path2D();
    moved.addPath(path, new DOMMatrix([scale, 0, 0, scale, ox, oy]));
    return { path: moved, alpha };
  });

  return {
    lines: ink.lines.map(line => ({ ...line, a: map(line.a), b: map(line.b) })),
    hot: ink.hot.map(line => ({ ...line, a: map(line.a), b: map(line.b) })),
    fills,
  };
};

/* ------------------------------------------------------------------ approach */

/* The approach, in the same units as the terminal: x across, y up from the
   threshold. One scale and one ground line then carry both panes, and neither
   drawing can be sized against the other. */
const NEAR_HALF = 13;
const DEPTH = 1.6;

const approachInk = (t: number): Ink => {
  const ink = createInk();
  /* Same convention as the terminal: y up from the threshold, negated once here
     so both panes hand the canvas coordinates in canvas space. */
  const add = (a: XY, b: XY, tone: Tone, weight: Weight = 1, accent = false) =>
    ink.lines.push({ a: [a[0], -a[1]], b: [b[0], -b[1]], tone, weight, accent });

  /* Depth is projective: one factor drives both the height of a marking and its
     half-width, so a bar can never spill past the runway edge, and the gaps
     between rows close up toward the far end instead of marching at one pitch. */
  const shrink = (u: number) => 1 / (1 + u * DEPTH);
  const far = shrink(1);
  const yAt = (u: number) => (FAR_Y * (1 - shrink(u))) / (1 - far);
  const halfAt = (u: number) => NEAR_HALF * shrink(u);
  const farHalf = halfAt(1);

  /* The far threshold, and the two edges running back to this one. The far bar
     spans the runaway at its own width, not the near one, or the top of the
     pane reads as a horizon line instead of as the other end of a runway. */
  add([-farHalf, FAR_Y], [farHalf, FAR_Y], 3, 1.5);
  add([-NEAR_HALF, 0], [-farHalf, FAR_Y], 3, 1.5);
  add([NEAR_HALF, 0], [farHalf, FAR_Y], 3, 1.5);

  /* Centreline dashes, shortening with distance. */
  for (let i = 0; i < 8; i += 1) {
    const u0 = 0.03 + i * 0.115;
    add([0, yAt(u0)], [0, yAt(u0 + 0.042)], 1);
  }

  /* A runway threshold is a split bar, not one line. */
  const gap = NEAR_HALF * 0.1;
  add([-NEAR_HALF, 0], [-gap, 0], 3, 1.5);
  add([gap, 0], [NEAR_HALF, 0], 3, 1.5);

  /* The ground in front of the threshold. Stopping the runway at the threshold
     leaves the pane's lowest band empty, so the edge lines carry on to the
     viewer, splaying as they come, and the approach rows below sit on that
     ground: the near ground reads as pavement the eye can gauge, not as the end
     of a diagram. */
  const FORE = -1.95;
  const splay = (y: number) => NEAR_HALF * (1 - y * 0.075);

  /* Approach path: one dashed arc from above the frame down to the threshold,
     landing inside the runway's own width so the pane carries no lopsided
     margin, and left of the touchdown-zone lights so its dashes never
     interleave with the lamp bars. Visible at rest as well as mid-sequence. */
  const start: XY = [-1.4, 11.2];
  const ctrl: XY = [-3.2, 7.2];
  const end: XY = [-NEAR_HALF * 0.6, 0.35];
  const at = (v: number): XY => {
    const r = 1 - v;
    return [
      r * r * start[0] + 2 * r * v * ctrl[0] + v * v * end[0],
      r * r * start[1] + 2 * r * v * ctrl[1] + v * v * end[1],
    ];
  };
  const steps = 40;
  for (let i = 0; i < steps; i += 2) {
    add(at(i / steps), at((i + 1) / steps), 2);
  }

  /* Rows are spaced in screen height, not in depth: a runway's perspective
     compresses toward the horizon, so the pitch has to grow by a constant ratio
     as the rows come nearer. Stepping evenly in depth does the opposite and
     leaves the widest gaps at the far end, which reads as a runway lit
     backwards. */
  const NEAR_ROW = 0.4;
  const ROW_RATIO = 1.3;
  const rowGap = ((FAR_Y - NEAR_ROW) * (ROW_RATIO - 1)) / (ROW_RATIO ** (LAMPS - 1) - 1);

  /* The rabbit. The three states differ in ink and not only in length: unlit is
     a short faint bar, just-fired is a mid-value bar at half length, and firing
     is the accent — the only colour in the band. It also runs from the far end
     to the threshold, so the hold leaves the nearest three rows lit and the
     heavy ink always sits where the runway is closest. */
  const cycle = t % (APPROACH_RUN + APPROACH_HOLD);
  const running = cycle < APPROACH_RUN;
  const phase = running ? cycle / APPROACH_RUN : 1;
  const head = running ? Math.min(LAMPS - 1, 2 + Math.floor(phase * (LAMPS - 2))) : LAMPS - 1;

  /* Runway lamps, from just inside the far end down to the threshold: the far
     threshold bar is the runway's own end line, not a lamp row, so the rows
     start one pitch in and never read as a heavy bar at the top of the pane. */
  let y = FAR_Y - rowGap;
  for (let i = 0; i < LAMPS; i += 1) {
    /* Shrinkage is what carries both the half-width and the pitch, so a row's
       bar can never spill past the runway edge at its own depth. */
    const half = NEAR_HALF * (1 - (y * (1 - far)) / FAR_Y);
    const arm = half * 0.5;
    const near = i > (LAMPS - 1) * 0.62;
    const firing = i <= head && i >= head - 2;
    /* Every row has one shape, and depth alone carries the ink: the nearest
       rows are the heaviest bars whether or not they are firing, so the runway
       can never read as lit at the far end and empty at the near one. Firing
       crosses a bar with an accent tick, which is what a lamp does, and never
       lengthens or recolours it. */
    const tone: Tone = near ? 3 : i > (LAMPS - 1) / 3 ? 2 : 1;
    const weight: Weight = near ? 2.5 : i > (LAMPS - 1) / 3 ? 1.5 : 1;
    add([-arm * 0.72, y], [-arm * 0.28, y], tone, weight);
    add([arm * 0.28, y], [arm * 0.72, y], tone, weight);
    /* The travelling head is a hairline tick until it reaches the near end: a
       heavy accent at the far end would make the runway read brightest where it
       is furthest away, which fights the perspective the bars themselves carry.
       Only the three nearest rows take the accent, so the colour always sits
       where the runway is closest. */
    if (firing) {
      const tick = 0.3 + y * 0.022;
      add([-arm * 0.5, y - tick], [-arm * 0.5, y + tick], 3, near ? 2.5 : 1, near);
      add([arm * 0.5, y - tick], [arm * 0.5, y + tick], 3, near ? 2.5 : 1, near);
    }
    y -= rowGap * ROW_RATIO ** i;
  }

  /* Pavement in front of the threshold: the edge lines carried out to the
     viewer, one centreline dash, and three touchdown-zone pairs that widen as
     they come. Without it the pane's lowest band is empty and the drawing ends
     at a line; with it the near ground is a surface the eye can gauge. */
  add([-NEAR_HALF, 0], [-splay(FORE), FORE], 2, 1.5);
  add([NEAR_HALF, 0], [splay(FORE), FORE], 2, 1.5);
  add([0, -0.55], [0, -1.5], 1);
  /* Each pair is short — a touchdown-zone bar, not a carriageway — so the
     sequence runs on from the 45 px lamp row above into a 60–70 px pair instead
     of jumping four-fold, which read as a separate object rather than as the
     next marking in the same approach. */
  for (const by of [-0.55, -1.15, -1.75]) {
    const edge = splay(by);
    add([-edge * 0.86, by], [-edge * 0.55, by], 2, 1.5);
    add([edge * 0.55, by], [edge * 0.86, by], 2, 1.5);
  }

  /* Aircraft on final, sitting on the arc it is following. The apex is the nose
     and it points at the threshold, because an aircraft seen from the ground on
     final approaches rather than departs. During the hold it sits at the
     touchdown end of the arc, so the still frame always has an aircraft in it
     and always at the threshold the lights have just run to. */
  const [ax, ay] = at(running ? 0.16 + phase * 0.72 : 0.98);
  const nose = 0.95;
  const wing = 0.42;
  add([ax, ay - nose], [ax - wing, ay], 3);
  add([ax, ay - nose], [ax + wing, ay], 3);
  add([ax - wing, ay], [ax + wing, ay], 3);

  return ink;
};

/* --------------------------------------------------------------------- paint */

const sceneInk = (variant: Variant, w: number, h: number, t: number): Ink => {
  return fitInk(variant === 'approach' ? approachInk(t) : terminalInk(t), w, h);
};

/* Fill ink on the dark ground is a light wash, not navy. */
const FILL_RGB = '154, 202, 235';

const paint = (ctx: CanvasRenderingContext2D, ink: Ink, ramp: Ramp, accent: string) => {
  for (const fill of ink.fills) {
    ctx.fillStyle = `rgba(${FILL_RGB}, ${fill.alpha})`;
    ctx.fill(fill.path);
  }

  const buckets = new Map<string, Path2D>();
  const meta = new Map<string, { weight: Weight; tone: Tone; accent: boolean }>();
  for (const line of ink.lines) {
    const isAccent = line.accent === true;
    const key = `${line.weight}:${line.tone}:${isAccent ? 'a' : 'i'}`;
    let path = buckets.get(key);
    if (!path) {
      path = new Path2D();
      buckets.set(key, path);
      meta.set(key, { weight: line.weight, tone: line.tone, accent: isAccent });
    }
    path.moveTo(line.a[0], line.a[1]);
    path.lineTo(line.b[0], line.b[1]);
  }

  ctx.globalAlpha = 1;
  for (const [key, path] of buckets) {
    const info = meta.get(key);
    if (!info) {
      continue;
    }
    ctx.lineWidth = info.weight;
    ctx.strokeStyle = info.accent ? accent : ramp[info.tone];
    ctx.stroke(path);
  }

  for (const line of ink.hot) {
    ctx.lineWidth = line.weight;
    ctx.strokeStyle = line.accent === true ? accent : ramp[line.tone];
    ctx.globalAlpha = line.alpha;
    ctx.beginPath();
    ctx.moveTo(line.a[0], line.a[1]);
    ctx.lineTo(line.b[0], line.b[1]);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
};

const readInk = (host: HTMLElement) => {
  const style = getComputedStyle(host);
  const value = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  const ramp: Ramp = [
    value('--ops-ink-0', '#a7c8e040'),
    value('--ops-ink-1', '#a7c8e073'),
    value('--ops-ink-2', '#b7d9eea6'),
    value('--ops-ink-3', '#eef4fa'),
  ];
  return { ramp, accent: value('--ops-accent', '#ffc627') };
};

/* ---------------------------------------------------------------------- pane */

type Paint = (t: number) => void;

type Clock = { manual: boolean; value: number };

type PaneProps = {
  variant: Variant;
  label: string;
  loop: string;
  caption: string;
  clock: React.RefObject<Clock>;
  register: (paint: Paint) => () => void;
};

const Pane = ({ variant, label, loop, caption, clock, register }: PaneProps) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const { ramp, accent } = readInk(host);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let running = false;
    let visible = false;
    let width = 0;
    let height = 0;
    let started = 0;

    const draw = (t: number) => {
      if (width === 0 || height === 0) {
        return;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const dpr = canvas.width / width;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'butt';
      const ink = sceneInk(variant, width, height, t);
      paint(ctx, ink, ramp, accent);
      canvas.dataset.segments = String(ink.lines.length + ink.hot.length);
    };

    const unregister = register(draw);

    const stop = () => {
      running = false;
      window.cancelAnimationFrame(frame);
    };

    const tick = (now: number) => {
      if (clock.current?.manual) {
        stop();
        return;
      }
      draw((now - started) / 1000);
      frame = window.requestAnimationFrame(tick);
    };

    const play = () => {
      if (running || !visible || reduced.matches || document.visibilityState === 'hidden') {
        return;
      }
      if (clock.current?.manual) {
        return;
      }
      running = true;
      started = performance.now() - (clock.current?.value ?? 0) * 1000;
      frame = window.requestAnimationFrame(tick);
    };

    /* A still has to stand on its own, so it is taken mid-cycle rather than at
       t=0 where nothing is moving yet — and for the approach that means inside
       the hold, where the sequence has reached the threshold and the three
       nearest rows are lit. A still caught mid-run would put the accent in the
       far half and read as a runway lit backwards. */
    const still = variant === 'terminal' ? 2.62 : 7.4;

    const resize = () => {
      const box = canvas.getBoundingClientRect();
      width = Math.round(box.width);
      height = Math.round(box.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      draw(reduced.matches ? still : (clock.current?.value ?? 0));
      if (!reduced.matches) {
        play();
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        stop();
      } else {
        play();
      }
    };

    const onMotion = () => {
      if (reduced.matches) {
        stop();
        draw(still);
      } else {
        play();
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        visible = entries.some(entry => entry.isIntersecting);
        if (visible) {
          play();
        } else {
          stop();
        }
      },
      { rootMargin: '120px' },
    );
    observer.observe(canvas);

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    document.addEventListener('visibilitychange', onVisibility);
    reduced.addEventListener('change', onMotion);

    return () => {
      stop();
      unregister();
      observer.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      reduced.removeEventListener('change', onMotion);
    };
  }, [variant, clock, register]);

  return (
    <div className={classes.pane} ref={hostRef}>
      <div className={classes.paneHead}>
        <span className={classes.eyebrow}>{label}</span>
        <span className={classes.loop}>{loop}</span>
      </div>
      <div className={classes.stage}>
        <canvas ref={canvasRef} aria-hidden="true" />
      </div>
      <p className={classes.caption}>{caption}</p>
    </div>
  );
};

/* ---------------------------------------------------------------------- band */

export const OperationsBand = () => {
  const t = useTranslations('OperationsBand');
  /* One clock for both panes: they are one display, so a drag moves both
     timelines together and autoplay resumes from the scrubbed time. */
  const clock = useRef<Clock>({ manual: false, value: 0 });
  const painters = useRef<Paint[]>([]);
  const drag = useRef<{ x: number; start: number; moved: boolean } | null>(null);
  const bandRef = useRef<HTMLElement>(null);

  const register = useCallback((paint: Paint) => {
    painters.current.push(paint);
    return () => {
      painters.current = painters.current.filter(entry => entry !== paint);
    };
  }, []);

  const repaint = () => {
    const value = clock.current?.value ?? 0;
    /* The clock is quoted on the element so a scripted drag can prove the
       timeline actually moved. */
    bandRef.current?.setAttribute('data-clock', value.toFixed(2));
    for (const paint of painters.current) {
      paint(value);
    }
  };

  /* Precedence rule: a drag pauses autoplay and the band stays paused for as
     long as it remains on screen. Leaving the viewport releases the hold, so the
     next visit plays normally — autoplay never fights a hand. */
  useEffect(() => {
    const host = bandRef.current;
    if (!host) {
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      const onScreen = entries.some(entry => entry.isIntersecting);
      if (!onScreen && clock.current?.manual) {
        clock.current.manual = false;
        clock.current.value = 0;
        host.removeAttribute('data-clock');
      }
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const onPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    const host = event.currentTarget;
    /* A synthetic or already-released pointer has no capturable id; the drag
       still works through bubbling, so capture is best-effort. */
    try {
      host.setPointerCapture(event.pointerId);
    } catch {
      // pointer left before capture; pointerup/cancel will clean up
    }
    host.dataset.dragging = 'true';
    drag.current = { x: event.clientX, start: clock.current?.value ?? 0, moved: false };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const state = drag.current;
    if (!state || !clock.current) {
      return;
    }
    const dx = event.clientX - state.x;
    if (!state.moved && Math.abs(dx) < 3) {
      return;
    }
    state.moved = true;
    clock.current.manual = true;
    clock.current.value = Math.max(0, state.start + dx / SCRUB_PX_PER_S);
    repaint();
  };

  const endDrag = (event: React.PointerEvent<HTMLElement>) => {
    drag.current = null;
    delete event.currentTarget.dataset.dragging;
  };

  return (
    <section
      ref={bandRef}
      className={classes.band}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <Container className={classes.inner}>
        <div className={classes.frame}>
          <Pane
            variant="terminal"
            label={t('terminal_label')}
            loop={t('terminal_loop')}
            caption={t('terminal_caption')}
            clock={clock}
            register={register}
          />
          <div className={classes.divider} />
          <Pane
            variant="approach"
            label={t('approach_label')}
            loop={t('approach_loop')}
            caption={t('approach_caption')}
            clock={clock}
            register={register}
          />
        </div>
      </Container>
    </section>
  );
};
