'use client';

import { useEffect, useRef } from 'react';

/** Navy #002f6c as an rgb triple: one ink, several alphas. */
const DEFAULT_INK = '0, 47, 108';
const MAX_DPR = 2;
const LAYERS = 5;
const INTRO_MS = 900;
const WALK_MS = 2900;
const POINTER_REACH = 150;

type FieldNode = {
  x: number;
  baseY: number;
  amplitude: number;
  phase: number;
};

type SignalEdge = readonly [number, number];

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);

/**
 * The ink is decoration, so the host decides it: on paper the field is navy, on
 * the dark hero the host sets `--signal-ink` to a light triple and the identical
 * figure is drawn inverted.
 */
const readInk = (host: HTMLElement) => {
  const value = getComputedStyle(host).getPropertyValue('--signal-ink').trim();
  return value || DEFAULT_INK;
};

/**
 * A hairline inference graph: five layers of nodes, edges only from a layer to
 * the next, and one signal travelling the same path on a loop.
 *
 * A radius-linked point cloud is the stock decorative network and reads as a
 * third colour beside the navies; a layered graph drawn in one ink reads as a
 * diagram of the thing the copy describes, and costs ~30 strokes a frame.
 *
 * Decorative only — the host keeps its own box, so nothing here can shift
 * layout, and under `prefers-reduced-motion` one still frame is drawn and no
 * loop is started.
 */
export function SignalField({ className }: { readonly className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!host || !canvas || !context) {
      return;
    }
    // The canvas must never intercept a click or a text selection, so the
    // pointer is tracked on the wrapper the host sits in.
    const surface = host.parentElement ?? host;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const ink = readInk(host);

    let nodes: FieldNode[] = [];
    let edges: SignalEdge[] = [];
    let walk: number[] = [];
    let width = 1;
    let height = 1;
    let dpr = 1;
    let frameId = 0;
    let startedAt = performance.now();
    let playedOnce = false;
    let onScreen = false;
    let pointerX = 0;
    let pointerY = 0;
    let pointerActive = false;
    // Pointer position is captured per event but resolved to canvas space at
    // most once per frame, so a fast pointer cannot force a layout read per event.
    let pointerClientX = 0;
    let pointerClientY = 0;
    let pointerDirty = false;

    const seed = () => {
      const rect = host.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);

      // Seeded, so the still frame is the same figure on every load.
      let state = 0x2F6C1;
      const next = () => {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
      };

      const padX = width * 0.08;
      const padY = height * 0.16;
      const perLayer = height > width * 0.85 ? 4 : 3;

      nodes = [];
      for (let layer = 0; layer < LAYERS; layer += 1) {
        const span = width - padX * 2;
        const x = padX + (span * layer) / (LAYERS - 1);
        for (let index = 0; index < perLayer; index += 1) {
          const slot = (height - padY * 2) * ((index + 0.5) / perLayer);
          nodes.push({
            x,
            // Layers are staggered vertically so the graph steps instead of
            // ruling straight lines across the box.
            baseY: padY + slot + (layer % 2 === 0 ? 0 : (height - padY * 2) * 0.08),
            amplitude: 2 + next() * 4,
            phase: next() * Math.PI * 2,
          });
        }
      }

      // Each node feeds the node directly ahead of it, plus its nearest
      // neighbour in the next layer. Edges stay near-monotone, so the figure
      // reads as a layered diagram instead of a knotted mesh.
      edges = [];
      for (let layer = 0; layer < LAYERS - 1; layer += 1) {
        const from = layer * perLayer;
        const to = from + perLayer;
        for (let index = 0; index < perLayer; index += 1) {
          edges.push([from + index, to + index]);
          const below = index + 1 < perLayer ? index + 1 : index - 1;
          edges.push([from + index, to + below]);
        }
      }

      // One named path through the graph, walked by the travelling signal.
      walk = [0];
      for (let layer = 0; layer < LAYERS - 1; layer += 1) {
        const current = walk[walk.length - 1] ?? 0;
        const out = edges.filter(([from]) => from === current);
        const pick = out[Math.floor(next() * out.length)] ?? out[0];
        walk.push((pick?.[1] ?? current + perLayer) as number);
      }
    };

    const yAt = (node: FieldNode, seconds: number) =>
      node.baseY + Math.sin(seconds * 0.55 + node.phase) * node.amplitude;

    /** A left-to-right front that fades each node in as it passes. */
    const revealAt = (x: number, front: number) => clamp01((front - x) / 120);

    /**
     * Edge falloff, applied per node before anything is stroked: an ellipse that
     * reaches zero at its own rim, so nothing can end on a straight cut.
     */
    const fadeAt = (x: number, y: number) => {
      const nx = (x - width * 0.5) / (width * 0.56);
      const ny = (y - height * 0.5) / (height * 0.56);
      return clamp01(1 - (nx * nx + ny * ny));
    };

    const draw = (now: number) => {
      const seconds = (now - startedAt) / 1000;
      const intro = reducedMotion.matches ? 1 : clamp01((now - startedAt) / INTRO_MS);
      const front = -160 + intro * (width + 320);

      if (pointerDirty) {
        const rect = host.getBoundingClientRect();
        pointerX = pointerClientX - rect.left;
        pointerY = pointerClientY - rect.top;
        pointerDirty = false;
      }

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      context.lineWidth = 1;

      // Which edge the travelling signal is on right now, if any.
      const cycle = reducedMotion.matches ? 1 : ((now - startedAt) % WALK_MS) / WALK_MS;
      const step = Math.min(walk.length - 2, Math.floor(cycle * (walk.length - 1)));
      const local = clamp01(cycle * (walk.length - 1) - step);
      const signalFrom = walk[step];
      const signalTo = walk[step + 1];

      const rest = new Path2D();
      const live = new Path2D();

      for (const [from, to] of edges) {
        const a = nodes[from];
        const b = nodes[to];
        if (!a || !b) {
          continue;
        }
        const ay = yAt(a, seconds);
        const by = yAt(b, seconds);
        const visibility = Math.min(revealAt(a.x, front), revealAt(b.x, front))
          * Math.min(fadeAt(a.x, ay), fadeAt(b.x, by));
        if (visibility < 0.12) {
          continue;
        }
        const isLive = (from === signalFrom && to === signalTo) || (from === signalTo && to === signalFrom);
        const path = isLive ? live : rest;
        path.moveTo(a.x, ay);
        path.lineTo(b.x, by);
      }

      context.strokeStyle = `rgba(${ink}, 0.78)`;
      context.stroke(rest);
      context.strokeStyle = `rgba(${ink}, 1)`;
      context.stroke(live);

      // Nodes: 1.4px marks that grow only where the pointer is.
      for (const node of nodes) {
        const y = yAt(node, seconds);
        const fade = revealAt(node.x, front) * fadeAt(node.x, y);
        if (fade < 0.15) {
          continue;
        }
        const near = pointerActive && Math.hypot(node.x - pointerX, y - pointerY) < POINTER_REACH;
        context.fillStyle = `rgba(${ink}, ${0.7 + 0.3 * fade})`;
        context.beginPath();
        context.arc(node.x, y, near ? 2.6 : 1.4, 0, Math.PI * 2);
        context.fill();
      }

      // The signal itself: one dot on the last segment it has reached.
      const head = nodes[walk[Math.min(step + 1, walk.length - 1)] ?? 0];
      const tail = nodes[walk[step] ?? 0];
      if (head && tail) {
        const y0 = yAt(tail, seconds);
        const y1 = yAt(head, seconds);
        context.fillStyle = `rgba(${ink}, 0.95)`;
        context.beginPath();
        context.arc(tail.x + (head.x - tail.x) * local, y0 + (y1 - y0) * local, 2.2, 0, Math.PI * 2);
        context.fill();
      }
    };

    const render = (now: number) => {
      draw(now);
      frameId = window.requestAnimationFrame(render);
    };

    const stop = () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
      }
    };

    const play = () => {
      if (reducedMotion.matches) {
        stop();
        draw(performance.now());
        return;
      }
      if (frameId || !onScreen || document.hidden) {
        return;
      }
      // The wipe is an entrance, not a loop: coming back to the tab resumes the
      // signal walk, it does not replay the reveal.
      if (!playedOnce) {
        playedOnce = true;
        startedAt = performance.now();
      }
      frameId = window.requestAnimationFrame(render);
    };

    const handlePointerMove = (event: PointerEvent) => {
      pointerClientX = event.clientX;
      pointerClientY = event.clientY;
      pointerActive = true;
      pointerDirty = true;
    };

    const handlePointerLeave = () => {
      pointerActive = false;
      pointerDirty = false;
    };

    const handleResize = () => {
      seed();
      if (!frameId) {
        draw(performance.now());
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        play();
      }
    };

    seed();
    draw(performance.now());

    const observer = new IntersectionObserver((entries) => {
      onScreen = entries.some(entry => entry.isIntersecting);
      if (onScreen) {
        play();
      } else {
        stop();
      }
    });
    observer.observe(host);

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(host);

    surface.addEventListener('pointermove', handlePointerMove);
    surface.addEventListener('pointerleave', handlePointerLeave);
    document.addEventListener('visibilitychange', handleVisibility);
    reducedMotion.addEventListener('change', play);

    return () => {
      stop();
      observer.disconnect();
      resizeObserver.disconnect();
      surface.removeEventListener('pointermove', handlePointerMove);
      surface.removeEventListener('pointerleave', handlePointerLeave);
      document.removeEventListener('visibilitychange', handleVisibility);
      reducedMotion.removeEventListener('change', play);
    };
  }, []);

  return (
    <div ref={hostRef} className={className} aria-hidden="true">
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  );
}
