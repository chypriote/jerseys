# Jerseys

Nico's football jersey Collection and Wishlist as a wall of Kits. SvelteKit (Svelte 5) on Cloudflare Workers, Drizzle ORM on D1, Pictures in R2, shadcn-svelte + Tailwind CSS v4. Spec: GitHub issue #10. Domain: GLOSSARY.md. Design: DESIGN.md, TOKENS.md, COMPONENTS.md.

## Commands

| Command                           | What it does                                                             |
| --------------------------------- | ------------------------------------------------------------------------ |
| `npm install`                     | Install dependencies (`.npmrc` sets `legacy-peer-deps`)                  |
| `npm run dev`                     | Dev server                                                               |
| `npm run build`                   | Build for Cloudflare                                                     |
| `npm run check`                   | `svelte-kit sync` + `svelte-check`                                       |
| `npm run lint`                    | ESLint (typescript-eslint, eslint-plugin-svelte)                         |
| `npm run format` / `format:check` | Prettier write / check                                                   |
| `npm run verify`                  | `format:check`, `lint` and `check` in one run                            |
| `npm run ci`                      | `verify`, `test` and `build`; the same command GitHub Actions runs       |
| `npm test`                        | Vitest in the Workers runtime (real D1 with migrations, real R2)         |
| `npm run types`                   | Regenerate `worker-configuration.d.ts` after editing `wrangler.jsonc`    |
| `npm run db:generate`             | New Drizzle migration from `src/lib/server/db/schema.ts` into `drizzle/` |
| `npm run db:migrate:local`        | Apply migrations to the local D1                                         |
| `npm run db:migrate:remote`       | Apply migrations to the production D1                                    |
| `npm run deploy`                  | Build and `wrangler deploy`                                              |

## Cloudflare setup

1. `npx wrangler d1 create jerseys`, then put the `database_id` in `wrangler.jsonc` (it holds a placeholder).
2. `npx wrangler r2 bucket create jerseys-covers`.
3. `npm run db:migrate:remote`.
4. Secrets:
   - `OWNER_PASSWORD`: the one Owner password. `npx wrangler secret put OWNER_PASSWORD`
   - `JWT_SECRET`: key that signs the Owner login token. Use a long random value. `npx wrangler secret put JWT_SECRET`
   - `THESPORTSDB_KEY`: TheSportsDB API key, for the Kit picture lookup. The free test key `123` works but returns few rows; a paid key returns all of them. `npx wrangler secret put THESPORTSDB_KEY`
5. `npm run deploy`.

For local dev, put the secrets in `.dev.vars` (git-ignored):

```
OWNER_PASSWORD=change-me
JWT_SECRET=change-me-too
THESPORTSDB_KEY=123
```

`wrangler.jsonc` lists the required secret names under `secrets.required`, so `npm run types` types them without a `.dev.vars`.

Bindings: `DB` (D1), `COVERS` (R2).

## Sheet import (once)

`import/rows.json` (git-ignored) holds the Collection and Wishlist converted from the Google Sheet. With the app running, send it:

```
JERSEYS_URL=http://localhost:5173 OWNER_PASSWORD=... node scripts/import.mjs import/rows.json
```

The import is refused once the app has a Jersey or a Wishlist Item. An invalid row fails with its index (`jerseys[12]: ...`) and saves nothing. Main Pictures come after, with "Look up pictures" on the admin page.

## Layout

- `src/lib/server/db/schema.ts`: Drizzle schema. `drizzle/`: migrations.
- `test/`: vitest setup and tests. `vitest.config.ts` is separate from `vite.config.ts`. `test/apply-migrations.ts` applies every migration in `drizzle/` to the test D1.
