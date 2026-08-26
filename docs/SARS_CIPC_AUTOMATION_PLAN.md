# SARS & CIPC Automation — Implementation Plan

**Status:** Phase 1A and Phase 1B **core engineering shipped** (August 2026)  
**Last updated:** 26 August 2026  
**Scope:** Read-only CIPC registry data + SARS document/correspondence intelligence  
**Out of scope:** Automated filing or submission to SARS or CIPC (staff remain responsible for all submissions via eFiling and CIPC eServices)

---

## Implementation status (August 2026)

### Phase 1A — SARS document intelligence

| Deliverable | Status | Location |
|-------------|--------|----------|
| OCR parsers (ITA34, VAT201, EMP201, eFiling ack, SARS letters) | ✅ Shipped | `src/lib/sars-document-parsers.ts` |
| Upload route classification | ✅ Shipped | `src/app/api/documents/upload/route.ts` |
| Inbound email SARS routing | ✅ Shipped | `src/lib/inbound-sars-routing.ts`, Resend webhook |
| Inbound WhatsApp PDF routing | ✅ Shipped | `src/lib/inbound-document-processor.ts`, Twilio webhook |
| Unassigned doc queue UI | ✅ Shipped | `/dashboard/documents/unassigned` |
| Workflow auto-complete rules | ✅ Shipped | `src/lib/documentMatch.ts`, `workflowEngine.ts` |
| Staff OCR approval gate | ✅ Shipped | `/api/documents/[id]/ocr/approve` |
| Fixture unit tests | ✅ Partial | `src/lib/__fixtures__/sars/` (ITA34, VAT201, SARS letter) |
| Production match-rate validation | ⏳ Pending | Ops — target ≥80% when tax/VAT number present |

### Phase 1B — CIPC registry integration

| Deliverable | Status | Location |
|-------------|--------|----------|
| Provider interface (`ocr` / `direct` / `aggregator`) | ✅ Shipped | `src/lib/integrations/cipc/` |
| `ClientRegistrySnapshot` model | ✅ Shipped | `prisma/schema.prisma` |
| Daily sync cron | ✅ Shipped | `/api/cron/cipc-registry-sync` |
| Staff sync API | ✅ Shipped | `POST /api/integrations/cipc/sync` |
| Client detail registry panel | ✅ Shipped | `CipcRegistryPanel` on client page |
| `cipc-ar-checker` skill (live provider) | ✅ Shipped | `src/lib/skill-engine.ts` |
| Auto-validation on client create/edit | ❌ Not yet | Manual lookup via panel only |
| Onboarding form CIPC validation | ❌ Not yet | — |
| Compliance tab “registry vs estimated” labels | ❌ Not yet | — |
| Admin CIPC settings UI | ❌ Not yet | — |
| Live `direct` / `aggregator` in production | ⏳ Blocked | Needs CIPC API or aggregator credentials |

### Phase 2 — deferred

| Item | Status |
|------|--------|
| SARS Compliance Assistant (RAG Q&A) | Not started |
| AI workflow suggestions | Partial overlap with compliance monitor |

**Default production config:** `CIPC_PROVIDER=ocr` (no regression from pre-integration behaviour).

---

## Executive summary

| Phase | Focus | Blocked on CIPC API? |
|-------|--------|----------------------|
| **Phase 1A** | SARS document OCR + inbound routing | No — start immediately |
| **Phase 1B** | CIPC registry integration (provider-abstracted) | Partially — build module now; plug in credentials when available |
| **Credential track** | CIPC direct enquiry or commercial aggregator | Parallel workstream (ops, not engineering) |

Submissions to SARS and CIPC remain **manual**. PraxisOne automates tracking, validation, and status updates from documents and registry data.

---

## Background

PraxisOne already models SARS and CIPC as compliance domains with:

- Deadline tracking and daily escalation (`src/lib/compliance-monitor.ts`, `/api/cron/compliance-deadlines`)
- Workflow templates with “Submit to SARS/CIPC” steps (manual process tracking)
- OCR for COR14.3, VAT 103, and Tax Clearance Certificate PDFs
- Document-to-compliance auto-resolve on upload

Gaps this plan closes:

- Due dates are **approximations** (see `src/lib/compliance-catalog.ts`), not registry-sourced
- `cipc-ar-checker` skill has no live lookup (`scripts/seed-skills.js`)
- SARS submission confirmations and assessments are not auto-classified or workflow-linked
- CIPC developer portal ([guide.cipc.co.za](https://guide.cipc.co.za)) is **inaccessible** — credential acquisition requires an alternative path

---

## Principles

1. **Submissions stay manual** — consultants file on eFiling / CIPC eServices; PraxisOne tracks outcomes from uploaded documents and registry snapshots.
2. **Read-only registry data** — no write/filing operations to government systems.
3. **Document-first SARS loop** — classify, extract, and advance workflows from uploaded or inbound SARS correspondence.
4. **Provider abstraction for CIPC** — one interface, multiple backends (`ocr`, `direct`, `aggregator`).
5. **Graceful degradation** — if no CIPC provider is configured, fall back to existing OCR + estimated due dates (current behaviour).

---

## CIPC data provider strategy

### Portal status (verified 29 July 2026)

| Service | URL | Status |
|---------|-----|--------|
| CIPC main site | [cipc.co.za](https://www.cipc.co.za) | Up |
| eServices (manual filings) | [eservices.cipc.co.za](https://eservices.cipc.co.za) | Up |
| BizPortal (manual search) | [bizportal.gov.za](https://www.bizportal.gov.za) | Up — 20 searches/day/user |
| Legacy Enterprise SOAP | [webservices1.cipc.co.za/Enterprise.asmx](https://webservices1.cipc.co.za/Enterprise.asmx) | Up — requires CIPC agreement |
| Azure API gateway (backend) | `cipc-apm-rs-dev.azure-api.net` | Responds — needs subscription key |
| Developer portal | [guide.cipc.co.za](https://guide.cipc.co.za) | **Down** (TLS failure / Cloudflare 409) |

### Provider modes (`CIPC_PROVIDER`)

| Mode | When to use | Data source |
|------|-------------|-------------|
| `ocr` (default) | No API credentials yet; always available | COR14.3 OCR on upload + estimated due dates |
| `direct` | CIPC issues `Ocp-Apim-Subscription-Key` | Azure APIM gateway (`cipc-apm-rs-dev.azure-api.net`) |
| `aggregator` | Commercial contract with a CIPC data reseller | e.g. Datanamix, CompanyData — REST API |

All modes implement the same interface:

```typescript
// src/lib/integrations/cipc/types.ts
interface CipcRegistryProvider {
  getCompanyProfile(enterpriseNumber: string): Promise<CompanyProfile>;
  getBeneficialOwnershipStatus(enterpriseNumber: string): Promise<BoStatus>;
}
```

### Credential acquisition (parallel ops track)

Do **not** block engineering on portal self-service. Pursue in parallel:

1. **CIPC direct** — log a case at [enquiries.cipc.co.za](https://www.enquiries.cipc.co.za) or email **Enquiries@cipc.co.za**. Request API subscription for company profile + beneficial ownership lookups. Ask for `Ocp-Apim-Subscription-Key`. Technical contact from CIPC's 2022 API gateway TOR: **DNkuna@cipc.co.za**.
2. **Commercial aggregator** — evaluate [Datanamix CIPC Company Search Plus](https://www.datanamix.com/cipc-company-search-plus/) or similar. Faster to onboard; recurring cost per lookup.
3. **Monitor guide.cipc.co.za** — retry periodically; self-service paths (when restored): `/getting-started/sign-up-on-portal`, `/getting-started/subscribe-to-apis`.

**Separate from API:** eServices customer code ([eservices.cipc.co.za](https://eservices.cipc.co.za)) is for manual filings only.

**Not suitable for automation:** BizPortal manual search (20/day cap per [CIPC Notice 36/2021](https://www.cipc.co.za/?p=9863)).

---

## Phase 1A — SARS Document & Correspondence Intelligence

**Goal:** Automate workflow and compliance updates from SARS documents and inbound channels — no eFiling integration required.  
**Priority:** Start first — no external credentials needed.

### 1A.1 Extend document classification

| Document type | Extract | Compliance / workflow mapping |
|---------------|---------|--------------------------------|
| **ITA34** (assessment) | Tax year, amount assessed, due date | Tax Compliance → “Assessment Received”; Income Tax notes |
| **VAT201** / submission confirmation | Period, reference number, submission date | VAT workflow step auto-complete; VAT roll-forward |
| **SARS letter** (objection, audit, query) | Reference no, type, response deadline | Compliance note + task; optional skill trigger |
| **EMP201** confirmation | Period, PAYE ref | Payroll Setup / PAYE compliance |
| **SARS eFiling acknowledgement** | Return type, ref, timestamp | Auto-complete matching “Submit to SARS” workflow step |

Build on `src/app/api/documents/upload/route.ts` and `src/lib/documentMatch.ts`.

### 1A.2 Inbound channel parsing

| Channel | Flow |
|---------|------|
| **Email** (`POST /api/webhooks/resend`) | Detect SARS sender patterns; attach PDFs to client vault; queue OCR |
| **WhatsApp** (Twilio inbox) | Same for PDF/image attachments forwarded by clients |

Client matching: tax reference number, VAT number, company name fuzzy match. Unmatched docs → “unassigned” queue for staff.

### 1A.3 Workflow auto-completion rules

Extend `workflowEngine.ts` / `documentMatch.ts`:

- “Submit to SARS” steps complete on submission confirmation docs
- “Follow Up” steps complete on SARS correspondence upload
- Terminal Tax Compliance step → mark Income Tax compliant when ITA34 approved

### 1A.4 Staff approval gate

Keep OCR approve flow (`/api/documents/[id]/ocr/approve`):

- Extracted SARS fields require staff approval before compliance status changes
- Audit log all auto-suggested updates

### Phase 1A deliverables

- [x] OCR parsers for ITA34, VAT201 confirmation, SARS letters, EMP201 confirmation, eFiling ack
- [x] Document category updates in upload route
- [x] Inbound email handler: SARS attachment routing
- [x] Inbound WhatsApp handler: PDF attachment routing
- [x] `documentMatch.ts` rules for new SARS document types
- [x] Workflow auto-complete mappings
- [x] Unit tests with fixture PDF text (`src/lib/__fixtures__/sars/`)
- [ ] Production validation of inbound match rate (≥80% target)

### Phase 1A success criteria

- Approved ITA34 auto-completes Tax Compliance “Assessment Received” step
- VAT submission confirmation rolls VAT due date forward without manual entry
- Inbound SARS PDF via email attaches to correct client ≥80% when tax/VAT number present
- No eFiling credentials stored; no automated SARS submissions

---

## Phase 1B — CIPC Registry Integration

**Goal:** Replace approximate CIPC due dates and manual reg-number validation with live registry data when a provider is configured.  
**Priority:** Build integration layer immediately with mocks; activate when credentials arrive.

### 1B.1 Integration module

```
src/lib/integrations/cipc/
├── types.ts              # CompanyProfile, BoStatus, provider interface
├── provider-ocr.ts       # Fallback: parse latest COR14.3 from document vault
├── provider-direct.ts    # CIPC Azure APIM gateway
├── provider-aggregator.ts # Commercial reseller (env-specific endpoint)
├── index.ts              # Factory: select provider from CIPC_PROVIDER env
└── __tests__/            # Mocked HTTP; fixture responses
```

| Task | Detail |
|------|--------|
| Provider factory | `CIPC_PROVIDER=ocr\|direct\|aggregator`; default `ocr` |
| Direct provider | OAuth token cache + `Ocp-Apim-Subscription-Key` header |
| Aggregator provider | Env-driven base URL + API key; map response to canonical types |
| OCR provider | Read latest approved COR14.3 `ocrMetadata` for client; no network call |

**Direct gateway endpoints (when credentials available):**

- `POST /enterprise/v1/companyprofile`
- `GET /sandbox/boreg/enterprise/register/{enterprise_number}`

### 1B.2 Environment variables

```bash
# Provider selection (default: ocr)
CIPC_PROVIDER=ocr

# Direct CIPC gateway (when CIPC_PROVIDER=direct)
CIPC_API_BASE_URL=
CIPC_CLIENT_ID=
CIPC_CLIENT_SECRET=
CIPC_SUBSCRIPTION_KEY=
CIPC_OAUTH_TOKEN_URL=

# Commercial aggregator (when CIPC_PROVIDER=aggregator)
CIPC_AGGREGATOR_BASE_URL=
CIPC_AGGREGATOR_API_KEY=
```

### 1B.3 Client onboarding & validation

| Trigger | Behaviour |
|---------|-----------|
| Client create/edit with `registrationNumber` | Format validation; if provider ≠ `ocr`, live lookup + pre-fill |
| Onboarding form (`/onboard/[slug]`) | Same validation on CIPC reg number submit |
| Mismatch (OCR vs registry) | Flag for staff review; never silent overwrite |
| No provider configured | Current behaviour unchanged (OCR + estimates) |

### 1B.4 Scheduled sync

| Job | Schedule | Action |
|-----|----------|--------|
| `cipc-registry-sync` | Daily (after compliance-deadlines cron) | Refresh profile + BO for clients with `registrationNumber` |
| Skip when | `CIPC_PROVIDER=ocr` or credentials missing | Log once; no error spam |
| Persist snapshot | — | `ClientRegistrySnapshot` (status, directors hash, provider, lastSyncedAt) |
| Update compliance | — | AR due date from registration anniversary; BO status from registry |

### 1B.5 Upgrade `cipc-ar-checker` skill

- When live provider configured: check registry status on `compliance.deadline_approaching`
- When `ocr` mode: keep current acknowledge-only behaviour
- Log provider + status in skill execution metadata

### 1B.6 UI

- Client detail: “Registry sync” badge (provider, last synced, In Business / Deregistered)
- Compliance tab: “Source: CIPC registry” vs “Estimated (OCR)” vs “Estimated (default)”
- Settings (admin): provider mode, credential status, last sync error

### Phase 1B deliverables

- [x] Provider interface + `ocr` / `direct` / `aggregator` implementations
- [x] `POST /api/integrations/cipc/sync` (staff-triggered) + daily cron route
- [ ] Client create/edit validation hooks
- [x] `ClientRegistrySnapshot` in Prisma schema
- [x] Updated `cipc-ar-checker` skill
- [x] `.env.example` + README documentation
- [x] Client detail registry panel (manual lookup + apply)
- [ ] Compliance tab source labels (registry vs estimated)
- [ ] Admin settings UI for provider/credentials

### Phase 1B success criteria

- With `CIPC_PROVIDER=ocr`: zero regression from current behaviour
- With live provider: valid reg number returns status within 5s (p95)
- AR due dates from registration anniversary when registry data available
- BO compliance item reflects registry status when provider active
- Zero automated filings to CIPC

---

## Phase 2 — Optional enhancements (deferred)

| Item | Notes |
|------|-------|
| SARS Compliance Assistant (PRD) | RAG Q&A (“How do I process a SARS objection?”); needs `OPENAI_API_KEY` |
| AI workflow suggestions | “Missing tax clearance”, “VAT deadline approaching” — partial overlap with compliance monitor |

---

## Explicitly out of scope

| Item | Reason |
|------|--------|
| eFiling login / credential vault | Security, MFA, legal liability |
| Automated VAT201 / ITR14 / IRP6 submission | Submissions remain manual |
| CIPC eServices filing (AR, director changes) | Manual via CIPC portal |
| SARS ISV / Connect:Direct | Enterprise reporting; not compliance orchestration |
| Browser RPA of government portals | Fragile, ToS risk |
| BizPortal scraping | 20/day cap; POPI restrictions; not scalable |

---

## Implementation order

```
┌─────────────────────────────────────────────────────────────┐
│  PARALLEL TRACK A (engineering)                             │
├─────────────────────────────────────────────────────────────┤
│  Phase 1A.1   SARS OCR parsers                              │
│       ↓                                                     │
│  Phase 1A.2–3 Inbound routing + workflow rules              │
│       ↓                                                     │
│  Phase 1A.4   Approval gate + tests                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  PARALLEL TRACK B (engineering)                             │
├─────────────────────────────────────────────────────────────┤
│  Phase 1B.1   CIPC provider interface + ocr fallback        │
│       ↓                                                     │
│  Phase 1B.2–3 Env vars + onboarding hooks (mocked tests)    │
│       ↓                                                     │
│  Phase 1B.4–6 Sync cron + skill + UI (activate on creds)    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  PARALLEL TRACK C (ops — not blocking engineering)          │
├─────────────────────────────────────────────────────────────┤
│  CIPC case logged → subscription key OR aggregator contract │
│       ↓                                                     │
│  Set CIPC_PROVIDER + credentials in production env          │
└─────────────────────────────────────────────────────────────┘
```

**Recommended start:** Phase 1A and Phase 1B.1 in parallel. Track C is ops work you can kick off today.

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| guide.cipc.co.za remains down | Provider abstraction; commercial aggregator fallback; `ocr` mode always works |
| CIPC direct access slow or denied | Aggregator contract; don't block Phase 1A |
| CIPC API sandbox vs production drift | Contract tests against documented schemas; feature flag per tenant |
| Rate limits on registry sync | Batch clients; stagger cron; cache snapshots 24h |
| OCR accuracy on SARS letters | Staff approval required; confidence thresholds |
| Wrong client match on inbound docs | Require tax/VAT number; else unassigned queue |
| Aggregator cost at scale | Cache aggressively; sync daily not per-page-view |

---

## Related files (current)

| Area | Path |
|------|------|
| SARS parsers | `src/lib/sars-document-parsers.ts` |
| Inbound SARS routing | `src/lib/inbound-sars-routing.ts`, `src/lib/inbound-document-processor.ts` |
| Compliance catalog | `src/lib/compliance-catalog.ts` |
| Compliance monitor | `src/lib/compliance-monitor.ts` |
| Compliance PDF export | `src/lib/compliance-report-pdf.ts` |
| Workflow engine | `src/lib/workflowEngine.ts` |
| Document matching | `src/lib/documentMatch.ts` |
| OCR upload | `src/app/api/documents/upload/route.ts` |
| OCR approve | `src/app/api/documents/[id]/ocr/approve/route.ts` |
| CIPC integration | `src/lib/integrations/cipc/` |
| CIPC sync cron | `src/app/api/cron/cipc-registry-sync/route.ts` |
| CIPC registry panel | client detail UI (`CipcRegistryPanel`) |
| CIPC skill | `src/lib/skill-engine.ts` |
| Workflow seeds | `scripts/seed-workflows.ts` |

**Docs:** [`README.md`](../README.md) · [`PILOT_RUNBOOK.md`](./PILOT_RUNBOOK.md) · [`AGENTS.md`](../AGENTS.md)

---

## References

- [CIPC API documentation](https://guide.cipc.co.za) — portal inaccessible; docs describe intended API shape
- [CIPC enterprise search discontinuation](https://www.cipc.co.za/?p=9863) — BizPortal 20/day limit
- [CIPC API gateway TOR (2022)](https://www.cipc.co.za/wp-content/uploads/2022/07/Annexure_H-API-CIPC_Bid_No-21-2022.pdf) — DNkuna@cipc.co.za
- [CIPC legacy Enterprise Web Service](https://webservices1.cipc.co.za/Enterprise.asmx)
- [Datanamix CIPC Company Search Plus](https://www.datanamix.com/cipc-company-search-plus/) — commercial aggregator option
- [SARS third-party data](https://www.sars.gov.za/businesses-and-employers/third-party-data/) — not in scope for filing
- Product PRD: `prd.txt`
