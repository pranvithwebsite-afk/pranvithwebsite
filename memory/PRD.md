# PranvithDOP — Product Requirements

## Original Problem Statement
Build a pixel-perfect, CMS-driven digital-asset sales funnel for **PranvithDOP** (rebranded from BBEdits / PranavithDOP). The platform sells LUTs, templates, sound packs, fonts and other editor resources via dedicated landing pages, Razorpay payment links (`rzp.io`), and per-asset thank-you pages, with a customer authentication system and a personal dashboard for downloads & order history.

## Personas
- **Customer / Creator**: Signs up, browses assets, buys via rzp.io, downloads from dashboard.
- **Admin (founder)**: Manages products/pages/orders/customers through the existing admin CMS.

## Architecture
- **Frontend**: React 19, Tailwind, shadcn/ui, lucide-react.
- **Backend**: FastAPI, Motor (MongoDB), passlib (bcrypt), python-jose JWT.
- **Storage**: MongoDB (`test_database` locally).
- **Payments**: Razorpay Payment Links (`rzp.io`) + webhook fulfillment.
- **Auth**: Separate JWT for customers (`pranvithdop_customer_token` in localStorage); admins continue using their own JWT under `/api/admin/login`.

## Implemented (Feb 2026)
- ✅ Full rebrand BBEdits/PranavithDOP → **PranvithDOP** across header, footer, settings, FAQs, pages, products, admin labels, browser title and meta. One-shot startup migration scrubs legacy strings on boot.
- ✅ Customer JWT authentication: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`, `/api/auth/change-password`.
- ✅ Customer dashboard at `/dashboard`: My Downloads, My Orders, Account settings (change password). Empty states + stat cards.
- ✅ CMS-driven 8-asset catalog (5 paid + 3 free) seeded with payment links, landing content, thank-you content, hero images, SEO meta.
- ✅ Dynamic `/assets/:slug` landing pages: hero, what-you-get, before/after, benefits, compatibility, market comparison, FAQ, final CTA — all CMS-driven.
- ✅ Dynamic `/thank-you/:slug` pages: CMS-driven title/message/instructions + download button + "Go to My Downloads" link.
- ✅ `/api/auth/checkout/init`: creates pending order, returns rzp.io link with `prefill[email]` and `notes[order_id]` / `notes[user_id]` so the webhook can map purchases back to the user.
- ✅ `/api/auth/claim-free`: zero-price assets are added to the user's downloads instantly.
- ✅ `/api/webhooks/razorpay`: validates HMAC signature (when `RAZORPAY_WEBHOOK_SECRET` is set), idempotently marks orders paid and credits products to user.
- ✅ Header has Sign In / Sign Up CTAs (or Dashboard / Sign Out when authenticated).

## Deployment Setup the User Needs To Do
- Configure the Razorpay webhook URL (`<PUBLIC>/api/webhooks/razorpay`) in the Razorpay dashboard and set `RAZORPAY_WEBHOOK_SECRET` in `backend/.env` to that webhook's secret.

## Backlog
- 🟡 P1: Add the per-page CMS for `about`, `works`, `hire`, `contact` slugs (currently bound to static React).
- 🟡 P1: Customer profile (avatar + name editing).
- 🟢 P2: Forgot Password / transactional emails (Resend or SendGrid).
- 🟢 P2: Coupon support on rzp.io links / native checkout.
- 🟢 P2: Email receipts after successful purchase.
- 🟢 P2: Gate brand migration on a one-shot flag (avoid scanning faqs/pages on every boot).

## Endpoints Reference
- Public: `GET /api/products`, `GET /api/products/{slug}`, `GET /api/pages/{slug}`, `GET /api/faqs`, `GET /api/settings`.
- Customer: `/api/auth/register|login|me|logout|change-password`, `/api/auth/my-orders`, `/api/auth/my-downloads`, `/api/auth/checkout/init`, `/api/auth/claim-free`.
- Admin: `/api/admin/login` then `/api/admin/*` (existing).
- Webhook: `POST /api/webhooks/razorpay`.

## Tests
- `/app/backend/tests/test_customer_funnel.py` — full customer + admin regression.
- `/app/backend/tests/test_brand_typo.py` — brand-string sentinel.
- `/app/test_reports/iteration_1.json` … `iteration_3.json` — passing reports.
