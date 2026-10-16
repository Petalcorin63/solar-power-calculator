# Notes for Claude

- Read [ARCHITECTURE.md](ARCHITECTURE.md) for where things live and
  [CONTRIBUTING.md](CONTRIBUTING.md) for the coding rules. Follow them; the owner
  wants code they can understand after months away.
- Before saying a change is done: `pnpm check` and `pnpm build` must pass. Look at
  UI changes in a browser; exercise server changes against a running server.
- Keep the folder/file structure in CONTRIBUTING.md ("Folders and files"): types,
  constants/data and logic in separate files; other domains only through `index.ts`.
  ESLint enforces it — fix the code, don't disable the rule.
- pnpm only (see the global instructions for this machine's Corepack setup).
- Don't present unsourced figures as fact. Cite them in `src/lib/references/data/sources.ts`, or
  flag them as unverified.
