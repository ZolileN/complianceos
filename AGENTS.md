# AGENTS.md

## Cursor Cloud specific instructions

ComplianceOS (PraxisOne) is a single Next.js 16 (App Router) full-stack app — the frontend and all API route handlers run on port `3000`. Standard commands: `dev`, `build`, `start`, `lint`, `test`, `typecheck` (`package.json`).

### Dashboards

- **Tenant dashboard** (`/dashboard/*`) — staff only: `administrator`, `operations_manager`, `consultant`. No client login portal.
- **PraxisAdmin** (`/admin/*`) — platform ops for master tenants only (`PLATFORM_ADMIN_SLUGS` in `src/lib/platform-admin-constants.ts`).

### Services (optional locally)

Redis is optional — the app falls back to an in-memory mock:

```bash
sudo service redis-server start   # :6379 (optional)
```

Production skills queue and admin telemetry need Upstash Redis (`UPSTASH_REDIS_REST_URL` + token).

### Environment variables

- Copy `.env.example` → `.env.local` for local development.
- `DATABASE_URL` in the snapshot may point at hosted Neon Postgres — treat as **PRODUCTION**. Do NOT run destructive schema commands unless explicitly asked.
- Prisma CLI reads `.env` (not `.env.local`):

```bash
export DATABASE_URL="$(grep -m1 ^DATABASE_URL .env.local | cut -d= -f2- | tr -d '\"')" && npx prisma ...
```

- `UPLOADTHING_TOKEN` — UploadThing v7 base64 token (not `UPLOADTHING_SECRET` / `UPLOADTHING_APP_ID`).
- `RESEND_API_KEY` — optional for build; email sends skipped when unset.
- `PAYSTACK_SECRET_KEY` — Paystack is primary billing rail when set; Ozow only when Paystack is unset.
- `CIPC_PROVIDER` — default `ocr`; set `direct` or `aggregator` when API credentials exist.
- `SKILL_LLM_SIMULATE=true` — stub OpenAI for local skill testing.

### Testing

- `npm test` — Vitest unit tests (billing, entitlements, RBAC, invoicing, CIPC, SARS parsers).
- `npm run lint` — may report pre-existing warnings.
- `npm run typecheck` — TypeScript check without emit.

### Tenant dashboard routes

| Path | Purpose |
|------|---------|
| `/dashboard` | Home |
| `/dashboard/clients` | Client list + detail |
| `/dashboard/documents` | Vault + upload |
| `/dashboard/documents/unassigned` | Inbound docs without client match |
| `/dashboard/compliance` | Portfolio compliance + CSV/PDF export |
| `/dashboard/workflows` | Workflow templates + client workflows |
| `/dashboard/tasks` | Task board |
| `/dashboard/inbox` | WhatsApp + email |
| `/dashboard/billing` | Plans, usage, Paystack checkout |
| `/dashboard/revenue` | Quotes, invoices, retainers, MRR |
| `/dashboard/marketplace` | Skills install + execution log |
| `/dashboard/team` | Invites + roles |
| `/dashboard/settings` | Company profile, WhatsApp connect |
| `/dashboard/audit-logs` | Tenant audit trail |

### Public / client-facing routes

| Path | Purpose |
|------|---------|
| `/onboard/[slug]` | Client onboarding form |
| `/sign/[token]` | Mandate e-sign |
| `/signup` | Firm registration + trial |
| `/help`, `/help/[slug]` | Help center |
| `/terms`, `/privacy`, `/dpa`, `/security`, `/cookies`, `/refund-policy` | Legal pages |

### Key APIs

| Route | Purpose |
|-------|---------|
| `POST /api/billing/checkout` | Start Paystack/Ozow checkout (admin) |
| `POST /api/billing/paystack/webhook` | Paystack payment events |
| `GET /api/billing/paystack/callback` | Browser return after Paystack |
| `POST /api/webhooks/twilio` | Inbound WhatsApp |
| `POST /api/webhooks/resend` | Inbound email (`{slug}@INBOUND_EMAIL_DOMAIN`) |
| `POST /api/integrations/cipc/sync` | Staff-triggered CIPC lookup |
| `GET /api/documents?q=` | Document full-text search |
| `GET /api/compliance/export/pdf` | Branded compliance PDF |

### Crons (`vercel.json` + `CRON_SECRET`)

| UTC | Route |
|-----|-------|
| 06:00 daily | `/api/cron/compliance-deadlines` |
| 06:30 daily | `/api/cron/cipc-registry-sync` |
| 07:00 daily | `/api/cron/trial-expiry` |
| 08:00 daily | `/api/cron/billing-renewals` |
| 09:00 Monday | `/api/cron/compliance-report-email` |

**External:** `/api/cron/skill-events` every 5 min (not in `vercel.json`).

### Billing behaviour

- `getBillingProvider()` prefers Paystack when `PAYSTACK_SECRET_KEY` is set.
- Ozow only when Paystack credentials are missing.
- `resolveTenantBillingEmail()` uses firm `Tenant.email` or administrator login email for Paystack.
- No runtime Paystack→Ozow fallback on checkout failure.

### Docs

- [`README.md`](README.md) — setup, deploy, webhooks
- [`docs/PILOT_RUNBOOK.md`](docs/PILOT_RUNBOOK.md) — pilot checklist
- [`docs/SARS_CIPC_AUTOMATION_PLAN.md`](docs/SARS_CIPC_AUTOMATION_PLAN.md) — automation plan + implementation status
