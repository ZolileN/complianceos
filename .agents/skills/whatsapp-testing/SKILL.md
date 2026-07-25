# WhatsApp Twilio Connection Verification Skill

## Metadata
- **Name:** whatsapp-twilio-verifier
- **Description:** Verifies Twilio WhatsApp connect/verify routes, webhook ingest, and tenant resolution.
- **Author:** PraxisOne AI Agent
- **Version:** 2.0.0

## Context
PraxisOne connects tenant WhatsApp numbers via Twilio Verify OTP (not Meta Embedded Signup).

Critical routes:
- `POST /api/settings/whatsapp/connect` — accepts `{ phoneNumber }`, sends OTP via Twilio Verify
- `POST /api/settings/whatsapp/verify` — accepts `{ code }`, completes setup on success
- `GET /api/settings/whatsapp/status` — connection status for the current tenant
- `POST /api/webhooks/twilio` — inbound WhatsApp messages from Twilio

## Prerequisites
Environment variables in `.env.local`:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_NUMBER`
- `TWILIO_VERIFY_SERVICE_SID`
- `TWILIO_WEBHOOK_URL` (public URL used for signature validation)
- `DATABASE_URL`
- `NEXTAUTH_SECRET` / `NEXTAUTH_URL`

## Verification Steps

### Step 1: Status check
```bash
curl -X GET "http://localhost:3000/api/settings/whatsapp/status" \
  -H "Cookie: next-auth.session-token=<session-token>"
```
Expected: `{"connected":false,...}` (or true if already linked).

### Step 2: Connect (send OTP)
```bash
curl -X POST "http://localhost:3000/api/settings/whatsapp/connect" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session-token>" \
  -d '{"phoneNumber":"+27821234567"}'
```
Expected: success with OTP pending status. Invalid Twilio config should return a clear 500, not a crash.

### Step 3: Verify OTP
```bash
curl -X POST "http://localhost:3000/api/settings/whatsapp/verify" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session-token>" \
  -d '{"code":"123456"}'
```
Expected: `connected: true` on approved code; 400 on invalid/expired code.

### Step 4: Twilio webhook ingest
```bash
curl -X POST "http://localhost:3000/api/webhooks/twilio" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp%3A%2B27821234567&To=whatsapp%3A%2B14155238886&Body=hello&MessageSid=SMtest123&NumMedia=0"
```
Notes:
- Without a valid `X-Twilio-Signature` (when `TWILIO_AUTH_TOKEN` is set), expect 403.
- For local smoke tests without signature checks, temporarily unset `TWILIO_AUTH_TOKEN` or set a matching `TWILIO_WEBHOOK_URL` + signature.
- Unknown receiver numbers must **not** fall back to an arbitrary tenant.

### Step 5: Deprecated Meta endpoint
```bash
curl -X GET "http://localhost:3000/api/whatsapp/webhook"
curl -X POST "http://localhost:3000/api/whatsapp/webhook"
```
Expected: HTTP 410 Gone for both.

## Final Review
Confirm tenant row has `whatsappSetupComplete=true`, `whatsappProvider=twilio`, and `whatsappPhoneNumber` set after a successful verify.
