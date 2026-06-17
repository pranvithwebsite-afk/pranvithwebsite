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
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
PUBLIC_SITE_URL=https://pranvithdop.com
FRONTEND_URL=https://pranvithdop.com
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
FROM_EMAIL="PranvithDOP <no-reply@pranvithdop.com>"
CORS_ORIGINS=https://pranvithdop.com,https://www.pranvithdop.com
JWT_EXPIRATION_MINUTES=180
```

`VITE_BACKEND_URL` is optional. Leave it unset on Vercel so the frontend uses the same deployment origin and calls `/api`. Set it only if the frontend must call a separate backend host. The existing `REACT_APP_BACKEND_URL` and `REACT_APP_RAZORPAY_KEY_ID` names remain supported as local compatibility aliases.

`RAZORPAY_KEY_SECRET` must only be set for the backend environment. The frontend receives only `VITE_RAZORPAY_KEY_ID`. `PUBLIC_SITE_URL` is preferred for absolute protected download links in confirmation emails; `FRONTEND_URL` is kept as the compatibility fallback.

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
www.pranvithdop.com
```

Hostinger DNS must be:

```text
Type  Name  Value
A     @     76.76.21.21
CNAME www   b29cf27618525d1a.vercel-dns-017.com
```

Current root-domain issue: `pranvithdop.com` still resolves to `216.198.79.1`. Change the Hostinger `@` A record to `76.76.21.21`, then wait for DNS propagation. The `www` CNAME is already pointed at Vercel.

## Local Production Check

From `frontend/`:

```bash
npm install
npm run build
```

For local backend development, run the existing FastAPI app from `backend/` with the same backend environment variables.
