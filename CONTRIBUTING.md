# Contributing

The rules this codebase follows, so it stays easy to pick up after time away.
[ARCHITECTURE.md](ARCHITECTURE.md) explains where things live.

## Before calling a change done

```sh
pnpm check   # type-check (vue-tsc), lint (ESLint), all tests (Vitest)
pnpm build   # production build
```

Both must pass. For UI changes, also look at the page in a browser, in light and
dark mode and at phone width. For server changes, run `pnpm dev:server` and try the
flow, including one failure (wrong password, signed out, oversized save).

Use **pnpm only**: no `npm install`, `npx` or `yarn`, and no other lockfiles. The
pnpm version is pinned in `package.json`.

## Folders and files

Code is grouped into **domains**: one folder per subject, such as `src/lib/wiring/`,
`src/components/diagram/` or `server/auth/`. Domains are the folders under `src/lib/`,
`src/composables/`, `src/components/` and `server/`. Inside a domain, each file holds **one kind
of thing**, and its name tells you which:

| File | Holds | Example |
| --- | --- | --- |
| `types.ts` | Types and interfaces only | `server/auth/types.ts`: `SessionUser`, `RateLimit` |
| `constants.ts` | Named values: factors, limits, keys | `src/lib/wiring/constants.ts`: `LOW_BATTERY_FACTOR` |
| `data/*.ts` | Larger value sets: tables, per-region data, schemas, messages. **One file per region or table.** | `src/lib/wiring/data/nec.ts`, `data/pec.ts`, `server/routes/data/schemas.ts` |
| `index.ts` | Re-exports only: the domain's public face | `export * from './protection'`, `export { default as PartField } from './PartField.vue'` |
| `*.vue` | One component; logic beyond wiring things up goes in a `.ts` file beside it | `components/diagram/DiagramCanvas.vue` |
| any other name | Logic: functions and classes, named for what they do | `src/lib/wiring/protection.ts`, `server/auth/sessions.ts` |
| `*.test.ts` | Tests for the domain, next to its code | `src/lib/wiring/wiring.test.ts` |

**Code outside a domain imports only its index**: `../sizing`, or
`../db/index.js` on the server. Never import a file inside another domain, such as
`../sizing/loads`. Inside a domain, files import each other directly (`./types`,
`./data/nec`). This keeps each domain free to rearrange its files.

ESLint enforces all of this: the file kinds through `no-restricted-syntax` and
the imports through `local/domain-boundaries` (in `eslint-rules/`). When it
complains, move the code to the right file; don't disable the rule.

A small, single-purpose module can stay a single file outside any domain, like
`src/lib/numbers.ts`. Tab pages live in `src/pages/` and only arrange components. Once it needs its own
types or constants, make it a folder.

Server code runs as plain Node ESM, so its imports name the file:
`'./types.js'`, `'../auth/index.js'`.

## Code

**Every file starts with a comment saying what it's for.** One to five lines: its
job, and anything non-obvious about how it fits in. If you can't describe a file's
job in a sentence, it's doing too much; split it.

**One concern per module.** Around 300 lines is a sign to look for a seam, not a
hard limit. Group by what the code is about (`auth/sessions.ts`, `routes/projects.ts`),
not by kind (`utils.ts`, `helpers.ts`).

**Exported functions declare their return types.** They're the contract between
modules. ESLint enforces this.

**No `!` non-null assertions in source code.** If something "can't" be missing,
check and throw an `Error` that says what was expected. That turns a confusing
`undefined` crash into a clear message. Tests may use `!`.

**Lookups can miss.** `noUncheckedIndexedAccess` is on, so `array[i]` and
`record[key]` are typed as possibly `undefined`. Handle it; don't silence it.

**Name your numbers.** A constant with a name and a comment
(`LOW_BATTERY_FACTOR = 0.875`, plus where it comes from) beats a bare `0.875`. It
goes in the domain's `constants.ts`.

**Comments explain why, not what.** Say why a constraint exists, which edge case a
line handles, or what would break if it changed. Don't restate the code.

**Keep logic out of components.** Calculations, parsing and rules go in `src/lib/`
as pure functions, where they're tested. Components display and wire up. Shared
state comes from `useCalculator()`, not props passed down through every level.

## Calculations

- Every formula gets a test with a realistic example **worked by hand in a
  comment**, e.g. `// 1,660 Wh ÷ (4.5 h × 0.75) = 492 W`.
- Every factor, table value or rule from outside the code is **cited**: listed in
  `src/lib/references/data/sources.ts` and cited with `<CiteRef id="…" />` where the panel
  explains it. Note in the reference what was actually checked and how. If a source
  couldn't be read, say so rather than citing it as verified.
- Prefer being conservative where safety depends on it (cable and fuse sizes), and
  say so in the explanation.
- Users must never see `NaN`, `Infinity` or `-0`. Guard division; format numbers
  with `fmt` (in `src/lib/diagram/format.ts`).

## Inputs and saved data

- Anything from outside (form fields, saved projects, API bodies, environment
  variables) is untrusted. Parse it field by field, falling back to defaults.
- Values the user must supply themselves (datasheet values, cable lengths) start
  as `null`, so nothing is computed from an invented default. The UI marks them
  with a red dot until they're filled in.
- A new input must load from old saves: give it a default in `defaultProjectState`
  and parse it in `parseProjectState`.

## Server

- Each `routes/*.ts` file exports one `register…Routes(app, options)` function. Its
  options type (in `routes/types.ts`) lists exactly what it needs (the database,
  quotas), so its dependencies are visible.
- Validate every request body and route parameter with a JSON schema, kept in
  `routes/data/schemas.ts`. User-facing error messages go in `routes/data/messages.ts`.
- Protected routes use `preHandler: requireUser` and read the user with
  `currentUser(request)`.
- **Every query on user data filters by the signed-in user's id**, and another
  user's row answers 404, never 403.
- Order checks cheapest first: rate limit, bot check, database, password hashing.
- End a request early with `reply.code(…).send({ error })`, or throw
  `new HttpError(status, message)`. Never leak internal errors; the error handler
  logs them and answers 500.
- Test through the whole app with `app.inject` on an in-memory database
  (`server/app/app.test.ts`). Every bug fix gets a test that would have caught it.

## Tests

- Tests sit in the domain folder they test (`src/lib/wiring/wiring.test.ts`).
- Name tests after the behavior they check, e.g. "sizes the battery cable for
  charging too", not "test 3".
- Hash-heavy server tests are slow (scrypt is deliberately ~0.5 s); the Vitest
  timeout is raised in `vite.config.ts` for that reason.
