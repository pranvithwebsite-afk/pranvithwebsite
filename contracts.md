# BBEdits Backend Contracts

## Goal
Replace mocked frontend data with real backend endpoints (MongoDB) and persist user submissions.

## Currently mocked in `/app/frontend/src/data/mock.js`
- `courses` -> will be fetched from `GET /api/courses`
- `testimonials` -> will be fetched from `GET /api/testimonials`
- `faqs` -> will be fetched from `GET /api/faqs`
- Static (kept frontend): `navLinks`, `audienceCards`, `whatYoullLearn`, `studentVideos`, `ourWorks`, `footerLinks`

## API Endpoints (all under `/api`)

### 1) Catalog (seeded once on startup)
- `GET /api/courses` -> [{ id, title, description, lectures, discount, price, original, image, tag, color }]
- `GET /api/testimonials` -> [{ id, name, role, text, rating }]
- `GET /api/faqs` -> [{ id, q, a, order }]

### 2) Hire form
- `POST /api/hire`
  - body: `{ name: str, email: str, requirement: str }`
  - 200 -> `{ id, success: true, message }`
  - 422 -> validation error

### 3) Newsletter subscribe
- `POST /api/subscribe`
  - body: `{ email: str }`
  - 200 -> `{ id, success: true, message }`
  - 400 -> already subscribed (still 200 with friendly msg ok)

## Mongo collections
- `courses` (seeded)
- `testimonials` (seeded)
- `faqs` (seeded)
- `hire_requests` (created via POST)
- `subscribers` (created via POST, unique on email)

## Frontend integration
- Add small `src/lib/api.js` axios client using `REACT_APP_BACKEND_URL`.
- Update `Courses.jsx`, `Testimonials.jsx`, `FAQ.jsx` to fetch from API with a fallback to mock data on error so the page never breaks.
- `Footer.jsx` Subscribe -> `POST /api/subscribe`
- `Hire.jsx` -> `POST /api/hire`
- Replace toast success/error based on API response.

## Error handling
- Backend: pydantic validation; try/except on Mongo with proper HTTPException.
- Frontend: try/catch, toast.error on failure, fallback to mock arrays for listing endpoints.
