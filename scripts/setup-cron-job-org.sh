#!/usr/bin/env bash
# Create or update the PraxisOne skill-events job on cron-job.org.
#
# Prerequisites:
#   1. API key from https://console.cron-job.org/settings
#   2. export CRONJOB_ORG_API_KEY='...'
#   3. CRON_SECRET in .env.local (or exported) — same value as Vercel
#
# Usage:
#   chmod +x scripts/setup-cron-job-org.sh
#   export CRONJOB_ORG_API_KEY='...'
#   ./scripts/setup-cron-job-org.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env.local ]]; then
  CRON_SECRET_LINE="$(grep -E '^CRON_SECRET=' .env.local | tail -1 || true)"
  APP_URL_LINE="$(grep -E '^NEXT_PUBLIC_APP_URL=' .env.local | tail -1 || true)"
  if [[ -n "${CRON_SECRET_LINE}" ]]; then
    # shellcheck disable=SC2086
    eval "${CRON_SECRET_LINE}"
  fi
  if [[ -n "${APP_URL_LINE}" ]]; then
    # shellcheck disable=SC2086
    eval "${APP_URL_LINE}"
  fi
fi

if [[ -z "${CRONJOB_ORG_API_KEY:-}" ]]; then
  echo "Error: export CRONJOB_ORG_API_KEY first (cron-job.org → Settings → API)." >&2
  exit 1
fi
if [[ -z "${CRON_SECRET:-}" ]]; then
  echo "Error: CRON_SECRET missing (set in .env.local or export it)." >&2
  exit 1
fi

# Strip surrounding quotes if present
CRON_SECRET="${CRON_SECRET%\"}"
CRON_SECRET="${CRON_SECRET#\"}"
CRON_SECRET="${CRON_SECRET%\'}"
CRON_SECRET="${CRON_SECRET#\'}"

APP_URL="${NEXT_PUBLIC_APP_URL:-https://praxis.mlkcomputer.com}"
APP_URL="${APP_URL%\"}"
APP_URL="${APP_URL#\"}"
APP_URL="${APP_URL%/}"

JOB_URL="${APP_URL}/api/cron/skill-events"
TITLE="PraxisOne skill-events (every 5 min)"

export CRONJOB_ORG_API_KEY CRON_SECRET JOB_URL TITLE

python3 <<'PY'
import json, os, urllib.request

api_key = os.environ["CRONJOB_ORG_API_KEY"]
cron_secret = os.environ["CRON_SECRET"]
job_url = os.environ["JOB_URL"]
title = os.environ["TITLE"]

def api(method, path, body=None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(
        f"https://api.cron-job.org{path}",
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

job = {
    "enabled": True,
    "title": title,
    "url": job_url,
    "requestMethod": 0,  # GET
    "saveResponses": True,
    "requestTimeout": 60,
    "redirectSuccess": True,
    "schedule": {
        "timezone": "Africa/Johannesburg",
        "expiresAt": 0,
        "hours": [-1],
        "mdays": [-1],
        "minutes": [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55],
        "months": [-1],
        "wdays": [-1],
    },
    "extendedData": {
        "headers": {
            "Authorization": f"Bearer {cron_secret}",
        }
    },
    "notification": {
        "onFailure": True,
        "onFailureCount": 3,
        "onSuccess": False,
        "onDisable": True,
    },
}

listing = api("GET", "/jobs")
jobs = listing.get("jobs") or listing.get("jobList") or []
if isinstance(jobs, dict):
    jobs = list(jobs.values())

existing_id = None
for j in jobs:
    if j.get("title") == title:
        existing_id = j.get("jobId")
        break

if existing_id:
    print(f"Updating existing job #{existing_id} → {job_url}")
    result = api("PATCH", f"/jobs/{existing_id}", {"job": job})
else:
    print(f"Creating job → {job_url}")
    result = api("PUT", "/jobs", {"job": job})

print(json.dumps(result, indent=2))
print("\nVerify at https://console.cron-job.org/")
PY
