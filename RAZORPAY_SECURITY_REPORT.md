# Razorpay Security Audit

Audit date: June 13, 2026

## Executive Summary

The checkout flow now keeps the Razorpay Key Secret and webhook secret on the
backend, validates successful payments against Razorpay before fulfillment,
and verifies webhooks using the raw request body.

A real Razorpay Key Secret was committed in `backend_test.py` and remains in
Git history in commit `a6f4cd8` from June 8, 2026. Treat that key pair as
compromised and rotate it immediately.

## Issues Found

### Critical: Razorpay Key Secret committed to Git

- A real Key Secret was hardcoded in `backend_test.py`.
- The value remains recoverable from Git history after removal from HEAD.
- No committed `.env` file was found.
- No live or test Razorpay Key ID matching the standard `rzp_*` pattern was
  found in the scanned Git history.

### High: Public settings response was not allowlisted

- `GET /api/settings` returned the complete MongoDB settings document.
- The settings model allowed Razorpay and SMTP secret fields.
- Admin settings responses echoed submitted values.

### High: Signature verification did not validate payment state

- Checkout verified the HMAC signature but did not fetch the payment from
  Razorpay.
- Fulfillment could proceed without independently checking captured status,
  order ownership, amount, and currency.

### High: Razorpay webhook verification was missing

- No active FastAPI endpoint verified `X-Razorpay-Signature` with
  `RAZORPAY_WEBHOOK_SECRET`.
- Duplicate webhook delivery was not protected by an event ID index and an
  atomic unpaid-to-paid order transition.

### Medium: Sensitive payment data was persisted or returned

- Checkout stored the Razorpay signature.
- The order creation API returned the Key ID even though React already has the
  public Key ID through its build environment.
- Protected download URLs containing plaintext tokens were stored on orders.

### Medium: Raw third-party errors could reach users or logs

- Razorpay `BadRequestError` text was returned directly by the API.
- Frontend payment screens displayed raw backend or Razorpay error details.
- Admin login wrote backend error details and the submitted email to the
  browser console.
- Several backend paths logged exception tracebacks.

### Medium: Concrete admin password in environment example

- `backend/.env.example` contained a usable-looking default admin password.
- It was present only in the uncommitted working tree, not the scanned Git
  history.
- It was replaced with a strong-password placeholder.

### Medium: Insecure JWT fallback secret

- The backend used a fixed fallback value when `JWT_SECRET` was absent.
- The fallback was removed; admin authentication now fails closed unless a
  secret of at least 32 characters is configured.

## Changes Made

- Added backend-only `RAZORPAY_WEBHOOK_SECRET` configuration.
- Added `POST /api/webhooks/razorpay`.
- Webhook verification uses HMAC-SHA256 over the raw request body.
- Webhooks require and deduplicate `X-Razorpay-Event-Id`.
- Added a unique MongoDB index for webhook event IDs.
- Added an atomic pending-to-paid order transition to prevent double credit.
- Checkout verification now fetches the payment from Razorpay and validates:
  order ID, amount, currency, `captured=true`, and `status=captured`.
- Removed `key_id` from order creation responses.
- Removed storage of Razorpay signatures and plaintext protected URLs.
- Added startup cleanup for legacy stored signatures, URLs, and settings
  secrets.
- Replaced settings responses with an explicit public-safe allowlist.
- Removed payment and SMTP secrets from the settings input model.
- Removed the legacy frontend Razorpay environment alias.
- React now reads only `VITE_RAZORPAY_KEY_ID`.
- Replaced raw payment errors with generic client-safe messages.
- Added backend log redaction for configured payment, database, SMTP, and JWT
  secrets.
- Removed the hardcoded Key Secret from `backend_test.py`.
- Replaced the concrete admin password in `backend/.env.example`.
- Removed the fixed JWT signing fallback and added fail-closed validation.
- Added focused Razorpay security tests.

## Required Environment Variables

Backend only:

```text
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
```

Frontend build only:

```text
VITE_RAZORPAY_KEY_ID
```

Never create a frontend variable containing the Key Secret or webhook secret.
Any frontend build variable should be considered public.

## Mandatory Key Rotation

1. Sign in to the Razorpay Dashboard.
2. Switch to the affected mode, Test or Live, that used the exposed secret.
3. Open Account & Settings, then API Keys.
4. Generate or regenerate the API key pair.
5. Copy the new Key ID and Key Secret once.
6. In Vercel Project Settings, replace backend `RAZORPAY_KEY_ID` and
   `RAZORPAY_KEY_SECRET`.
7. Set frontend `VITE_RAZORPAY_KEY_ID` to the new Key ID.
8. Redeploy Production and any Preview environment that accepts payments.
9. Complete a small test transaction and confirm the payment is captured.
10. Revoke or stop using the old key pair immediately.

Webhook secret rotation:

1. In Razorpay Dashboard, open the webhook configured for
   `/api/webhooks/razorpay`.
2. Edit the webhook and set a new random secret unrelated to the API Key
   Secret.
3. Replace backend `RAZORPAY_WEBHOOK_SECRET` in Vercel.
4. Redeploy before sending new webhook test events.
5. Be aware that retries signed with the old webhook secret will fail after
   rotation.

## Git History Remediation

Rotation is required whether or not history is rewritten. To remove the old
secret from repository history:

1. Coordinate with every collaborator and pause pushes.
2. Make a backup clone.
3. Use `git filter-repo` with a replacement file that replaces the exposed
   secret with `[REDACTED]`.
4. Force-push all rewritten branches and tags.
5. Delete stale forks, cached archives, CI artifacts, and old local clones
   where possible.
6. Ask collaborators to fresh-clone instead of merging old history.

Do not delay key rotation while planning the history rewrite.

## Remaining Risks

- Git history and any existing clones still contain the old Key Secret until
  history is rewritten; rotation is the effective containment.
- Vercel uses one project for frontend and backend. Build-time secrets are not
  injected into JavaScript unless referenced, but separate Vercel projects
  provide stronger environment isolation.
- Webhook delivery must be configured in Razorpay Dashboard for
  `payment.captured` and `order.paid`.
- The seven HTTP smoke tests require a server on `localhost:8001`; they were not
  exercised in-process during this audit.

## Verification

- Backend in-process tests: 20 passed.
- Frontend production build: passed.
- Python compilation: passed.
- Working-tree secret scan: no real Razorpay secret remains.
- `git diff --check`: passed.
