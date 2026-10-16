# Architecture

A map of the code: what lives where, how data flows, and where to make common
changes. For coding rules see [CONTRIBUTING.md](CONTRIBUTING.md); for setup and
deployment see [README.md](README.md).

## The big picture

```
Browser ──────────────────────────────────────────────┐
│  Vue app (src/)                                      │
│    inputs ──► src/lib/  (pure calculations)          │
│      │          sizing/     equipment sizes          │
│      │          wiring/     wires & breakers         │
│      │          diagram/    step-by-step explanations│
│      ▼                                               │
│    components render results + the diagram          │
│      │                                               │
│      └── sign-in / saving ──► src/lib/api/ ────┐     │
└────────────────────────────────────────────────│─────┘
                                                 │ /api/* (JSON, session cookie)
                                   Fastify server (server/)
                                                 │
                                   libSQL: a SQLite file locally,
                                   or Turso on Vercel
```

Everything the calculator computes happens in the browser, in pure functions.
The server only handles accounts and saving, so the calculator works without it.

## How a domain folder is laid out

Code is grouped by subject into **domain** folders (`src/lib/wiring/`,
`server/auth/`, …). Every domain follows the same pattern, so once you know one
you can find your way around any of them:

```
src/lib/wiring/
  index.ts             public face: re-exports only — other code imports this
  types.ts             types and interfaces
  constants.ts         named factors and limits
  data/                tables and per-region data, one file each (nec.ts, pec.ts, …)
  protection.ts        logic, one file per job
  circuits.ts
  wiring.test.ts       tests
```

Other code imports the folder (`../wiring`), never a file inside it. ESLint
enforces the file kinds and the import rule — see CONTRIBUTING.md, "Folders and
files".

## Frontend (`src/`)

The page is split into tabs: **Setup → Results → Diagram & wiring → Formulas &
references**, plus **My projects** when signed in. The open tab is in the URL
(`#/results`), so the back button and links work. Every tab reads and edits the
same calculator state, so a change on one tab shows on all of them.

| Path | What it does |
| --- | --- |
| `App.vue` | The frame: account menu, header, tab bar, and the open tab. Creates the calculator and workspace. |
| `pages/` | One component per tab (`SetupPage.vue`, `ResultsPage.vue`, `DiagramPage.vue`, `ReferencesPage.vue`, `ProjectsPage.vue`). Each only arranges components. |
| `composables/calculator/` | **The app's state.** `createCalculator()` holds every input in one reactive object, plus the results, diagram and red-dot count computed from it. Any component gets it with `useCalculator()`. |
| `composables/navigation/` | The tabs (`TABS`) and `useTabs()`, which keeps the open tab in the URL hash. |
| `composables/workspace/` | Signed-in session, auto-save, saved projects (`useWorkspace`). |
| `composables/number-input/` | Number-input behavior: keep the last valid value while the user types (`useNumberDraft`). |
| `components/ui/` | Generic pieces with no solar knowledge: cards, icons, number and select fields, result tiles, the disclaimer. |
| `components/inputs/` | `PartField` renders any input by its key. Every field's label, hint and range is in `data/fields.ts`, and drop-down choices are in `data/options.ts`. Also the appliance table and the system-type picker. |
| `components/setup/` | The Setup tab's cards: loads, sunlight, yearly use, critical loads, battery. |
| `components/results/` | The Results tab's tiles, one component per system type. |
| `components/diagram/` | The interactive diagram: `SystemDiagram` (selection) built from `DiagramCanvas` (the SVG), `PartPicker` (the buttons) and `PartDetailPanel` (the worked steps). Box and wire positions are in `data/positions.ts`. |
| `components/references/` | The Formulas & references panel and the `[n]` citation links. |
| `components/account/` | Sign-in / sign-up, the bot check, the projects list. |
| `components/layout/` | Header, tab bar, the "next step" button. |
| `components/theme/` | Colors (`data/tones.ts`) and the color and icon of each diagram part (`data/parts.ts`). |
| `lib/project/` | The inputs: their shape (`ProjectState`, in `types.ts`), defaults (`defaults.ts`), allowed ranges (`LIMITS`, in `constants.ts`), the parser that safely loads saved data (`parse.ts`), and the mapping onto each calculator's arguments (`calculator-inputs.ts`). |
| `lib/sizing/` | Equipment sizing: daily load (`loads.ts`), panels, battery bank, charge controller and inverter (`equipment.ts`), and the three system calculators (`systems.ts`). |
| `lib/wiring/` | Wire and breaker sizing. Each location's electrical code is one file in `data/` (`nec.ts`, `pec.ts`, `iec.ts`, `asnzs.ts`; `codes.ts` lists them). `protection.ts` picks breakers and wires; `circuits.ts` works out each circuit's current. |
| `lib/diagram/` | Turns the inputs into the diagram's parts and their worked steps — see below. |
| `lib/references/` | The cited sources (`data/sources.ts`) shown in "Formulas & references". |
| `lib/api/` | Typed client for the server: one function per endpoint in `endpoints.ts`, used as `api.login(…)`. |
| `lib/turnstile/` | Loads Cloudflare's bot-check script. |
| `lib/numbers.ts` | Small number helpers. |

### How an input change reaches the screen

1. A field edits `inputs` from `useCalculator()` (`v-model="inputs.batteryAh"`).
2. The calculator's computed values re-run: `calculateOffGrid` / `calculateGridTied` / `calculateHybrid` and `describeSystem`.
3. Whatever tab is open re-renders. The Diagram tab's red badge counts parts that still need info.
4. If signed in, `useWorkspace` notices the change and auto-saves after a second.

### The diagram (`lib/diagram/`)

`describeSystem(state)` in `describe.ts` returns everything the drawing shows. It's
built in layers, each in its own file:

| File | Role |
| --- | --- |
| `types.ts` | Vocabulary: a *node* is a box (equipment, loads, grid); a *circuit* is the cable between two nodes; every clickable thing is a *part*. |
| `data/layouts.ts` | Which boxes (`NODES`) and circuits (`CIRCUITS`) each drawing has. There are 6 drawings: off-grid (separate, all-in-one, all-in-one + AC input), grid-tied, hybrid, hybrid all-in-one. |
| `topology.ts` | Picks the drawing for the current inputs (`layoutFor`). |
| `context.ts` | `buildContext`: everything the parts share, computed once — sized equipment, PV strings, flags for the current setup, common prerequisites. |
| `circuits.ts` | For each circuit, its current, then its breaker and wire parts. |
| `equipment.ts` | Panels, charge controller, battery bank, inverter. |
| `site.ts` | Household loads, critical loads, grid / generator. |
| `format.ts` | `fmt`: number formatting that never shows `NaN` or `-0`. |

A part lists the inputs it `requires`. While any is missing it shows "needs info"
and the UI asks for them; nothing is computed from blanks.

## Server (`server/`)

Two entry points build the same app:

| File | What it does |
| --- | --- |
| `server/index.ts` | Local dev and self-hosting (`pnpm dev:server`, `pnpm start`). |
| `api/index.ts` | Vercel: one function serving every `/api/*` request. |

The rest is in domain folders:

| Folder | What it does |
| --- | --- |
| `app/` | `buildApp` (`build-app.ts`) assembles everything below, in order. **Read this first.** Quotas and the body-size limit are in `constants.ts`. |
| `config/` | `loadConfig` reads environment variables into a `ServerConfig`; `appOptionsFrom` turns it into `buildApp`'s options. |
| `http/` | Request plumbing: security headers and the CSRF check (`security.ts`), route guards `requireUser` / `currentUser` (`guards.ts`), `HttpError` (`errors.ts`), Vercel's URL rewrite (`original-url.ts`). |
| `auth/` | Passwords (scrypt, `passwords.ts`), sessions (`sessions.ts`), rate limits (`rate-limit.ts`), the Turnstile bot check (`turnstile.ts`). Cost settings, session lifetime and rate limits are in `constants.ts`. |
| `db/` | Opens the database (`open-db.ts`) and creates the schema (`data/schema.ts`); `types.ts` has the small `Db` interface every query uses. |
| `routes/` | The endpoints: `auth.ts` (`/api/auth/register`, `/login`, `/logout`, `/me`), `projects.ts` (`/api/projects`, `/api/projects/:id`), `autosave.ts` (`/api/autosave`), and `frontend.ts` (serves the built app when self-hosting). Request schemas and error messages are in `data/`; the saved-data size cap is in `constants.ts`. |

### What happens to a request

1. **`http/security.ts`**: adds security headers. For `/api/*`, adds `no-store` and
   rejects state-changing requests without `X-Requested-With: fetch` (403).
2. **Session lookup** (in `app/build-app.ts`): sets `request.user` from the session
   cookie, or `null`.
3. **Fastify validates** the body and params against the route's JSON schema (400 if invalid).
4. **`requireUser`** (on project and auto-save routes) answers 401 if signed out.
5. **The route handler** runs. Every query on user data filters by `currentUser(request).id`.
6. **Errors**: `HttpError(status, message)` becomes `{ error: message }` with that
   status; anything unexpected is logged and becomes a 500.

### Database (`db/data/schema.ts`)

| Table | Holds |
| --- | --- |
| `users` | email (unique, lower-cased), scrypt password hash, created time |
| `sessions` | SHA-256 of each session token, user, expiry |
| `projects` | named saved states (JSON text), per user |
| `autosaves` | one working state per user |
| `rate_limits` | sign-in / sign-up attempt counters |

The schema is created on startup (`CREATE TABLE IF NOT EXISTS`). There are no
migrations yet; adding a column means adding one.

## Tests and CI

| Where | What | Run with |
| --- | --- | --- |
| `*.test.ts` beside the code | Calculations, parsing, the diagram's steps (Vitest), and the whole API through `app.inject` on an in-memory database | `pnpm test` (part of `pnpm check`) |
| `e2e/*.spec.ts` | The built app in a real browser (Playwright): tabs, every diagram drawing, sign-in | `pnpm test:e2e` |
| `.github/workflows/ci.yml` | All of the above plus the build, on every push and pull request | GitHub Actions |

## Where to change things

| To… | Change |
| --- | --- |
| Add a calculator input | `ProjectState` (`lib/project/types.ts`), `defaultProjectState` (`defaults.ts`), `LIMITS` (`constants.ts`) and `parseProjectState` (`parse.ts`); its label and hint in `components/inputs/data/fields.ts`; then `<PartField field="…" />` in a Setup card or a diagram part's `inputs`. Old saves must still load (the parser fills defaults). |
| Change a sizing formula | `lib/sizing/` or `lib/wiring/`, plus its explanation in `lib/diagram/` and "Formulas & references" (`components/references/ReferencesPanel.vue`). Add a test with the arithmetic in a comment. |
| Add an electrical code / location | A new file in `lib/wiring/data/` modeled on `nec.ts`; add it to `ELECTRICAL_CODES` in `data/codes.ts` and its id to `CodeId` in `types.ts`; cite its tables in `lib/references/data/sources.ts` and `components/references/ReferencesPanel.vue`. |
| Add a diagram part or drawing | `lib/diagram/data/layouts.ts` (boxes and circuits), a builder in `equipment.ts` / `site.ts`, its color and icon in `components/theme/data/parts.ts`, and positions in `components/diagram/data/positions.ts`. |
| Add a tab | `TABS` in `composables/navigation/constants.ts` (and `TabId` in its `types.ts`), a page in `src/pages/`, and a line in `App.vue`'s `<KeepAlive>`. |
| Add a source | `REFERENCES` in `lib/references/data/sources.ts`, cited with `<CiteRef id="…" />`. A test fails if a source isn't cited or a citation isn't listed. |
| Add an API endpoint | A `register…Routes` function in `server/routes/` (options type in `routes/types.ts`, schema in `routes/data/schemas.ts`), exported from `routes/index.ts` and called from `app/build-app.ts`; a function in `src/lib/api/endpoints.ts`; tests in `server/app/app.test.ts` using `app.inject`. |
| Change a quota or rate limit | `DEFAULT_QUOTAS` in `server/app/constants.ts`; the sign-in and sign-up limits in `server/auth/constants.ts`. |
