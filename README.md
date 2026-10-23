# Autocode

AI-assisted code maintenance. **Phase 1: Foundation** — authentication, project
management, and the database/security groundwork for future agent features.

## Phase 1 scope

In scope:

- Supabase Auth (email/password): sign-up, sign-in, forgot/reset password,
  email confirmation, sign-out.
- Projects CRUD (create, list, detail, edit, delete) scoped per user.
- Dark-first responsive UI shell with sidebar, mobile navigation, account menu.
- Config-first env architecture, Prisma schema + migration, service layer,
  Server Actions, Vitest suite.

Not in scope (visible as disabled "Coming soon" UI only): AI agent, Gemini,
repository indexing/cloning, task execution, workers, PR automation, GitHub OAuth.

## Architecture

```
prisma/schema.prisma        Database schema (snake_case via @@map/@map)
prisma/migrations/          SQL migrations (init generated via `prisma migrate diff`)
prisma.config.ts            Prisma 7 CLI config (uses DIRECT_URL lazily)
src/config/                 The ONLY modules that read process.env
  env.public.ts               NEXT_PUBLIC_* vars, Zod-validated, client-safe
  env.server.ts               server-only vars (DATABASE_URL, DIRECT_URL)
  app.ts                      non-secret typed settings (limits, redirects)
  database.ts                 database connection config
src/lib/supabase/           Supabase browser/server/proxy clients (@supabase/ssr)
src/lib/database/prisma.ts  Prisma singleton (driver adapter @prisma/adapter-pg)
src/lib/auth.ts             requireUser() — server-side getUser() verification
src/lib/redirect.ts         safeRedirectPath() — open-redirect-safe `next` param
src/schemas/                Shared Zod schemas (used by forms AND server actions)
src/services/projects.ts    Authorization-enforcing service layer (injectable db)
src/app/                    App Router pages, layouts, Server Actions
src/proxy.ts                Next.js 16 proxy: session refresh + UX redirects
tests/                      Vitest suite (no network, no DB)
```

Env access is centralized: importing `src/config/env.public.ts` is safe in
client code; `src/config/env.server.ts` and `src/config/database.ts` carry
`import "server-only"` so server secrets can never reach the client bundle.
Validation is lazy (first use) so `next build` works without env vars.

## Prerequisites (macOS)

- **Node.js 24 LTS** via [nvm](https://github.com/nvm-sh/nvm) or
  [fnm](https://github.com/Schniz/fnm) — `nvm install` / `fnm use` reads
  `.nvmrc` (`24`). Node ≥ 20.9 required (`engines` in package.json).
- **pnpm** via corepack: `corepack enable && corepack prepare pnpm@10 --activate`
- A free [Supabase](https://supabase.com) project.

## Supabase project setup

1. Create a project at https://supabase.com/dashboard → **New project**.
2. Go to **Project Settings → API** (or **Settings → API Keys**):
   - Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy the **publishable key** (`sb_publishable_...`) →
     `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Never use the `service_role`
     key anywhere in this app.
3. Go to **Project Settings → Database → Connection string**:
   - **Transaction pooler** (Supavisor, port 6543) → `DATABASE_URL`
   - **Session pooler** (port 5432) → `DIRECT_URL`
   - URL-encode your database password in both strings
     (`@` → `%40`, `#` → `%23`, etc.).
   - Note: on free plans the direct host `db.<ref>.supabase.co` is IPv6-only;
     if your network is IPv4-only, use the session pooler URL for `DIRECT_URL`.
4. **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000` (dev; your domain in prod)
   - Redirect URLs: `http://localhost:3000/auth/confirm` (and your prod
     `https://<domain>/auth/confirm`)
5. **Authentication → Emails** — update the templates so confirmation and
   recovery links land on the `/auth/confirm` route handler (this app verifies
   `token_hash` + `type` via `verifyOtp`, and also supports PKCE `code`):
   - Confirm signup: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup`
   - Reset password: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`

## Install & run

```bash
pnpm install
cp .env.example .env.local   # fill in real values
pnpm db:generate             # generate Prisma client
pnpm db:migrate:dev          # apply migrations (needs DIRECT_URL)
pnpm dev                     # http://localhost:3000
```

## Environment variables

| Variable | Purpose | Secret? | Default | Consuming runtime | Required dev / prod |
|---|---|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Public app URL used for auth email redirect targets | No | — | client + server | yes / yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | No | — | client + server | yes / yes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon-safe) key | No (publishable) | — | client + server | yes / yes |
| `DATABASE_URL` | Pooled Postgres URL for Prisma runtime (port 6543, `pgbouncer=true`) | **Yes** | — | server only | yes / yes |
| `DIRECT_URL` | Direct/session-pooler Postgres URL for Prisma CLI migrations | **Yes** | — | CLI only | migrate only / migrate only |
| `APP_ENV` | App environment label (`development`/`test`/`staging`/`production`) | No | `development` | server only | no / no |
| `NODE_ENV` | Node/Next environment | No | `development` | server only | set by Next / set by Next |

No `service_role` key is used anywhere in Phase 1 — by design.

## Database / Prisma

```bash
pnpm db:generate     # prisma generate (also runs on postinstall/build)
pnpm db:migrate:dev  # prisma migrate dev — create/apply migrations locally
pnpm db:migrate      # prisma migrate deploy — apply in CI/prod
pnpm db:studio       # prisma studio
```

- The Prisma **CLI** uses `DIRECT_URL` (prisma.config.ts) — migrations need a
  session-mode/direct connection, not the transaction pooler.
- The **runtime** client uses `DATABASE_URL` (the 6543 transaction pooler) via
  `src/config/database.ts` and the `@prisma/adapter-pg` driver adapter
  (Prisma 7 requires a driver adapter; client is generated into
  `src/lib/database/generated/`, which is git-ignored).

## Security model

Prisma connects through the Supabase pooled connection using the `postgres`
role, which **bypasses RLS**. Therefore **authorization is enforced in the
service layer**: every query in `src/services/projects.ts` is scoped by the
authenticated `user.id` (`ownerId`), and child resources are reached only
through parent ownership. `getProject` returns NOT_FOUND for both missing and
foreign-owned rows so existence is never leaked.

RLS is **enabled (and FORCED) on all four tables with no policies for
`anon`/`authenticated`, plus `REVOKE ALL`** — purely defense in depth so the
Supabase Data API (PostgREST) with the publishable key cannot read or write
these tables. No "protective-looking" policies that never apply to the Prisma
connection were written.

`public.handle_new_user()` is a `SECURITY DEFINER` trigger function with
`set search_path = ''` that inserts a profile row on signup
(`ON CONFLICT DO NOTHING`); its EXECUTE is revoked from public/anon/
authenticated. `src/services/projects.ts#ensureProfile` provides the
app-level idempotent fallback for users that pre-date the trigger.

Optional future hardening: connect Prisma with a dedicated non-BYPASSRLS role
and write real RLS policies enforcing `auth.uid() = owner_id`.

Other invariants:

- Every server action calls `requireUser()` → `supabase.auth.getUser()`
  (never `getSession`) before touching the database.
- The `next` redirect param is restricted to same-origin relative paths
  (`src/lib/redirect.ts`, unit-tested).
- Env parse failures list every missing/invalid variable; secrets are never
  logged.

## Verify

```bash
pnpm typecheck   # tsc --noEmit
pnpm lint        # eslint .
pnpm test        # vitest run (55 tests; no network, no DB)
pnpm build       # prisma generate + next build — works WITHOUT real env vars
```

## Common problems

- **`Invalid environment configuration` at runtime** — a required env var is
  missing/invalid; the error lists exactly which. Check `.env.local` vs
  `.env.example`.
- **`prisma migrate dev` fails to connect** — `DIRECT_URL` must be a
  session-mode/direct Postgres URL. On IPv4 networks use the session pooler
  (port 5432), not `db.<ref>.supabase.co`.
- **`SCRAM ... client password must be a string`** — `DATABASE_URL` missing;
  `pg` fell back to defaults.
- **Email links land on the wrong page** — update the Supabase email
  templates and Redirect URLs as described in *Supabase project setup*.
- **`prisma generate` writes to `src/lib/database/generated/`** — this is
  intentional and git-ignored.

## Known limitations / deferred features

- No GitHub OAuth (email/password only in Phase 1).
- Repositories and Tasks exist in the schema but have no CRUD UI — disabled
  "Coming soon" sections.
- No pagination UI yet (list capped at 100, newest first).
- Display name is collected from email at signup; no profile editing UI yet.
- Migrations in `prisma/migrations/` were generated with
  `prisma migrate diff` and reviewed, but NOT yet applied to a live database.
