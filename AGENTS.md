# AGENTS.md

## Cursor Cloud specific instructions

ComplianceOS (PraxisOne) is a single Next.js 16 (App Router) full-stack app — the frontend and all API route handlers run in the same server on port `3000`. Standard commands live in `package.json` (`dev`, `build`, `start`, `lint`) and `README.md`; use those. Notes below are the non-obvious bits for this cloud environment.

### Services (must be started manually each session)
The update script only refreshes npm deps. PostgreSQL 16 and Redis are installed at the system level (baked into the snapshot) but do NOT auto-start on boot in this container. Start them before running the app or tests:

```bash
sudo pg_ctlcluster 16 main start   # PostgreSQL on :5432
sudo service redis-server start    # Redis on :6379
```

Redis is optional — the app falls back to an in-memory mock if it is unavailable, so only Postgres is strictly required.

### Environment variables
- App env lives in `.env.local` (gitignored, not committed; already present in the snapshot). Next.js loads it automatically for `npm run dev`.
- Local dev uses `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/complianceos?schema=public`, a generated `NEXTAUTH_SECRET`, `NEXTAUTH_URL`/`NEXT_PUBLIC_APP_URL=http://localhost:3000`, plus `SKILL_LLM_SIMULATE=true` and `TWILIO_SKIP_OTP=true` so AI/onboarding flows work without external SaaS keys.
- Gotcha: the Prisma CLI reads `.env` (NOT `.env.local`). For `prisma db push`/`migrate`, export the var inline, e.g. `export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/complianceos?schema=public" && npx prisma db push`.

### Database schema
The `complianceos` DB and its schema (via `npx prisma db push`) are already applied in the snapshot. If `prisma/schema.prisma` changes, re-run `prisma db push` (with `DATABASE_URL` exported as above). Optional seed scripts live in `scripts/` (run with `npx tsx` / `node`).

### Testing notes
- `npm run lint` runs ESLint and currently reports pre-existing errors/warnings (also captured in the committed `eslint-output.txt`); these are not environment issues.
- No automated test runner is configured. Verify features by running `npm run dev` and exercising the UI (e.g. sign up at `/signup?plan=starter`, then act in `/dashboard`).
- Optional standalone WhatsApp webhook worker (needs Redis, no npm script): `npx tsx src/workers/webhook-consumer.ts`.
