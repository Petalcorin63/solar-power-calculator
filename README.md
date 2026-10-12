# Solar Power System Calculator

A small tool for getting starting-point sizes for a solar setup, with the
formulas and sourcing shown alongside the results. It supports three system
types:

- **Off-grid** — list your appliances and their daily runtime, and get a PV
  array size, battery bank, charge controller rating, and inverter rating.
- **Grid-tied** — enter your annual usage and an offset target, and get an
  array size, grid-tie inverter rating, and estimated annual production.
- **Hybrid** — grid-tied sizing plus a backup battery and inverter sized to a
  separate list of critical loads.

Panels come in whole units, so the installed array (panel count × panel
wattage) is usually larger than the calculated minimum. The charge controller,
grid-tie inverter, and production estimate are all sized to the installed
array. Battery counts account for wiring lower-voltage units in series to reach
the system voltage.

Signing in is optional. With an account, the current inputs auto-save as you
edit and come back on your next visit, and you can keep up to 200 named
projects (save, open, rename, delete).

## Disclaimer

The results are planning estimates from simplified formulas and default
assumptions. They are not an engineering design or professional electrical
advice. Check them against your equipment's datasheets, and have a qualified,
licensed professional design and install any system to local electrical code
(in the US, NEC Article 690) and your utility's requirements. The software is
provided as-is, without warranty. The app shows the same disclaimer below the
results.

## References

The sources behind each formula and default are cited in the app's "Formulas &
references" panel. Each entry gives its publication or revision date and when it
was last checked; the list lives in `src/lib/references.ts` and was last
reviewed on 4 October 2026. When you re-check the sources, update `accessed`
and `REFERENCES_REVIEWED` there. A test makes sure every citation in the panel
points to a listed source and every source is cited.

## Stack

Vue 3 + TypeScript + Tailwind CSS v4, built with Vite. The sizing math lives in
`src/lib/solar.ts` as pure functions, tested with Vitest.

Accounts and saved projects use a small Fastify server in `server/`, storing
data with [libSQL](https://github.com/tursodatabase/libsql) (SQLite). Locally
that's a SQLite file; on Vercel it's a hosted [Turso](https://turso.tech)
database, because Vercel functions have no persistent disk. Requires Node 22.5+.

Security measures:

- Passwords are hashed with scrypt at OWASP's recommended cost (N=2¹⁷, r=8, p=1).
  The cost is stored in each hash, and older, cheaper hashes are upgraded on the
  next successful login.
- Sessions are random tokens in an httpOnly, SameSite=Lax cookie (Secure in
  production). Only a SHA-256 of each token is stored. Signing in ends the
  session the browser already had, and each user keeps at most 20 sessions.
- State-changing API calls must send an `X-Requested-With: fetch` header, which
  guards against CSRF.
- Optional Cloudflare Turnstile ("verify you are human") on sign-in and sign-up.
  It's checked before any account lookup or password hashing, so bots that can't
  pass it cost almost nothing.
- Failed sign-ins are rate-limited per address and email (5 per 15 min) and per
  address (10 per hour); successful ones don't count, so people sharing an IP
  aren't locked out. Sign-up is limited to 5 per address per hour. IPv6 clients
  are grouped by /64. The counters live in the database, so every server
  instance (each Vercel function instance) shares them, and over-limit requests
  are rejected before any password hashing.
- New accounts are capped across everyone (`MAX_SIGNUPS_PER_DAY`, default 100
  per rolling 24 h), and each user can store up to 200 projects totalling 2 MB.
  Together these limit how fast bots can grow the database.
- Responses carry a strict Content-Security-Policy, `nosniff`, `frame-ancestors
  'none'`, and HSTS when cookies are Secure. API responses are `no-store`.
- A local SQLite file is created owner-only (on Linux/macOS) and overwrites
  deleted rows.

Each password hash takes about 0.5 s of CPU and 128 MB of memory, so the
rate-limit tests take a while (`pnpm test` runs about 30 s).

## Prerequisites

Node 22.5+ and pnpm, managed by [Corepack](https://github.com/nodejs/corepack).
The pnpm version is pinned in `package.json` (`packageManager`), and Corepack
picks it up automatically. Use pnpm only; don't add a `package-lock.json` or
`yarn.lock`.

```sh
npm install -g corepack@latest
corepack enable pnpm
```

## Development

Run the API and the frontend in two terminals. Vite forwards `/api` requests to
the server on port 3000.

```sh
pnpm install
pnpm dev:server   # API on http://127.0.0.1:3000
pnpm dev          # frontend on http://localhost:5173
```

The calculator works without the server; only sign-in and saving need it.

## Test

```sh
pnpm test
```

## Deploying to Vercel

Vite builds the frontend, which Vercel serves from its CDN. `api/index.ts` runs
the Fastify app as a single Vercel Function for every `/api/*` request.
`vercel.json` sets this up and adds the security headers to the page.

1. **Vercel installs pnpm itself.** The lockfile is from pnpm 12, which Vercel's
   built-in pnpm (9/10) can't read, so `vercel.json`'s install command installs
   Corepack and runs the pinned pnpm version. Check the build log shows pnpm 12.
2. **Create the database.** In the Vercel dashboard, add Turso from
   Storage → Marketplace and connect it to the project. The app reads
   `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`. If the integration names them
   differently, add those two variables yourself. The tables are created on
   the first request. Without a database URL, the function refuses to start
   rather than losing data.
3. **Set up Turnstile** (free; needs a Cloudflare account). In the Cloudflare
   dashboard, go to Turnstile → Add widget and add your Vercel domain(s). Then
   set two environment variables in Vercel:
   - `VITE_TURNSTILE_SITE_KEY`: the site key, built into the frontend
   - `TURNSTILE_SECRET_KEY`: the secret key, used by the API

   Set both or neither. With only the secret, nobody can sign in; with only the
   site key, the widget shows but nothing checks it. Without them, the app
   works but sign-in has no bot check, and the function logs a warning.
4. **Import the repository** at vercel.com/new. Leave the build settings alone;
   `vercel.json` provides them.
5. **Add a firewall rate-limit rule** (Firewall → Configure → New Rule). The
   free plan allows one, so use it for all API traffic:
   - If **Request Path** starts with `/api` (no trailing slash: the function is
     also reachable at `/api` itself, e.g. `/api?path=auth/login`)
   - **Rate limit**: 60 requests per 60 seconds, counted by IP, action
     *Deny* (429)

   Normal use stays well under that: auto-save sends at most one request per
   second while typing. Blocked requests don't count toward your usage.
6. **Deploy and test a preview:** sign up, save a project, reload, and sign
   in from a private window.

Vercel's automatic DDoS protection is on for every plan. During an attack you
can also turn on Attack Challenge Mode in the Firewall tab; test it on a
preview first, as it hasn't been checked with this app's API calls. Don't set
`TRUST_PROXY` on Vercel; it's on by default there, because Vercel overwrites
`X-Forwarded-For` with the real client IP.

### Free tier

The app fits Vercel Hobby and Turso's free plan for personal use. Hobby is
non-commercial only. If a Hobby limit is exceeded, Vercel pauses that feature
for the rest of the 30-day period rather than charging you. The limit most
exposed to abuse is Active CPU (4 CPU-hours a month), because each password
check costs about 0.5 s. Turnstile, the in-app login limits (at most about one
CPU-hour per address per month) and the firewall rule exist to protect it.
Check the Usage tab occasionally.

## Self-hosting

```sh
pnpm build
pnpm start          # serves dist/ and the API on one port
```

Configuration is via environment variables:

| Variable              | Default         | Notes |
| --------------------- | --------------- | ----- |
| `PORT`                | `3000`          | |
| `HOST`                | `0.0.0.0`       | `127.0.0.1` in dev |
| `DB_PATH`             | `data/solar.db` | Local SQLite file, created on first run; back this up. Ignored when `TURSO_DATABASE_URL` is set. |
| `TURSO_DATABASE_URL`  |                 | Hosted libSQL/Turso database (required on Vercel). |
| `TURSO_AUTH_TOKEN`    |                 | Token for that database. |
| `COOKIE_SECURE`       | `true`          | Serve over HTTPS in production. Set `false` only to test locally over plain http. |
| `TRUST_PROXY`         | `false`         | Behind a reverse proxy, set this to the proxy's address(es), e.g. `127.0.0.1` or `10.0.0.0/8`. `true` on Vercel. |
| `MAX_SIGNUPS_PER_DAY` | `100`           | New accounts allowed per rolling 24 h, across everyone. |
| `TURNSTILE_SECRET_KEY` |                | Cloudflare Turnstile secret; enables the bot check on sign-in/sign-up. |
| `VITE_TURNSTILE_SITE_KEY` |             | Matching site key, needed at **build** time (`pnpm build`). |

**Behind a reverse proxy, set `TRUST_PROXY`.** Without it, every request seems
to come from the proxy. All visitors then share one sign-up limit, and anyone
could lock an account out by failing its login 10 times. Don't set it when the
server is exposed directly. A client could then fake `X-Forwarded-For` and get
around the limits. Use `true` only if nothing but the proxy can reach the port.
