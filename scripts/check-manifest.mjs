// Gate for the install surface, run against a live origin instead of a dist/
// folder: Next serves the manifest as a route and the icons straight from
// `public/`, so "what ships" only exists over HTTP.
//
// Usage: node scripts/check-manifest.mjs [origin] [basePath]
//   node scripts/check-manifest.mjs http://127.0.0.1:30000 /portfolio
//
// The assertions are the same set the vite apps use, except the identity: this
// app is mounted at a sub-path, so id/start_url/scope are that sub-path and not
// "/". An identity of "/" would open the apex app, not this one.
import { Buffer } from 'node:buffer';
import { inflateSync } from 'node:zlib';

const ORIGIN = (process.argv[2] ?? 'http://127.0.0.1:30000').replace(/\/+$/, '');
const PREFIX = (process.argv[3] ?? process.env.BASE_PATH ?? '').replace(/\/+$/, '');

// Git Bash rewrites a bare `/portfolio` argument into a Windows path before node
// sees it, which turns every request URL into nonsense. Say so instead of
// reporting a dozen failed assertions.
if (PREFIX && !PREFIX.startsWith('/')) {
  console.error(`base path "${PREFIX}" is not a URL path — run with MSYS_NO_PATHCONV=1 on Git Bash.`);
  process.exit(2);
}

const ROOT = PREFIX || '/';

const REQUIRED = [
  'id',
  'name',
  'short_name',
  'description',
  'lang',
  'dir',
  'start_url',
  'scope',
  'display',
  'background_color',
  'theme_color',
  'icons',
];

const problems = [];
const check = (ok, message) => {
  if (!ok) {
    problems.push(message);
  }
};

async function get(url) {
  const res = await fetch(url, { redirect: 'manual' });
  const body = Buffer.from(await res.arrayBuffer());
  return { status: res.status, type: res.headers.get('content-type') ?? '', body };
}

function png(buf, label) {
  if (buf.readUInt32BE(0) !== 0x89504E47) {
    throw new Error(`${label}: not a PNG`);
  }
  let at = 8;
  let ihdr = null;
  const idat = [];
  while (at < buf.length) {
    const len = buf.readUInt32BE(at);
    const type = buf.toString('latin1', at + 4, at + 8);
    const data = buf.subarray(at + 8, at + 8 + len);
    if (type === 'IHDR') {
      ihdr = { width: data.readUInt32BE(0), height: data.readUInt32BE(4), depth: data[8], colour: data[9] };
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    at += 12 + len;
  }
  if (!ihdr) {
    throw new Error(`${label}: no IHDR`);
  }
  if (ihdr.depth !== 8 || ihdr.colour !== 6) {
    throw new Error(`${label}: need 8-bit RGBA, got depth ${ihdr.depth} colourtype ${ihdr.colour}`);
  }
  return { ...ihdr, raw: inflateSync(Buffer.concat(idat)) };
}

// Reverses the five PNG row filters and returns the smallest alpha found, so
// "every pixel is opaque" is measured rather than trusted. Also reports how far
// the ink reaches from the centre, which is what decides whether a maskable icon
// survives Android's circular crop.
function scan({ width, height, raw }, label) {
  const bpp = 4;
  const stride = width * bpp;
  let prev = Buffer.alloc(stride);
  let minAlpha = 255;
  let furthest = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const row = Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? row[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      if (filter === 1) {
        v += a;
      } else if (filter === 2) {
        v += b;
      } else if (filter === 3) {
        v += (a + b) >> 1;
      } else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      } else if (filter !== 0) {
        throw new Error(`${label}: unknown row filter ${filter}`);
      }
      row[i] = v & 0xFF;
    }
    for (let x = 0; x < width; x++) {
      const alpha = row[x * 4 + 3];
      if (alpha < minAlpha) {
        minAlpha = alpha;
      }
      // 120 of 255: the field is dark, so this is "the light mark ends here".
      if (row[x * 4] > 120) {
        const d = Math.hypot(x - width / 2 + 0.5, y - height / 2 + 0.5);
        if (d > furthest) {
          furthest = d;
        }
      }
    }
    prev = row;
  }
  return { minAlpha, furthest };
}

function decodeSizes(sizes) {
  const m = /^(\d+)x(\d+)$/.exec(String(sizes ?? ''));
  return m ? { width: Number(m[1]), height: Number(m[2]) } : null;
}

const url = path => `${ORIGIN}${path}`;

// --- the manifest itself -----------------------------------------------------
const manifestRes = await get(url(`${ROOT === '/' ? '' : ROOT}/manifest.webmanifest`));
check(manifestRes.status === 200, `manifest: HTTP ${manifestRes.status}`);
check(/manifest\+json|application\/json/.test(manifestRes.type), `manifest: content-type ${manifestRes.type}`);

let manifest = {};
try {
  manifest = JSON.parse(manifestRes.body.toString('utf8'));
} catch (error) {
  problems.push(`manifest: not JSON (${error.message})`);
}

for (const key of REQUIRED) {
  check(manifest[key] !== undefined, `manifest: missing ${key}`);
}
check(['fullscreen', 'standalone', 'minimal-ui', 'browser'].includes(manifest.display), `display "${manifest.display}"`);
check(['ltr', 'rtl', 'auto'].includes(manifest.dir), `dir "${manifest.dir}"`);
for (const key of ['id', 'start_url', 'scope']) {
  check(manifest[key] === ROOT, `${key} is ${JSON.stringify(manifest[key])}, expected ${JSON.stringify(ROOT)}`);
}
check(
  /^#[0-9a-f]{6}$/i.test(manifest.theme_color ?? '') && /^#[0-9a-f]{6}$/i.test(manifest.background_color ?? ''),
  'theme_color/background_color must be #rrggbb',
);

// --- every declared icon exists, keeps its word, and is opaque ---------------
const purposes = new Set();
const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
check(icons.length > 0, 'icons: none declared');

for (const icon of icons) {
  const declared = decodeSizes(icon.sizes);
  const purpose = icon.purpose ?? 'any';
  purposes.add(purpose);
  check(['any', 'maskable', 'monochrome'].includes(purpose), `icon ${icon.src}: purpose "${purpose}"`);
  check(!icon.sizes || !String(icon.sizes).includes(' '), `icon ${icon.src}: one sizes per entry ("${icon.sizes}")`);

  const res = await get(url(icon.src));
  check(res.status === 200, `icon ${icon.src}: HTTP ${res.status}`);
  if (res.status !== 200) {
    continue;
  }
  check(res.type === 'image/png', `icon ${icon.src}: content-type ${res.type}`);

  let image;
  try {
    image = png(res.body, icon.src);
  } catch (error) {
    problems.push(error.message);
    continue;
  }
  if (declared) {
    check(
      image.width === declared.width && image.height === declared.height,
      `icon ${icon.src}: declares ${icon.sizes} but the PNG is ${image.width}x${image.height}`,
    );
  }
  const ink = scan(image, icon.src);
  check(ink.minAlpha === 255, `icon ${icon.src}: min alpha ${ink.minAlpha}, every pixel must be opaque`);
  // A launcher crops a maskable icon to a circle of 40% of its width; anything
  // the mark puts outside that is cut off. `any` icons are only masked to 80%.
  if (purpose === 'maskable') {
    const radius = (Math.min(image.width, image.height) * 0.4);
    check(
      ink.furthest <= radius,
      `icon ${icon.src}: mark reaches ${ink.furthest.toFixed(1)} px from centre, outside the ${radius.toFixed(1)} px safe circle`,
    );
  }
  console.log(
    `  ${icon.src}  ${image.width}x${image.height}  ${res.body.length} B  ${purpose}  ink<=${ink.furthest.toFixed(1)}px`,
  );
}
check(purposes.has('any'), 'icons: no purpose="any" entry');
check(purposes.has('maskable'), 'icons: no purpose="maskable" entry');

// --- the 180 px touch icon, which the manifest cannot declare ---------------
const touchRes = await get(url(`${ROOT === '/' ? '' : ROOT}/apple-touch-icon.png`));
check(touchRes.status === 200, `apple-touch-icon.png: HTTP ${touchRes.status}`);
if (touchRes.status === 200) {
  const touch = png(touchRes.body, 'apple-touch-icon.png');
  check(touch.width === 180 && touch.height === 180, `apple-touch-icon.png is ${touch.width}x${touch.height}, must be 180x180`);
  check(scan(touch, 'apple-touch-icon.png').minAlpha === 255, 'apple-touch-icon.png: not fully opaque');
}

// --- the head tokens a browser reads before it fetches the manifest ---------
const pageRes = await get(url(`${ROOT === '/' ? '' : ROOT}`));
check(pageRes.status === 200, `page: HTTP ${pageRes.status}`);
const html = pageRes.body.toString('utf8');

check(/rel="manifest"/.test(html), 'head: no rel="manifest"');
check(html.includes(`href="${ROOT === '/' ? '' : ROOT}/manifest.webmanifest"`), 'head: manifest href does not point at the route');
check(/rel="apple-touch-icon"/.test(html), 'head: no rel="apple-touch-icon"');
check(/rel="apple-touch-icon"[^>]*sizes="180x180"/.test(html), 'head: apple-touch-icon is not 180x180');

const meta = (name) => {
  const m = new RegExp(`<meta name="${name}" content="([^"]*)"`).exec(html);
  return m ? m[1] : null;
};
for (const name of ['apple-mobile-web-app-capable', 'mobile-web-app-capable']) {
  check(meta(name) === 'yes', `head: ${name} is ${JSON.stringify(meta(name))}, expected "yes"`);
}
const appTitle = meta('apple-mobile-web-app-title');
check(appTitle !== null, 'head: no apple-mobile-web-app-title');
check(appTitle === manifest.short_name, `head: apple-mobile-web-app-title "${appTitle}" != short_name "${manifest.short_name}"`);
check(/<meta name="theme-color" content="#[0-9a-f]{6}"/i.test(html), 'head: no theme-color');

if (problems.length) {
  console.error(`manifest FAIL (${problems.length})`);
  for (const problem of problems) {
    console.error(`  ✗ ${problem}`);
  }
  process.exit(1);
}
console.log(
  `manifest ok (${manifestRes.body.length} B, ${icons.length} icons, any+maskable, short_name "${manifest.short_name}")`,
);
