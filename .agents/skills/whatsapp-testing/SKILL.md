# WhatsApp Embedded Signup Verification Skill

## Metadata
- **Name:** whatsapp-signup-verifier
- **Description:** Automates the testing and verification of the Next.js WhatsApp Embedded Signup routes, ensuring correct Meta OAuth flow, payload parsing, and state updates.
- **Author:** PraxisOne AI Agent
- **Version:** 1.0.0

## Context
This project uses the Meta Embedded Signup flow to connect a tenant's WhatsApp Business Account. The critical routes are:
- `POST /api/settings/whatsapp/connect`: Receives the OAuth code from `FB.login()`, exchanges it for an access token, and retrieves the WABA ID and Phone Number ID.
- `GET /api/settings/whatsapp/status`: Returns the current connection status of the tenant.
- `POST /api/whatsapp/webhook`: Listens for incoming WhatsApp messages and status updates from Meta.

## Prerequisites
Before executing verification, ensure the following environment variables are set in `.env` or `.env.local`:
- `WHATSAPP_APP_ID`
- `WHATSAPP_APP_SECRET`
- `NEXT_PUBLIC_APP_URL`
- A valid PostgreSQL database connection (Neon).

## Verification Steps (Agent Instructions)

### Step 1: Health Check and Status Verification
Check if the system correctly reports the current (unconnected) status.
```bash
# Start the local development server in the background if not running
npm run dev &
sleep 5

# Fetch the status (Requires an active session cookie or mock header if authentication is enforced)
curl -X GET "http://localhost:3000/api/settings/whatsapp/status" -H "Cookie: next-auth.session-token=<mock-token>"
```
**Expected Outcome:** A 200 OK response with `{"status": "disconnected"}` or `{"connected": false}`.

### Step 2: Simulate OAuth Payload (Integration Test)
Since the `FB.login()` popup cannot be automated seamlessly in a headless terminal, we will simulate the frontend payload being sent to the connect route.
```typescript
// script: test-whatsapp-connect.ts
import fetch from 'node-fetch';

async function testConnection() {
  const payload = {
    code: "mock_oauth_code_from_meta",
    phone_number_id: "1234567890",
    waba_id: "0987654321"
  };

  const response = await fetch("http://localhost:3000/api/settings/whatsapp/connect", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": "next-auth.session-token=<mock-token>"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  console.log("Connect Response:", data);
}

testConnection();
```
*Agent Action:* Run `npx tsx test-whatsapp-connect.ts` and monitor the output.
**Expected Outcome:** The API should attempt to reach Meta. If it fails due to a mock code, ensure it gracefully returns a 400 or 500 error outlining "Meta Graph API Error" rather than a catastrophic server crash.

### Step 3: Webhook Verification Validation
Verify that the Next.js API route successfully processes Meta's `hub.challenge` verification requests.
```bash
# Meta sends a GET request to verify the webhook
curl -X GET "http://localhost:3000/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=your_verify_token&hub.challenge=11223344"
```
**Expected Outcome:** The server MUST return exactly `11223344` as plain text (HTTP 200) for Meta to validate the webhook.

## Troubleshooting & Remediation
- **If `/connect` returns a CORS error:** Ensure the route handlers are properly wrapped or that the Next.js config allows headers from the frontend domain.
- **If Prisma throws a schema error:** Ensure the `Tenant` or `Client` model has the appropriate fields (`whatsappAccountId`, `whatsappToken`) applied in the database schema.

## Final Review
After running the suite, the agent should query Prisma (`npx tsx -e "..."`) to ensure that database state gracefully reverted or logged the failed connection attempt properly, preventing dirty state.
