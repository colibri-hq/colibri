# CLAUDE.md

Setup and everyday commands are in CONTRIBUTING.md and the root package.json. Notes that are not obvious from them:

- `pnpm lint` and `pnpm fmt` rewrite files (`--fix`, `--write`). To only check, run what CI runs:
  `pnpm turbo lint:ci` and `pnpm turbo fmt:ci`.
- Formatting is oxfmt and linting is oxlint + ESLint. Where docs still say Prettier, they are out of date.
- Database schema is declarative: `supabase/schemas/*.sql` is the source of truth (`schema_paths` in
  `supabase/config.toml`). After changing it, also add a migration (`pnpx supabase db diff -f <name>`), then
  regenerate `packages/sdk/src/schema.d.ts` with `pnpm -F @colibri-hq/sdk types` (needs the local database and
  `DB_URL` in the root `.env`). Never edit `schema.d.ts` by hand.
- Root `pnpm test:e2e` runs the app's Vitest suite. The Playwright tests are `pnpm -F @colibri-hq/app test:e2e` and
  need the local database (`pnpx supabase start`); they seed and clean up their own data.
- Write Svelte 5 runes only (`$props`, `$state`, `$derived`, `$effect`). A few old components still use `on:`
  directives; do not copy that.
- Feature plans are in `plans/*.md`, each linked to a GitHub issue at the top. When you finish work on a planned
  feature, update the plan's status and reference the issue in the commit (`Closes #123`).
