# SARS & CIPC Automation — Implementation Plan

**Status:** Approved for implementation  
**Last updated:** July 2026  
**Scope:** Read-only CIPC integration + SARS document/correspondence intelligence  
**Out of scope:** Automated filing or submission to SARS or CIPC (staff remain responsible for all submissions via eFiling and CIPC eServices)

---

## Background

PraxisOne already models SARS and CIPC as compliance domains with:

- Deadline tracking and daily escalation (`src/lib/compliance-monitor.ts`, `/api/cron/compliance-deadlines`)
- Workflow templates with “Submit to SARS/CIPC” steps (manual process tracking)
- OCR for COR14.3, VAT 103, and Tax Clearance Certificate PDFs
- Document-to-compliance auto-resolve on upload

Due dates today are **approximations** (see `src/lib/compliance-catalog.ts`), and the `cipc-ar-checker` skill explicitly has no live CIPC API. This plan closes those gaps without automating government submissions.

---

## Principles

1. **Submissions stay manual** — consultants file on eFiling / CIPC eServices; PraxisOne tracks, validates, and updates status from documents and registry data.
2. **Read-only government data** — CIPC API calls fetch company profile, status, and BO registration; no write/filing operations.
3. **Document-first SARS loop** — automate classification, extraction, and workflow advancement from uploaded or inbound SARS correspondence.
4. **Graceful degradation** — if CIPC API is unavailable or credentials are unset, fall back to current OCR + manual due-date behaviour.

---

## Phase 1 — CIPC Read-Only Integration

**Goal:** Replace approximate CIPC due dates and manual reg-number validation with live registry data.

### 1.0 Obtaining CIPC API credentials (verified July 2026)

> **Important:** The documented developer portal at [guide.cipc.co.za](https://guide.cipc.co.za) is **currently unreachable** (HTTPS TLS handshake failure; HTTP returns Cloudflare 409). Do not block Phase 1 on self-service portal signup until CIPC confirms the portal is live.

**What still works today:**

| Service | URL | Status |
|---------|-----|--------|
| CIPC main site | [cipc.co.za](https://www.cipc.co.za) | Up |
| eServices (manual filings) | [eservices.cipc.co.za](https://eservices.cipc.co.za) | Up |
| Legacy Enterprise SOAP | [webservices1.cipc.co.za/Enterprise.asmx](https://webservices1.cipc.co.za/Enterprise.asmx) | Up (requires CIPC agreement) |
| Azure API gateway (backend) | `cipc-apm-rs-dev.azure-api.net` | Responds (needs subscription key) |
| Developer portal | [guide.cipc.co.za](https://guide.cipc.co.za) | **Down / inaccessible** |

**How to get API access (recommended order):**

1. **Contact CIPC directly** — log a case at [enquiries.cipc.co.za](https://www.enquiries.cipc.co.za) or email **Enquiries@cipc.co.za**. Request API subscription access for company profile and beneficial ownership lookups. Mention you need an `Ocp-Apim-Subscription-Key` for the Azure API Management gateway. CIPC's 2022 API gateway TOR listed technical enquiries to **DNkuna@cipc.co.za**.
2. **Try guide.cipc.co.za periodically** — if/when the portal is restored, self-service signup may be at `/getting-started/sign-up-on-portal` and API subscription at `/getting-started/subscribe-to-apis`.
3. **Third-party CIPC data provider (commercial fallback)** — if direct CIPC API access is slow or unavailable, providers such as [Datanamix CIPC Company Search Plus](https://www.datanamix.com/cipc-company-search-plus/) offer REST APIs with CIPC-sourced data. Abstract behind `src/lib/integrations/cipc/` so the provider is swappable.
4. **BizPortal (not suitable for automation)** — [bizportal.gov.za](https://www.bizportal.gov.za) allows logged-in searches only, capped at **20 per day** per CIPC Notice 36/2021. Useful for manual spot-checks, not PraxisOne sync.

**Prerequisite (separate from API):** register as a CIPC eServices customer at [eservices.cipc.co.za](https://eservices.cipc.co.za) for manual filings. This customer code is not the same as API credentials.

### 1.1 CIPC API client

| Task | Detail |
|------|--------|
| Obtain API credentials | Via CIPC enquiry (see §1.0); portal self-service when guide.cipc.co.za is restored |
| Add `src/lib/integrations/cipc/` | `client.ts`, `types.ts`, `company-profile.ts`, `beneficial-ownership.ts` |
| Provider abstraction | Support direct CIPC gateway **or** third-party aggregator via env `CIPC_PROVIDER=direct\|aggregator` |
| Token management | Cache OAuth token with refresh; no credentials in source |
| Error handling | Rate limits, 404 (invalid reg no), timeout → structured errors for UI |

**Endpoints (initial — direct CIPC gateway):**

- `POST /enterprise/v1/companyprofile` — enterprise name, status, directors, registration date, financial year end
- `GET /sandbox/boreg/enterprise/register/{enterprise_number}` — beneficial ownership statement status

### 1.2 Environment variables

Add to `.env.local` (empty in repo; no fallbacks):

```bash
CIPC_API_BASE_URL=
CIPC_CLIENT_ID=
CIPC_CLIENT_SECRET=
CIPC_SUBSCRIPTION_KEY=
CIPC_OAUTH_TOKEN_URL=
```

### 1.3 Client onboarding & validation

| Trigger | Behaviour |
|---------|-----------|
| Client create/edit with `registrationNumber` | Validate format; call CIPC company profile; pre-fill name, status, directors |
| Onboarding form (`/onboard/[slug]`) | Same validation when client submits CIPC reg number |
| Mismatch (OCR vs API) | Flag for staff review; do not silently overwrite |

### 1.4 Scheduled sync

| Job | Schedule | Action |
|-----|----------|--------|
| `cipc-registry-sync` | Daily (after compliance-deadlines cron) | For each client with `registrationNumber`, refresh profile + BO status |
| Persist snapshot | — | New table or JSON field: `ClientRegistrySnapshot` (status, directors hash, lastSyncedAt) |
| Update compliance items | — | Set **Annual Returns** due date from registration anniversary (30-day window per current OCR logic) |
| Update **Beneficial Ownership** | — | Map CIPC BO status → `compliant` / `action_required` / `critical` |

### 1.5 Upgrade `cipc-ar-checker` skill

Replace stub “acknowledge event” with:

- On `compliance.deadline_approaching` for CIPC items: optional live status check when API configured
- Log registry status in skill execution metadata for audit

### 1.6 UI

- Client detail: “Registry sync” badge (last synced, In Business / Deregistered)
- Compliance tab: show “Source: CIPC API” vs “Estimated” for due dates
- Settings (admin): CIPC integration status (configured / not configured / last error)

### Phase 1 deliverables

- [ ] CIPC API client module with tests (mocked HTTP)
- [ ] `POST /api/integrations/cipc/sync` (staff-triggered) + daily cron route
- [ ] Client create/edit hooks for validation and pre-fill
- [ ] `ClientRegistrySnapshot` (or equivalent) in Prisma schema
- [ ] Updated `cipc-ar-checker` skill
- [ ] `.env.example` entries documented in README

### Phase 1 success criteria

- Valid CIPC reg number returns live company status within 5s (p95)
- Annual return due dates derived from registration anniversary, not generic +1 year
- BO compliance item reflects CIPC register status when API is enabled
- Zero automated filings to CIPC

---

## Phase 2 — SARS Document & Correspondence Intelligence

**Goal:** Automate workflow and compliance updates from SARS documents and inbound channels—without eFiling integration.

### 2.1 Extend document classification

| Document type | Extract | Compliance / workflow mapping |
|---------------|---------|--------------------------------|
| **ITA34** (assessment) | Tax year, amount assessed, due date | Tax Compliance workflow → “Assessment Received”; Income Tax item notes |
| **VAT201** / submission confirmation | Period, reference number, submission date | VAT workflow step auto-complete; VAT item roll-forward |
| **SARS letter** (objection, audit, query) | Reference no, type, response deadline | New compliance note + task; optional skill trigger |
| **EMP201** confirmation | Period, PAYE ref | Payroll Setup / PAYE compliance |
| **SARS eFiling acknowledgement** | Return type, ref, timestamp | Auto-complete matching “Submit to SARS” workflow step |

Build on existing OCR in `src/app/api/documents/upload/route.ts` and `documentMatch.ts` (CoR14.x, VAT101, ITR14, etc.).

### 2.2 Inbound channel parsing

| Channel | Flow |
|---------|------|
| **Email** (`POST /api/webhooks/resend`) | Detect SARS sender patterns; attach PDFs to client vault; queue OCR |
| **WhatsApp** (Twilio inbox) | Same for PDF/image attachments from clients forwarding SARS mail |

Client matching: tax reference number, VAT number, company name fuzzy match against client record.

### 2.3 Workflow auto-completion rules

Extend `workflowEngine.ts` / `documentMatch.ts`:

- “Submit to SARS” steps complete on submission confirmation docs (not only pre-defined form names)
- “Follow Up” steps complete on SARS correspondence upload
- Terminal Tax Compliance step → mark Income Tax compliant when ITA34 uploaded and approved

### 2.4 Staff approval gate

Keep existing OCR approve flow (`/api/documents/[id]/ocr/approve`):

- Extracted SARS fields require staff approval before updating compliance status (same as COR14.3 today)
- Audit log all auto-suggested status changes

### 2.5 Optional: SARS Compliance Assistant (PRD Phase 2)

Deferred sub-feature unless prioritised:

- RAG over internal procedure docs + “How do I process a SARS objection?” style Q&A
- Does not require SARS API; uses `OPENAI_API_KEY` / skills framework

### Phase 2 deliverables

- [ ] OCR parsers for ITA34, VAT201 confirmation, SARS letters, EMP201 confirmation
- [ ] Document type enum / category updates in upload route
- [ ] Inbound email handler: SARS attachment routing
- [ ] `documentMatch.ts` rules for new SARS document types
- [ ] Workflow auto-complete mappings for submission confirmations
- [ ] Unit tests with fixture PDF text (see `scratch/` pattern for COR14.3)

### Phase 2 success criteria

- Uploading an approved ITA34 auto-completes the Tax Compliance “Assessment Received” step
- VAT submission confirmation rolls VAT due date forward without manual date entry
- Inbound SARS PDF via email attaches to correct client ≥80% of the time when tax/VAT number present
- No credentials stored for eFiling; no automated SARS submissions

---

## Explicitly out of scope

| Item | Reason |
|------|--------|
| eFiling login / credential vault | Security, MFA, legal liability |
| Automated VAT201 / ITR14 / IRP6 submission | User decision: submissions remain manual |
| CIPC eServices filing (annual returns, director changes) | Manual via CIPC portal |
| SARS ISV / Connect:Direct / third-party data channels | Enterprise reporting; not compliance orchestration |
| Browser RPA of government portals | Fragile, ToS risk |

---

## Implementation order

```
Phase 1.1–1.2  CIPC client + env vars
     ↓
Phase 1.3     Onboarding validation
     ↓
Phase 1.4–1.5 Registry sync cron + skill upgrade
     ↓
Phase 1.6     UI indicators
     ↓
Phase 2.1     SARS document OCR parsers
     ↓
Phase 2.2–2.3 Inbound routing + workflow rules
     ↓
Phase 2.4     Approval gate hardening + tests
```

Phase 1 and Phase 2.1 can be parallelised after the CIPC client foundation exists.

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| CIPC API sandbox vs production drift | Contract tests against documented schemas; feature flag per tenant |
| Rate limits on registry sync | Batch clients; stagger cron; cache snapshots 24h |
| OCR accuracy on SARS letter layouts | Staff approval required; confidence thresholds |
| Wrong client match on inbound docs | Require tax/VAT number match; else queue as “unassigned” |

---

## Related files (current)

| Area | Path |
|------|------|
| Compliance catalog | `src/lib/compliance-catalog.ts` |
| Compliance monitor | `src/lib/compliance-monitor.ts` |
| Workflow engine | `src/lib/workflowEngine.ts` |
| Document matching | `src/lib/documentMatch.ts` |
| OCR upload | `src/app/api/documents/upload/route.ts` |
| OCR approve | `src/app/api/documents/[id]/ocr/approve/route.ts` |
| CIPC skill (stub) | `scripts/seed-skills.js` |
| Workflow seeds | `scripts/seed-workflows.ts` |

---

## References

- [CIPC API documentation](https://guide.cipc.co.za) — **portal currently inaccessible**; docs may still describe the intended API shape
- [CIPC enterprise search discontinuation notice](https://www.cipc.co.za/?p=9863) — BizPortal 20/day limit; subscription service promised
- [CIPC API gateway TOR (2022)](https://www.cipc.co.za/wp-content/uploads/2022/07/Annexure_H-API-CIPC_Bid_No-21-2021-2022.pdf) — technical contact DNkuna@cipc.co.za
- [CIPC legacy Enterprise Web Service](https://webservices1.cipc.co.za/Enterprise.asmx)
- [SARS third-party data](https://www.sars.gov.za/businesses-and-employers/third-party-data/) (not in scope for filing; reference only)
- Product PRD: `prd.txt` (Phases 2–3 — AI docs & compliance monitoring)
