# AGENTS.md

## Cursor Cloud specific instructions

ComplianceOS (PraxisOne) is a single Next.js 16 (App Router) full-stack app — the frontend and all API route handlers run in the same server on port `3000`. Standard commands live in `package.json` (`dev`, `build`, `start`, `lint`) and `README.md`; use those. Notes below are the non-obvious bits for this cloud environment.

### Services (must be started manually each session)
The update script only refreshes npm deps. Redis is installed at the system level (baked into the snapshot) but does NOT auto-start on boot in this container. Redis is optional — the app falls back to an in-memory mock if unavailable:

```bash
sudo service redis-server start    # Redis on :6379 (optional)
```

A local PostgreSQL 16 is also installed as a fallback (`sudo pg_ctlcluster 16 main start`, DB `complianceos`, user/pass `postgres`/`postgres`), but the active `.env.local` points at a hosted database instead (see below), so local Postgres is usually not needed.

### Environment variables
- App env lives in `.env.local` (gitignored, not committed; present in the snapshot). Next.js loads it automatically for `npm run dev`.
- `DATABASE_URL` points at a hosted **Neon** Postgres instance — treat it as PRODUCTION. Do NOT run destructive/schema-mutating commands against it (`prisma db push`, `prisma migrate`, seed scripts, or bulk deletes) unless explicitly asked. The schema is already applied there. For non-destructive verification, prefer read-only queries or side-effect-free code paths.
- Other keys in `.env.local` are real credentials (Twilio, Stitch/Ozow billing, Resend, UploadThing). `TWILIO_SKIP_OTP=true` bypasses SMS OTP for local testing.
- Gotcha: changing `NEXTAUTH_SECRET` invalidates existing browser session cookies — a stale cookie produces a `JWT_SESSION_ERROR` (decryption failed) in server logs until you clear cookies / log in fresh. This is harmless.
- Gotcha: the Prisma CLI reads `.env` (NOT `.env.local`). For any Prisma CLI command that needs the DB, export the var inline, e.g. `export DATABASE_URL="$(grep -m1 ^DATABASE_URL .env.local | cut -d= -f2- | tr -d '\"')" && npx prisma ...`.

### Testing notes
- `npm run lint` runs ESLint and currently reports pre-existing errors/warnings (also captured in the committed `eslint-output.txt`); these are not environment issues.
- No automated test runner is configured. Verify features by running `npm run dev` and exercising the UI (e.g. sign up at `/signup?plan=starter`, then act in `/dashboard`).
- Optional standalone WhatsApp webhook worker (needs Redis, no npm script): `npx tsx src/workers/webhook-consumer.ts`.
