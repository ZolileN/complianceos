# ComplianceOS (PraxisOne)

ComplianceOS is a multi-tenant B2B SaaS platform for compliance consultancies — client management, document vaults with OCR, deadline monitoring, workflows, WhatsApp/email inbox, and revenue tooling. Built with Next.js 16 (App Router), TypeScript, Prisma, and PostgreSQL.

**Two dashboards:**

| Dashboard | Path | Who |
|-----------|------|-----|
| **Tenant staff** | `/dashboard/*` | `administrator`, `operations_manager`, `consultant` |
| **PraxisAdmin** | `/admin/*` | Platform ops (master tenants only) |

There is **no client login portal**. End clients interact via WhatsApp, email, public onboarding (`/onboard/{slug}`), and mandate e-signing (`/sign/[token]`).

**Pilot rollout:** see [`docs/PILOT_RUNBOOK.md`](docs/PILOT_RUNBOOK.md).

---

## Product areas

| Area | Routes / APIs | Notes |
|------|---------------|-------|
| Auth & signup | `/login`, `/signup`, `/accept-invite` | Starter plan includes 14-day trial |
| Clients | `/dashboard/clients` | Consultant-scoped access |
| Documents + OCR | `/dashboard/documents` | COR14.3, tax certs, SARS doc types; staff approval gate |
| Unassigned queue | `/dashboard/documents/unassigned` | Inbound docs without client match |
| Compliance | `/dashboard/compliance` | CSV + branded PDF export |
| Workflows & tasks | `/dashboard/workflows`, `/dashboard/tasks` | Document-triggered step completion |
| Inbox | `/dashboard/inbox` | WhatsApp (Twilio) + inbound email (Resend) |
| Mandates | `/sign/[token]` | Public e-sign, no login |
| Billing | `/dashboard/billing` | Paystack primary; Ozow when Paystack unset |
| Revenue | `/dashboard/revenue` | Quotes, invoices, retainers, MRR (admin/ops) |
| Marketplace / skills | `/dashboard/marketplace` | Optional OpenAI; human-approval steps |
| Help center | `/help` | Searchable articles |
| Legal / trust | `/terms`, `/privacy`, `/dpa`, `/security`, `/cookies`, `/refund-policy` | Public, SEO metadata |
| PraxisAdmin | `/admin`, `/admin/infrastructure` | Fleet, webhooks, diagnostics |

---

## SARS & CIPC automation

Read-only CIPC registry data + SARS document intelligence. **Submissions to SARS and CIPC remain manual.**

- **Plan:** [`docs/SARS_CIPC_AUTOMATION_PLAN.md`](docs/SARS_CIPC_AUTOMATION_PLAN.md)
- **Phase 1A (shipped):** SARS OCR parsers, inbound email/WhatsApp routing, workflow auto-complete, staff OCR approval
- **Phase 1B (shipped, `ocr` default):** CIPC provider abstraction (`ocr` / `direct` / `aggregator`), registry sync cron, client panel lookup; live registry needs API credentials
- **Ops track:** CIPC API subscription or commercial aggregator — parallel to engineering

---

## Plans & billing

Catalog and limits: `src/lib/plans.ts`.

| Plan | Price (ZAR/mo) | Trial | AI |
|------|----------------|-------|-----|
| Starter | R999 | 14 days | No |
| Growth | R2 999 | — | No |
| Professional | R7 999 | — | Yes |
| Enterprise | Contact sales | — | Yes |

- **Paystack** is the primary checkout rail when `PAYSTACK_SECRET_KEY` is set (even if `BILLING_PROVIDER=ozow`).
- **Ozow** is used only when Paystack is not configured.
- Billing email resolves from firm settings (`Tenant.email`) or falls back to the administrator login email.
- Month-to-month billing with a 7-day grace period after period end; `past_due` tenants are read-only.

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Database | PostgreSQL (Neon), Prisma 5 |
| Auth | NextAuth.js v4 (credentials, multi-tenant RBAC) |
| Files | UploadThing v7 (`UPLOADTHING_TOKEN`) |
| OCR | pdfjs-dist / pdf-parse |
| Email | Resend (outbound + inbound webhook) |
| WhatsApp | Twilio (OTP connect, `/api/webhooks/twilio`) |
| Billing | Paystack + Ozow fallback |
| Cache / queue | Upstash Redis (skills, admin telemetry) |
| PDF reports | pdfkit (compliance export) |
| Observability | Sentry |
| Hosting | Vercel |
| UI | Tailwind CSS v4, shadcn/ui, Lucide |

### UploadThing + Tailwind v4

Do **not** import `@uploadthing/react/styles.css` on individual pages. Wire UploadThing into the main Tailwind build in `src/app/globals.css`:

```css
@import "tailwindcss";
@import "uploadthing/tw/v4";
@source "../node_modules/@uploadthing/react/dist";
```

---

## Project structure

```
src/app/dashboard/*     Tenant staff UI
src/app/(internal)/admin/*   PraxisAdmin UI
src/app/api/*           Route handlers (REST + webhooks + crons)
src/components/*        Shared UI
src/lib/*               Business logic (billing, OCR, CIPC, compliance, etc.)
prisma/schema.prisma    Database schema
docs/                   Automation plan + pilot runbook
```

---

## Getting started

### Prerequisites

- Node.js 20+
- npm

### Install

```bash
npm install
cp .env.example .env.local   # fill in values
npx prisma generate
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Prisma CLI reads `.env` (not `.env.local`). For Prisma commands:

```bash
export DATABASE_URL="$(grep -m1 ^DATABASE_URL .env.local | cut -d= -f2- | tr -d '\"')"
npx prisma db push
```

### Environment variables

Copy `.env.example` → `.env.local`. Key groups:

| Group | Required vars |
|-------|----------------|
| Core | `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL` |
| Files | `UPLOADTHING_TOKEN` |
| Email | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `INBOUND_EMAIL_DOMAIN` |
| WhatsApp | `TWILIO_*` (see `.env.example`) |
| Crons | `CRON_SECRET` |
| Billing | `PAYSTACK_SECRET_KEY` (+ Ozow vars only if Paystack unset) |
| CIPC | `CIPC_PROVIDER=ocr` (default); direct/aggregator creds when available |
| Redis (prod) | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| Sentry (prod) | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` |
| Skills (optional) | `OPENAI_API_KEY` or `SKILL_LLM_SIMULATE=true` |

### Scheduled jobs (`vercel.json`)

| Schedule (UTC) | Route | Purpose |
|----------------|-------|---------|
| Daily 06:00 | `/api/cron/compliance-deadlines` | Escalate overdue compliance |
| Daily 06:30 | `/api/cron/cipc-registry-sync` | Registry snapshots (skipped in `ocr` mode) |
| Daily 07:00 | `/api/cron/trial-expiry` | Expire trials → `past_due` |
| Daily 08:00 | `/api/cron/billing-renewals` | Renewal dunning emails |
| Mon 09:00 | `/api/cron/compliance-report-email` | Weekly portfolio PDF email |

**External cron required:** `/api/cron/skill-events` every 5 minutes (Vercel Hobby limit) — configure at [cron-job.org](https://cron-job.org) with `Authorization: Bearer $CRON_SECRET`.

All cron routes require `CRON_SECRET` (Vercel sends `Authorization: Bearer` automatically).

### Webhooks to configure in provider dashboards

| Provider | URL |
|----------|-----|
| Twilio WhatsApp | `https://<app>/api/webhooks/twilio` |
| Resend inbound | `POST https://<app>/api/webhooks/resend` |
| Paystack | `https://<app>/api/billing/paystack/webhook` |

Set `TWILIO_WEBHOOK_URL` to the exact public Twilio webhook URL in production (signature validation).

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server (port 3000) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm test` | Vitest unit tests |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |

CI (`.github/workflows/ci.yml`): lint, typecheck, test on every PR.

---

## Production deploy checklist

1. Merge to `main` and let Vercel deploy.
2. Sync database schema **before or immediately after** deploy:

```bash
DATABASE_URL="postgresql://..." ./scripts/sync-production-schema.sh
# or: DATABASE_URL="..." npx prisma db push
```

3. Verify `/admin/infrastructure` — Redis, Paystack, Ozow health.
4. Confirm webhooks (Twilio, Resend, Paystack) point at production URLs.
5. Run a test checkout on `/dashboard/billing` if billing is enabled.

If schema sync is skipped, APIs for invoices, revenue, and registry snapshots will fail.

---

## Security & roles

| Role | Access |
|------|--------|
| **Administrator** | Full tenant access; PraxisAdmin for master tenants |
| **Operations manager** | Full tenant access |
| **Consultant** | Assigned clients, tasks, workflows only |

PraxisAdmin (`/admin/*`) is restricted to master tenant slugs (`praxisone`, `mlk-computer-consulting`) and requires the `administrator` role.

---

## Administrator setup

1. **Register:** `/signup` (or `/signup?plan=starter` for trial).
2. **Configure:** Settings → Company (billing email), Team, WhatsApp.
3. **PraxisAdmin:** `/admin` (master tenants only).

---

## Further reading

- [`docs/PILOT_RUNBOOK.md`](docs/PILOT_RUNBOOK.md) — Phase 1 friendly-firm pilot
- [`docs/SARS_CIPC_AUTOMATION_PLAN.md`](docs/SARS_CIPC_AUTOMATION_PLAN.md) — automation roadmap & status
- [`AGENTS.md`](AGENTS.md) — Cursor Cloud agent instructions
