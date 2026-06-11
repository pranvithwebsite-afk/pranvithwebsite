# Vercel Deployment

This repository is configured for a single Vercel project:

- React frontend builds from `frontend/`.
- FastAPI backend runs as a Python serverless function from `api/index.py`.
- Browser calls to `/api/*` are routed to FastAPI.
- Static React output is served from `frontend/build`.

## Required Environment Variables

Set these in Vercel Project Settings > Environment Variables:

```text
MONGO_URL=...
DB_NAME=...
JWT_SECRET=...
DEFAULT_ADMIN_EMAIL=...
DEFAULT_ADMIN_PASSWORD=...
DEFAULT_ADMIN_NAME=...
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
CORS_ORIGINS=*
JWT_EXPIRATION_MINUTES=180
```

`REACT_APP_BACKEND_URL` is optional. Leave it unset on Vercel so the frontend uses the same deployment origin and calls `/api`. Set it only if the frontend must call a separate backend host.

## Deploy From GitHub

1. Import this repository in Vercel.
2. Keep the project root as the repository root, not `frontend/`.
3. Add the environment variables above for Production, Preview, and Development as needed.
4. Deploy. Vercel reads `vercel.json`, builds `frontend/package.json`, and routes `/api/*` to `api/index.py`.

## Local Production Check

From `frontend/`:

```bash
npm install
npm run build
```

For local backend development, run the existing FastAPI app from `backend/` with the same backend environment variables.
