# AGENTS.md

## Verification commands

Run these before reporting changes (all must pass without real env vars):

```bash
pnpm install          # postinstall runs prisma generate
pnpm db:generate      # prisma generate (no env needed)
pnpm typecheck        # tsc --noEmit
pnpm lint             # eslint .
pnpm test             # vitest run
pnpm build            # prisma generate + next build
```

Database (requires real `DIRECT_URL` in `.env.local` — do not invent one):

```bash
pnpm db:migrate:dev   # apply migrations locally
pnpm db:migrate       # prisma migrate deploy (CI/prod)
```

## Conventions

- Only `src/config/*` may read `process.env`. `env.server.ts` and
  `database.ts` import `server-only`; keep it that way.
- Server Actions return `{ ok: true, data } | { ok: false, code, message }`
  from `src/lib/action-result.ts`. Never leak SQL/stack traces.
- All DB access goes through `src/services/*` with an explicit `userId`;
  scope every query by `ownerId`.
- Shared Zod schemas live in `src/schemas/` — reuse them in forms and
  server actions.
- Do not commit `.env*` files (except `.env.example`),
  `node_modules/`, `.next/`, or `src/lib/database/generated/`.
- Phase 1 deliberately has no AI agent, repo indexing, execution, or OAuth —
  keep them behind disabled "Coming soon" UI.
