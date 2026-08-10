# Vercel Deployment

This repository is configured for a single Vercel project:

- React frontend builds from `frontend/`.
- FastAPI backend runs as a Python serverless function from `api/index.py`.
- Browser calls to `/api/*` are routed to FastAPI.
- Static React output is served from `frontend/build`.

## Required Environment Variables

Set these in Vercel Project Settings > Environment Variables:

```text
MONGO_URL=your_mongodb_connection_string
DB_NAME=pranvithdop
JWT_SECRET=make_any_long_random_secret
DEFAULT_ADMIN_EMAIL=your_email@gmail.com
DEFAULT_ADMIN_PASSWORD=your_admin_password
DEFAULT_ADMIN_NAME=Pranvith
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_from_razorpay
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
PUBLIC_SITE_URL=https://pranvithdop.com
FRONTEND_URL=https://pranvithdop.com
CLOUDFLARE_R2_PUBLIC_BASE_URL=https://assets.pranvithdop.com
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
FROM_EMAIL="PranvithDOP <no-reply@pranvithdop.com>"
CORS_ORIGINS=https://pranvithdop.com
JWT_EXPIRATION_MINUTES=180
```

`MONGO_URL` is the canonical database variable. `DATABASE_URL` and the existing production `MONGODB_URI` are accepted only as backward-compatible aliases; set `DB_NAME` explicitly even when the URI includes a database path. `VITE_BACKEND_URL` is optional for public pages, but for this architecture leave it unset on Vercel so the deployed frontend stays same-origin and the admin always calls `/api` on the same Vercel domain. The existing `REACT_APP_BACKEND_URL` and `REACT_APP_RAZORPAY_KEY_ID` names remain supported as local compatibility aliases.

`RAZORPAY_KEY_SECRET` must only be set for the backend environment. The frontend receives only `VITE_RAZORPAY_KEY_ID`. `PUBLIC_SITE_URL` is preferred for absolute protected download links in confirmation emails and other backend-generated absolute URLs; `FRONTEND_URL` is the compatibility fallback. `CLOUDFLARE_R2_PUBLIC_BASE_URL` must point only to the asset host `https://assets.pranvithdop.com` and must not be reused for API or admin traffic.

SMTP is optional. If `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `FROM_EMAIL` are all configured, a successful payment sends the protected download link to the checkout email address. If they are omitted, checkout and download access continue to work and the backend logs that email delivery was skipped.

## Guest Checkout Flow

1. The asset Buy Now button opens the checkout modal and collects name, email, and phone.
2. `POST /api/checkout/create-order` calculates the amount from MongoDB and creates the Razorpay order.
3. Razorpay Checkout uses the submitted customer details as prefill values.
4. `POST /api/checkout/verify-payment` receives `buyer_email` and `asset_slug`, validates the Razorpay HMAC signature, confirms the order matches the buyer and asset, marks the MongoDB order paid, and sends the protected download link by backend SMTP.
5. The payment success page calls `GET /api/orders/{order_id}/access?token=...` before displaying the Download Now button and email delivery status.
6. `GET /api/orders/{order_id}/download?token=...` verifies paid status and the protected token before redirecting to the private asset URL.

## Deploy From GitHub

1. Import this repository in Vercel.
2. Keep the project root as the repository root, not `frontend/`.
3. Add the environment variables above for Production, Preview, and Development as needed.
4. Deploy. Vercel reads `vercel.json`, builds `frontend/package.json`, and routes `/api/*` to `api/index.py`.

## Domain DNS

Vercel project aliases:

```text
pranvithdop.com
```

Hostinger DNS must be:

```text
Type  Name  Value
A     @     76.76.21.21
```

Recommended architecture:

```text
pranvithdop.com -> Vercel frontend + /api backend
assets.pranvithdop.com -> Cloudflare R2 public asset domain only
```

Do not route `admin`, `api`, `checkout`, `payments`, or Razorpay webhooks through Cloudflare. Only static asset URLs should use `assets.pranvithdop.com`.

## Local Production Check

From `frontend/`:

```bash
npm install
npm run build
```

For local backend development, run the existing FastAPI app from `backend/` with the same backend environment variables.
