# ComplianceOS — Phase 1 Pilot Runbook

**Audience:** Platform ops + pilot firm administrator  
**Duration:** 2–4 weeks  
**Goal:** Validate day-to-day compliance operations with one friendly firm before paid multi-tenant launch.

**In scope:** Client management, documents/OCR, compliance deadlines, workflows, staff inbox (WhatsApp/email), public onboarding, mandate e-sign, weekly reporting.  
**Out of scope:** Automated SARS/CIPC filing, live CIPC registry (without API credentials), client login portal, enterprise self-serve signup.

---

## 1. Pilot profile

| Setting | Recommendation |
|---------|----------------|
| Firms | **1** friendly practice |
| Clients | **5–20** real or representative profiles |
| Plan | **Starter trial** (14 days) — defer paid upgrades until Paystack prod is verified |
| CIPC | `CIPC_PROVIDER=ocr` (default) — COR14.3 OCR + estimated due dates |
| WhatsApp | Twilio **sandbox** or one dedicated production number |
| Skills / AI | `SKILL_LLM_SIMULATE=true` unless Redis + OpenAI are configured |

---

## 2. Pre-flight checklist (platform ops)

Complete **before** inviting the pilot firm.

### Database & deploy

- [ ] Merge latest `main` and redeploy Vercel
- [ ] Sync production schema:
  ```bash
  DATABASE_URL="postgresql://..." npx prisma db push
  ```
  Or use `scripts/sync-production-schema.sh`
- [ ] Confirm no Sentry errors for missing tables (`Invoice`, `ClientRegistrySnapshot`, etc.)

### Required environment

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon Postgres |
| `NEXTAUTH_SECRET`, `NEXTAUTH_URL` | Auth |
| `NEXT_PUBLIC_APP_URL` | Public links (onboarding, mandates, Paystack callback) |
| `UPLOADTHING_TOKEN` | Document uploads (v7 token from UploadThing dashboard) |
| `CRON_SECRET` | All `/api/cron/*` routes |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Outbound email |
| `INBOUND_EMAIL_DOMAIN` | Tenant inbound routing (`{slug}@domain`) |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | Error monitoring |

### Crons (Vercel — already in `vercel.json`)

| Schedule (UTC) | Route |
|----------------|-------|
| Daily 06:00 | `/api/cron/compliance-deadlines` |
| Daily 06:30 | `/api/cron/cipc-registry-sync` |
| Daily 07:00 | `/api/cron/trial-expiry` |
| Daily 08:00 | `/api/cron/billing-renewals` |
| Mon 09:00 | `/api/cron/compliance-report-email` |

**Defer for Phase 1:** `/api/cron/skill-events` (needs Redis + external 5-min cron).

### WhatsApp (if pilot uses inbox)

- [ ] `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER`, `TWILIO_VERIFY_SERVICE_SID`
- [ ] Twilio webhook → `https://<app>/api/webhooks/twilio`
- [ ] Sandbox: set `TWILIO_SKIP_OTP=true` only for testing (not production)

### Resend inbound (if pilot uses email inbox)

- [ ] Resend webhook → `POST /api/webhooks/resend`
- [ ] Each tenant slug routable as `{slug}@INBOUND_EMAIL_DOMAIN`

### Health check

- [ ] Visit `/admin/infrastructure` (master tenant admin only)
- [ ] Redis: optional for Phase 1 (degraded is OK)
- [ ] Paystack: configured if testing paid upgrades in Phase 2

---

## 3. Tenant provisioning (pilot firm)

### Option A — Firm self-signup (recommended)

1. Firm admin goes to `/signup?plan=starter`
2. Completes firm name, email, password
3. 14-day trial starts automatically
4. Admin lands on `/dashboard`

### Option B — Ops creates tenant

Use PraxisAdmin (`/admin`) if you provision manually; assign first user as `administrator`.

### Post-provision setup (firm admin)

| Step | Where | Notes |
|------|-------|-------|
| Company profile | Settings → Company | Business email used for Paystack billing |
| Team invites | Dashboard → Team | Invite ops managers + consultants |
| WhatsApp connect | Settings → WhatsApp | OTP flow to link firm number |
| Onboarding link | Settings / onboard slug | Share `/onboard/{slug}` with clients |
| Workflow templates | Dashboard → Workflows | Launch on new clients |

---

## 4. Week-by-week test scenarios

### Week 1 — Core ops

| # | Scenario | Success criteria |
|---|----------|------------------|
| 1 | Create 5 clients (manual + onboarding form) | Clients appear with correct consultant assignment |
| 2 | Upload COR14.3 + tax certificate | OCR extracts fields; staff approves; client profile updates |
| 3 | Compliance dashboard | Deadlines visible; overdue items escalate after daily cron |
| 4 | Launch onboarding workflow on a client | Steps track; document upload auto-completes matching steps |
| 5 | Create + send mandate | Client signs at `/sign/[token]`; status updates in dashboard |

### Week 2 — Channels & intelligence

| # | Scenario | Success criteria |
|---|----------|------------------|
| 6 | WhatsApp message to firm number | Appears in Inbox; consultant can reply |
| 7 | Forward SARS PDF via WhatsApp or email | Routes to client vault or unassigned queue |
| 8 | Staff approves OCR on SARS letter/ITA34 | Compliance item or workflow step advances |
| 9 | CIPC panel on client (manual lookup) | Works in `ocr` mode from vault metadata |
| 10 | Export compliance PDF | Branded PDF downloads; weekly email cron sends Monday report |

### Week 3–4 — Hardening

| # | Scenario | Success criteria |
|---|----------|------------------|
| 11 | Consultant RBAC | Consultant sees only assigned clients |
| 12 | Trial expiry | After trial end, workspace goes read-only until payment |
| 13 | Audit log | Admin sees CREATE/UPDATE actions |
| 14 | Pilot feedback session | Document friction points (see §6) |

**Phase 2 only (after Paystack prod verified):** upgrade plan via `/dashboard/billing` → Paystack checkout → subscription active.

---

## 5. Roles during pilot

| Role | Pilot responsibilities |
|------|------------------------|
| **Platform ops** | Env, crons, schema, `/admin/infrastructure`, Sentry triage |
| **Firm administrator** | Team, billing, company settings, WhatsApp connect |
| **Operations manager** | Workflows, compliance oversight, unassigned doc queue |
| **Consultant** | Day-to-day clients, inbox, document upload, OCR approval |

---

## 6. Success metrics

Track weekly with the pilot firm:

| Metric | Target (Phase 1) |
|--------|------------------|
| Clients onboarded | ≥ 5 |
| Documents uploaded + OCR approved | ≥ 10 |
| Compliance deadlines tracked | 100% of pilot clients |
| Inbound docs auto-matched to client | ≥ 70% (staff review remainder) |
| Workflow steps completed via doc upload | ≥ 3 end-to-end |
| Critical Sentry issues | 0 unresolved > 48h |
| Pilot firm NPS / qualitative | “Would continue using” |

---

## 7. Known limitations (set expectations)

- **No automated filing** to SARS or CIPC — staff submit manually; PraxisOne tracks outcomes from documents.
- **CIPC due dates** are estimated unless live API credentials are configured (`CIPC_PROVIDER=direct|aggregator`).
- **OCR suggestions require staff approval** — never auto-apply without review.
- **No client login** — clients use WhatsApp, email, onboarding link, mandate sign.
- **AI skills** need Redis + OpenAI for production automation; simulate locally.
- **Revenue/invoicing** module exists but should wait until production DB schema is confirmed.

---

## 8. Escalation & rollback

| Issue | Action |
|-------|--------|
| Production error spike | Check Sentry; roll back Vercel deployment if needed |
| Wrong client doc match | Use unassigned queue; fix matching rules post-pilot |
| WhatsApp delivery failure | Verify Twilio webhook + number status |
| Billing checkout failure | Confirm `PAYSTACK_SECRET_KEY` + firm/admin email in Settings → Company |
| Data concern | Tenant isolation is per `tenantId`; use PraxisAdmin audit logs |

**Pilot exit:** Export compliance CSV/PDF, document feedback, decide Phase 2 (paid + production WhatsApp + Redis).

---

## 9. Phase 2 gate (before wider launch)

- [ ] Paystack checkout + webhook verified end-to-end in production
- [ ] Production WhatsApp number (remove `TWILIO_SKIP_OTP`)
- [ ] Upstash Redis connected; skill-events cron every 5 minutes
- [ ] Inbound SARS matching validated on real correspondence sample
- [ ] CIPC API credentials (optional) — only if selling live registry
- [ ] Second firm onboarded without ops hand-holding

---

*Last updated: August 2026 · See also [`SARS_CIPC_AUTOMATION_PLAN.md`](./SARS_CIPC_AUTOMATION_PLAN.md) and [`AGENTS.md`](../AGENTS.md).*
