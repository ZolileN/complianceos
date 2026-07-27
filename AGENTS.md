# AGENTS.md

## Cursor Cloud specific instructions

ComplianceOS (PraxisOne) is a single Next.js 16 (App Router) full-stack app — the frontend and all API route handlers run in the same server on port `3000`. Standard commands live in `package.json` (`dev`, `build`, `start`, `lint`, `test`, `typecheck`) and `README.md`.

### Dashboards
- **Tenant dashboard** (`/dashboard/*`) — staff only: administrator, operations_manager, consultant. The client user role portal has been removed.
- **PraxisAdmin** (`/admin/*`) — platform ops for master tenants only.

### Services (must be started manually each session)
Redis is optional locally — the app falls back to an in-memory mock if unavailable:

```bash
sudo service redis-server start    # Redis on :6379 (optional)
```

### Environment variables
- Copy `.env.example` → `.env.local` for local development.
- `DATABASE_URL` in the snapshot may point at a hosted Neon Postgres — treat as PRODUCTION. Do NOT run destructive schema commands unless explicitly asked.
- Prisma CLI reads `.env` (not `.env.local`). For Prisma commands: `export DATABASE_URL="$(grep -m1 ^DATABASE_URL .env.local | cut -d= -f2- | tr -d '\"')" && npx prisma ...`
- `RESEND_API_KEY` is optional for build; email sends are skipped when unset.

### Testing
- `npm test` — Vitest unit tests (billing, entitlements, RBAC, invoicing).
- `npm run lint` — may report pre-existing warnings.
- `npm run typecheck` — TypeScript check without emit.

### Key routes added
- `/dashboard/revenue` — quotes, invoices, retainers, MRR summary
- `/sign/[token]` — public mandate e-sign (no login)
- `POST /api/webhooks/resend` — inbound email (route `{slug}@INBOUND_EMAIL_DOMAIN`)
- `GET /api/documents?q=` — document full-text search
