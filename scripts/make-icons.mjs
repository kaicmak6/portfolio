// The install icons are drawn here rather than painted in an editor: one flat
// field, one geometric K, nothing else, so the bytes are reproducible and
// `manifest:check` can decode exactly what ships. No image library — PNG chunks
// are written by hand from node:zlib.
//
// The mark is a K, not the house M: a phone with both this and the mak-cloud
// console installed must show two distinguishable icons.
import { Buffer } from 'node:buffer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { deflateSync } from 'node:zlib';

// Two steps of the portfolio's own brand ramp (apps/web/src/styles/theme.ts):
// shade 9 is the ink, shade 0 the lightest step.
export const FIELD = [0x0F, 0x1D, 0x2E];
export const MARK = [0xF0, 0xF5, 0xFA];

export const SS = 8; // supersamples per axis, so an edge has 64 blend steps

// The letterform, in its own box. A capital K is narrower than square; drawing it
// square leaves the arms at an angle that reads as an X at 60 px.
const ASPECT = 0.76;
const STEM = 0.22; // stem width, as a fraction of the letter's width
const ARM = 0.17; // arm thickness, as a fraction of its height
const WELD = 0.06; // the arms start inside the stem so the join has no seam

// A thick line as a convex quad: the shape every arm of the K is.
function thickLine([x0, y0], [x1, y1], width) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * (width / 2);
  const ny = (dx / len) * (width / 2);
  return [
    [x0 + nx, y0 + ny],
    [x1 + nx, y1 + ny],
    [x1 - nx, y1 - ny],
    [x0 - nx, y0 - ny],
  ];
}

const JOINT = [STEM - WELD, 0.5];
const QUADS = [
  // the stem
  [
    [0, 0],
    [STEM, 0],
    [STEM, 1],
    [0, 1],
  ],
  thickLine(JOINT, [1, 0.01], ARM),
  thickLine(JOINT, [1, 0.99], ARM),
];

// Fill one supersample row of a convex quad. Sampling at y + 0.5 keeps the top and
// bottom edges from landing exactly on a sample line.
function fillRow(row, quad, y) {
  const xs = [];
  for (let i = 0; i < quad.length; i++) {
    const [x1, y1] = quad[i];
    const [x2, y2] = quad[(i + 1) % quad.length];
    if (y1 === y2) {
      continue;
    }
    if (y < Math.min(y1, y2) || y >= Math.max(y1, y2)) {
      continue;
    }
    xs.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
  }
  xs.sort((a, b) => a - b);
  for (let i = 0; i + 1 < xs.length; i += 2) {
    const from = Math.max(0, Math.ceil(xs[i] - 0.5));
    const to = Math.min(row.length, Math.ceil(xs[i + 1] - 0.5));
    for (let x = from; x < to; x++) {
      row[x] = 1;
    }
  }
}

// ratio is the letter's width as a fraction of the canvas. 0.68 leaves it inside
// the 80% centre an `any` icon is masked to; 0.55 keeps its corners inside the
// circle a launcher crops a maskable icon to, which is tighter than the 60% box.
export function renderIcon(size, ratio) {
  const ss = size * SS;
  const w = ss * ratio;
  const h = w * ASPECT;
  const x0 = (ss - w) / 2;
  const y0 = (ss - h) / 2;
  const quads = QUADS.map(q => q.map(([x, y]) => [x0 + x * w, y0 + y * h]));

  const covered = new Uint8Array(ss * ss);
  const row = new Uint8Array(ss);
  for (let y = 0; y < ss; y++) {
    row.fill(0);
    for (const quad of quads) {
      fillRow(row, quad, y + 0.5);
    }
    covered.set(row, y * ss);
  }

  const rgba = Buffer.alloc(size * size * 4);
  const per = SS * SS;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let hits = 0;
      for (let sy = 0; sy < SS; sy++) {
        const at = (y * SS + sy) * ss + x * SS;
        for (let sx = 0; sx < SS; sx++) {
          hits += covered[at + sx];
        }
      }
      const o = (y * size + x) * 4;
      for (let c = 0; c < 3; c++) {
        rgba[o + c] = Math.round(FIELD[c] + ((MARK[c] - FIELD[c]) * hits) / per);
      }
      rgba[o + 3] = 255;
    }
  }
  return rgba;
}

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) {
    c = CRC[(c ^ b) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(4);
  head.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([head, body, crc]);
}

export function encodePng(size, rgba) {
  const stride = size * 4;
  const raw = Buffer.alloc(size * (stride + 1));
  for (let y = 0; y < size; y++) {
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // truecolour with alpha, so "every pixel is opaque" is checkable
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

export const ICONS = [
  { file: 'apple-touch-icon.png', size: 180, ratio: 0.68 },
  { file: 'icon-192.png', size: 192, ratio: 0.68 },
  { file: 'icon-512.png', size: 512, ratio: 0.68 },
  { file: 'icon-512-maskable.png', size: 512, ratio: 0.55, maskable: true },
];

function main() {
  const out = process.argv[2] ?? 'apps/web/public';
  mkdirSync(out, { recursive: true });
  for (const { file, size, ratio } of ICONS) {
    const png = encodePng(size, renderIcon(size, ratio));
    writeFileSync(join(out, file), png);
    console.log(`${file}  ${size}x${size}  ${png.length} B`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
