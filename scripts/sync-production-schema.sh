#!/usr/bin/env bash
# Apply Prisma schema to production (creates Quote, Invoice, Retainer, Mandate, InboundEmail, etc.)
# Usage: DATABASE_URL="postgresql://..." ./scripts/sync-production-schema.sh

set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: Set DATABASE_URL to your production Postgres connection string."
  echo "Example: DATABASE_URL=\"postgresql://...\" ./scripts/sync-production-schema.sh"
  exit 1
fi

echo "Syncing Prisma schema to database..."
npx prisma db push

echo "Done. New tables (if missing): Quote, Invoice, Retainer, Mandate, InboundEmail, InboundEmailReply and related."
