# Deploying the portfolio

Verified 2026-11-28 against the running stack. Every address and port below was
read from the live system, not from memory.

## What serves what

```
browser
  │  https://mak-cloud.com/portfolio
  ▼
Cloudflare zone mak-cloud.com
  │  CNAME → 48dc2bb3-b2ad-4cac-8479-22522e635122.cfargotunnel.com
  ▼
cloudflared tunnel "Mak Cloud"          4 connections, hkg01 / hkg13 / hkg11
  │  remote config v44: every hostname → http://127.0.0.1:8100
  ▼
Caddy on :8100  (~/homelab/stacks/caddy)
  │
  ├── Host mak-cloud.com          → 127.0.0.1:30000   (portfolio_app)
  └── Host portfolio-cms.mak-cloud.com → 127.0.0.1:18055 (Directus)
```

- The app is mounted at `BASE_PATH=/portfolio`. `/` is **not** the site: it
  returns 404 on this origin, and on the apex `https://mak-cloud.com/` resolves
  to a different application (`302 → /__apex`). Never point an install surface
  or a health check at `/`.
- `https://portfolio.mak-cloud.com/` is a Caddy `302` into `/portfolio`; it is
  not a second origin.
- `directus` and `redis` are bound to `127.0.0.1` only. Directus is reachable
  publicly through `portfolio-cms.mak-cloud.com` because the tunnel and Caddy
  route it there; the container port itself is not exposed.

## The stack

`C:/Users/Kaius Mak/portfolio-live/docker-compose.yml` — project `portfolio-live`,
network `proxy-net`, three services, all `restart: unless-stopped`:

| service | image | host port | role |
|---|---|---|---|
| `portfolio_app` | `portfolio-app:local` (built from `../portfolio`) | `127.0.0.1:30000→3000` | Next.js web + Fastify API |
| `directus` | `directus/directus:latest` | `127.0.0.1:18055→8055` | CMS, sqlite at `./directus-db/data.db` |
| `redis` | `redis:7-alpine` | `127.0.0.1:6379→6379` | page cache, `--appendonly yes` |

`portfolio_app` reports `(unhealthy)` in `docker ps` even when it is healthy:
the image's own HEALTHCHECK probes `localhost:3000`, which resolves to `::1`
while Node binds IPv4. Judge it by
`curl -s http://127.0.0.1:30000/portfolio/health` → `{"status":"ok","redis":"connected"}`,
or by `docker inspect portfolio_app --format '{{.State.Health.Status}}'`.

### Restart policy — why it is not `"no"`

It was `"no"` until 2026-11-28, and that is why the site sat at 503 for days
after `portfolio_app` exited at 02:44 with `ExitCode 1`. A container that dies
under `restart: "no"` stays dead until somebody runs `up -d` by hand.

Now `unless-stopped`, proven by killing PID 1 from inside the container:

```
$ docker exec portfolio_app kill -TERM 1
$ docker inspect portfolio_app --format 'status={{.State.Status}} restarts={{.RestartCount}}'
status=running restarts=1
$ curl -o /dev/null -w '%{http_code}' http://127.0.0.1:30000/portfolio
200
```

`docker kill` and `docker stop` do **not** prove it — Docker marks those as a
manual stop and deliberately ignores the restart policy. `status=exited
restarts=0` after `docker kill` is correct behaviour, not a broken policy. Only
a death from inside (or a crash) exercises the policy.

## Build and release

```bash
cd "C:/Users/Kaius Mak/portfolio-live"
for i in $(seq 1 6); do docker compose build portfolio && break; done
docker compose up -d portfolio
```

- **Retry the identical command.** `docker compose build portfolio` fails
  intermittently in Turbopack's font step (`There was an issue establishing a
  connection while requesting https://fonts.gstatic.com/...` →
  `Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font`).
  Success has landed on attempts 1, 3, 5, 14 and 21. Never change flags or
  "fix" it — check `docker images portfolio-app:local --format '{{.CreatedAt}}'`
  for a new timestamp instead of trusting the exit code alone.
- Fonts are **vendored, not fetched**: `apps/web/public/fonts/Inter-Variable.<hash>.woff2`
  and `Outfit-Variable.<hash>.woff2`, declared by `@font-face` in an inline
  `<style>` from `app/[locale]/layout.tsx`. `next/font/google` cannot build on a
  network where `fonts.googleapis.com` is unreachable, and `next/font/local`
  fails on Turbopack 16 with a mangled CSS url. Do not reintroduce either.
- `docker compose up -d portfolio` recreates only the web service. Directus and
  redis are left alone unless their own config changed.

## Cache and content invalidation

| path | header | why |
|---|---|---|
| `/portfolio/ops/*` | `public, max-age=31536000, immutable` | filenames carry a content hash |
| `/portfolio/fonts/*` | `public, max-age=31536000, immutable` | same |
| `/_next/static/*` | `public, max-age=31536000, immutable` | Next hashes the names |
| `/portfolio` HTML | `private, no-cache, must-revalidate` (zh-HK: `private, no-store`) | one URL, two languages |

Renaming rule: a plate's filename **must** carry the first 8 hex of its own
md5. Replacing the bytes under a stable name leaves browsers and the edge
serving the old image for up to a year now that the path is `immutable`.

Directus content is cached in redis. After **any** write to the CMS:

```bash
docker exec portfolio-live-redis-1 redis-cli FLUSHALL
```

Cloudflare per-file purge does not work in this zone — it answers `success:true`
while `Age` keeps climbing. Only a full purge evicts:
`node purge-cache.mjs` in `portfolio-live` (needs `CF_API_TOKEN` with
Cache Purge; the `~/.cloudflared/cert.pem` token does not carry it).

## Gates before you call it done

```bash
cd "C:/Users/Kaius Mak/portfolio"
npx tsc --noEmit -p apps/web/tsconfig.json
npx eslint <every file you touched>
MSYS_NO_PATHCONV=1 node scripts/check-manifest.mjs https://mak-cloud.com /portfolio
```

- `MSYS_NO_PATHCONV=1` is mandatory: Git Bash rewrites `/portfolio` into
  `C:/Program Files/Git/portfolio`. The script detects this and exits 2.
- `scripts/check-manifest.mjs` reads the **live origin** over HTTP, because Next
  has no `dist/` to inspect. It verifies the identity, both `any` and `maskable`
  icons, that each PNG's real dimensions match its declared `sizes`, that every
  pixel is opaque, and the maskable safe circle (mark within 40% of the half
  height).
- `scripts/make-icons.mjs` regenerates all four PNGs from code, no image
  library. Use it rather than editing a PNG by hand.

The install identity is `/portfolio`, deliberately **not** `/` as in the other
mak-cloud apps: `/` on the apex is another application, and an installed icon
whose `start_url` is `/` would open the wrong one.

## Diagnosing an outage, in order

1. `docker compose ps` — if `portfolio_app` is `exited`, start it:
   `docker compose up -d`. Then read why it died:
   `docker inspect portfolio_app --format '{{.State.ExitCode}} {{.State.OOMKilled}}'`.
2. `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:30000/portfolio` —
   200 means the app is fine and the fault is in front of it.
3. `curl -s -o /dev/null -w '%{http_code}' -H 'Host: mak-cloud.com' http://127.0.0.1:8100/portfolio`
   — 200 means Caddy is up. `000` on `http://127.0.0.1:8100/` means the Caddy
   front proxy is not running, which produces a Cloudflare **502** on every
   hostname in the zone (they all share one ingress). It was down once, on
   2026-11-18, for exactly this reason.
4. Public `530` (not 502) means the tunnel itself is not connected —
   `cloudflared` down or its token rejected. A 502 means it connected and the
   origin refused.
5. `curl -sI https://mak-cloud.com/portfolio | grep -i cf-cache` — a stale page
   with `HIT` is an edge cache problem, not a deploy problem.

## Backups and the CMS

- The sqlite database is `portfolio-live/directus-db/data.db`, mounted at
  `/directus/database`. Stop `directus` before copying it, or copy with sqlite's
  backup API; a live file copy can tear.
- The original EC2 snapshot of everything (app tarball 23 MB, data tarball
  69 KB) is at `C:/Users/Kaius Mak/portfolio-backup-20261114/` and is pristine —
  do not modify or delete it.
- `portfolio-live/.env` holds the CSP header, `BASE_PATH`, the Directus host, the
  Turnstile keys, the chat backend keys and `CF_ACCOUNT_ID`. It is not in git.
  The CSP `img-src` must list every origin the page loads an image from,
  including `http://host.docker.internal:18055` if assets are ever served
  directly from the CMS container.

## Licence obligations

Photographs are third-party. `apps/web/public/ops/gantry-low.<hash>.webp` is
Trougnouf, CC BY 4.0 — the credit line in the footer is an obligation, not
decoration. `terminal-fog.<hash>.webp` is public domain and
`approach-haze.<hash>.webp` is CC0, so neither carries a credit. Check before
replacing a plate, and update the footer if the new file's licence demands it.
