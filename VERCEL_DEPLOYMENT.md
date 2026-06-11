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
CORS_ORIGINS=*
JWT_EXPIRATION_MINUTES=180
```

`REACT_APP_BACKEND_URL` is optional. Leave it unset on Vercel so the frontend uses the same deployment origin and calls `/api`. Set it only if the frontend must call a separate backend host.

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
