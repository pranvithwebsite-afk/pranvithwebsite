# PranvithDOP

React storefront and admin frontend with a FastAPI, MongoDB, and Razorpay backend.

Customer purchases use guest checkout: name, email, and phone are collected in the checkout modal, payment is verified by the backend, and a token-protected download is shown only for paid orders. Customer accounts are not required. Admin authentication remains available at `/admin/login`.

Download emails are sent only by the FastAPI backend after checkout fulfillment. Configure SMTP with `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `FROM_EMAIL`; do not add SMTP secrets to frontend environment variables.

See [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) and the `.env.example` files in `backend/` and `frontend/` for configuration.
